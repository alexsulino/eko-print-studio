import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import type Konva from 'konva'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { SelectionEngine } from '@/core/selection/SelectionEngine'
import { resolveCanvasSelection, describeTransformCommand } from '@/editor/canvas'
import { viewportManager } from '@/core/viewport/ViewportManager'
import { LayoutResolver, RendererAdapter } from '@/core/layout'
import { markRenderStart, recordRendererMetrics } from '@/diagnostics/editorDiagnostics'
import {
  getRuntimeBenchmarkSnapshot,
  recordCanvasEditorRender,
  recordNodeMapVersion,
  recordRegistryStats,
} from '@/diagnostics/runtimeBenchmark'
import {
  beginDragProfile,
  endDragProfile,
  installDragProfilerBridge,
  markDragEnding,
  recordDragMove,
  recordMidDragPositionSample,
  recordReactRender,
  recordUseEffect,
} from '@/diagnostics/dragProfiler'
import { useEditorStore } from '@/store/editorStore'
import { useKeyboardEngine } from '@/hooks/useKeyboardEngine'
import { ObjectLayer } from './ObjectLayer'
import { SelectionTransformer } from './SelectionTransformer'
import { GuidesLayer } from './GuidesLayer'
import { RegionsLayer } from './RegionsLayer'
import { applyNodeRefToMap } from './hooks/konvaNodeRefRegistry'
import { useKonvaNodeRefRegistry } from './hooks/useKonvaNodeRefRegistry'
import { AssetResolverProvider } from './assets/AssetResolverProvider'
import { TextEditOverlay } from '@/editor/canvas/TextEditOverlay'
import { isInteractionSession } from '@/types/interaction'

function stageSize(width: number, height: number) {
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  }
}

const devRenderTrace = import.meta.env.DEV

export function CanvasEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeMapRef = useRef(new Map<string, Konva.Node>())
  const [nodeMapVersion, setNodeMapVersion] = useState(0)
  const [keepRatio, setKeepRatio] = useState(false)
  const panLastRef = useRef<{ x: number; y: number } | null>(null)
  const fittedOnceRef = useRef(false)

  const document = useEditorStore((s) => s.document)
  const activePageId = useEditorStore((s) => s.activePageId)
  const activeSurfaceId = useEditorStore((s) => s.activeSurfaceId)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const viewport = useEditorStore((s) => s.viewport)
  const interaction = useEditorStore((s) => s.interaction)
  const selectElements = useEditorStore((s) => s.selectElements)
  const moveElement = useEditorStore((s) => s.moveElement)
  const transformElement = useEditorStore((s) => s.transformElement)
  const setViewport = useEditorStore((s) => s.setViewport)
  const fitViewport = useEditorStore((s) => s.fitViewport)
  const zoomAt = useEditorStore((s) => s.zoomAt)
  const panBy = useEditorStore((s) => s.panBy)
  const setInteraction = useEditorStore((s) => s.setInteraction)
  const setGuides = useEditorStore((s) => s.setGuides)
  const clearGuides = useEditorStore((s) => s.clearGuides)
  const snapMove = useEditorStore((s) => s.snapMove)
  const beginInteractionSession = useEditorStore((s) => s.beginInteractionSession)
  const endInteractionSession = useEditorStore((s) => s.endInteractionSession)
  const updateProperty = useEditorStore((s) => s.updateProperty)
  const session = interaction.session
  const textEditActive = isInteractionSession(session, 'textEdit')
  const editingElementId = textEditActive ? session.elementId : null

  useKeyboardEngine(Boolean(document))

  useEffect(() => {
    installDragProfilerBridge()
  }, [])

  const handleNodeRef = useCallback((id: string, node: Konva.Node | null) => {
    if (applyNodeRefToMap(nodeMapRef.current, id, node)) {
      setNodeMapVersion((v) => {
        const next = v + 1
        recordNodeMapVersion(next, true)
        return next
      })
    }
  }, [])

  const nodeRefRegistry = useKonvaNodeRefRegistry(handleNodeRef)

  if (devRenderTrace) {
    recordCanvasEditorRender()
    recordReactRender('CanvasEditor')
    const count = getRuntimeBenchmarkSnapshot().canvasEditorRenderCount
    if (count === 20 || count % 50 === 0) {
      // eslint-disable-next-line no-console
      console.warn('[Eko DEV] CanvasEditor render count', count)
    }
  }

  useEffect(() => {
    recordUseEffect('CanvasEditor.documentId')
    if (document) markRenderStart()
  }, [document?.id])

  useEffect(() => {
    recordUseEffect('CanvasEditor.pruneNodeMap')
    if (!document) return
    const liveIds = new Set(document.elements.map((el) => el.id))
    const map = nodeMapRef.current
    let pruned = false
    for (const id of map.keys()) {
      if (!liveIds.has(id)) {
        map.delete(id)
        pruned = true
      }
    }
    nodeRefRegistry.prune(liveIds)
    if (pruned) {
      setNodeMapVersion((v) => {
        const next = v + 1
        recordNodeMapVersion(next, true)
        return next
      })
    }
  }, [document?.elements, nodeRefRegistry])

  useEffect(() => {
    recordUseEffect('CanvasEditor.registryStats.everyRender')
    recordRegistryStats(nodeRefRegistry.getStats())
  })

  useEffect(() => {
    recordUseEffect('CanvasEditor.clearNodeMap.onDocId')
    nodeMapRef.current.clear()
    nodeRefRegistry.clear()
    setNodeMapVersion((v) => {
      const next = v + 1
      recordNodeMapVersion(next, true)
      return next
    })
  }, [document?.id, nodeRefRegistry])

  const frame = useMemo(() => {
    if (!document) return null
    const layout = LayoutResolver.resolve(document, {
      pageId: activePageId,
      surfaceId: activeSurfaceId,
    })
    return RendererAdapter.toFrame(layout)
  }, [document, activePageId, activeSurfaceId])

  const viewDocument = useMemo(() => {
    if (!document || !frame) return null
    return { ...document, elements: frame.elements }
  }, [document, frame])

  const pixelSize = frame
    ? { widthPx: frame.paper.widthPx, heightPx: frame.paper.heightPx }
    : { widthPx: 0, heightPx: 0 }

  useEffect(() => {
    recordUseEffect('CanvasEditor.rendererMetrics')
    if (!document || !frame) return
    recordRendererMetrics({
      elementCount: document.elements.length,
      resolvedElements: frame.elements.length,
      renderNodes: frame.elements.filter((el) => el.type !== 'group').length,
      stageWidth: viewport.stageWidth,
      stageHeight: viewport.stageHeight,
      zoom: viewport.zoom,
    })
  }, [document, frame, viewport.stageWidth, viewport.stageHeight, viewport.zoom])

  const applyContainerSize = useCallback(
    (width: number, height: number) => {
      if (width <= 0 || height <= 0) return

      const next = stageSize(width, height)
      const current = viewportManager.getState()
      const sizeChanged =
        current.stageWidth !== next.width || current.stageHeight !== next.height

      if (sizeChanged) {
        viewportManager.setStageSize(next.width, next.height)
        setViewport({
          ...viewportManager.getState(),
          stageWidth: next.width,
          stageHeight: next.height,
        })
      }

      if (useEditorStore.getState().document && (sizeChanged || !fittedOnceRef.current)) {
        fittedOnceRef.current = true
        fitViewport()
      }
    },
    [fitViewport, setViewport],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Measure after layout — ResizeObserver can fire with 0×0 before the grid settles.
    const measure = () => {
      applyContainerSize(el.clientWidth, el.clientHeight)
    }
    measure()
    const raf = requestAnimationFrame(measure)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      // Never persist a collapsed stage size into the viewport.
      if (width <= 0 || height <= 0) return
      applyContainerSize(width, height)
    })

    observer.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [applyContainerSize])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) setKeepRatio(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) setKeepRatio(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const handleObjectSelect = useCallback(
    (id: string, modifiers: { ctrlKey: boolean; shiftKey: boolean; metaKey: boolean }) => {
      const ids = useEditorStore.getState().selectedIds
      const next = resolveCanvasSelection(ids, id, modifiers)
      selectElements(next)
    },
    [selectElements],
  )

  const handleObjectDragMove = useCallback(
    (id: string, x: number, y: number) => {
      beginDragProfile({ id, x, y })
      recordDragMove({ id, x, y })
      setInteraction({ mode: 'dragging' })
      const snapped = snapMove(id, x, y)
      setGuides(snapped.guides)
      const doc = useEditorStore.getState().document
      const ids = useEditorStore.getState().selectedIds
      const originEl = doc?.elements.find((el) => el.id === id)
      if (originEl) {
        recordMidDragPositionSample({
          nodeX: snapped.x,
          nodeY: snapped.y,
          docX: originEl.transform.x,
          docY: originEl.transform.y,
        })
      }
      if (doc && ids.includes(id) && ids.length > 1) {
        const origin = doc.elements.find((el) => el.id === id)
        if (origin) {
          const dx = snapped.x - origin.transform.x
          const dy = snapped.y - origin.transform.y
          for (const otherId of ids) {
            if (otherId === id) continue
            const node = nodeMapRef.current.get(otherId)
            const el = doc.elements.find((item) => item.id === otherId)
            if (node && el) {
              node.position({
                x: el.transform.x + dx,
                y: el.transform.y + dy,
              })
            }
          }
        }
      }
      return { x: snapped.x, y: snapped.y }
    },
    [setInteraction, snapMove, setGuides],
  )

  const handleObjectDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      const snapped = snapMove(id, x, y)
      const doc = useEditorStore.getState().document
      const ids = useEditorStore.getState().selectedIds
      markDragEnding()
      if (doc && ids.includes(id) && ids.length > 1) {
        const origin = doc.elements.find((el) => el.id === id)
        if (origin) {
          const dx = snapped.x - origin.transform.x
          const dy = snapped.y - origin.transform.y
          const moves = ids
            .map((otherId) => {
              const el = doc.elements.find((item) => item.id === otherId)
              if (!el) return null
              if (otherId === id) return { elementId: id, x: snapped.x, y: snapped.y }
              return {
                elementId: otherId,
                x: el.transform.x + dx,
                y: el.transform.y + dy,
              }
            })
            .filter((m): m is { elementId: string; x: number; y: number } => Boolean(m))
          useEditorStore.getState().moveElements(moves)
          clearGuides()
          endDragProfile({ id, multi: true })
          return
        }
      }
      moveElement(id, snapped.x, snapped.y)
      clearGuides()
      endDragProfile({ id, multi: false })
    },
    [snapMove, moveElement, clearGuides],
  )

  const handleTextEditStart = useCallback(
    (id: string) => {
      beginInteractionSession({ kind: 'textEdit', elementId: id })
    },
    [beginInteractionSession],
  )

  const handleTextEditCommit = useCallback(
    (nextText: string) => {
      const id = useEditorStore.getState().interaction.session.elementId
      const doc = useEditorStore.getState().document
      const el = id && doc ? doc.elements.find((item) => item.id === id) : null
      endInteractionSession()
      if (!el || el.type !== 'text') return
      if (nextText === el.properties.text) return
      updateProperty(el.id, 'properties.text', nextText)
    },
    [endInteractionSession, updateProperty],
  )

  const handleTextEditCancel = useCallback(() => {
    endInteractionSession()
  }, [endInteractionSession])

  const handMode = interaction.tool === 'hand' || interaction.spacePressed

  const primary = selectedIds[selectedIds.length - 1] ?? null
  const selectedElement = document?.elements.find((el) => el.id === primary) ?? null
  const editingTextElement =
    editingElementId && document
      ? document.elements.find(
          (el): el is Extract<typeof el, { type: 'text' }> =>
            el.id === editingElementId && el.type === 'text',
        )
      : null
  const canResize = selectedElement
    ? templateRulesEngine.can(selectedElement, 'resize', document ?? undefined).allowed
    : false
  const canRotate = selectedElement
    ? templateRulesEngine.can(selectedElement, 'rotate', document ?? undefined).allowed
    : false

  if (!document || !frame || !viewDocument) {
    return <div className="canvas-empty">Preparando canvas…</div>
  }

  const stageWidth = Math.max(1, viewport.stageWidth)
  const stageHeight = Math.max(1, viewport.stageHeight)

  const toDoc = (screenX: number, screenY: number) =>
    viewportManager.screenToDocument(screenX, screenY)

  return (
    <AssetResolverProvider document={document}>
    <div
      className={`canvas-shell${handMode ? ' canvas-shell--hand' : ''}`}
      ref={containerRef}
      tabIndex={0}
    >
      <Stage
        width={stageWidth}
        height={stageHeight}
        draggable={false}
        onWheel={(e) => {
          e.evt.preventDefault()
          const stage = e.target.getStage()
          if (!stage) return
          const pointer = stage.getPointerPosition()
          if (!pointer) return

          if (e.evt.ctrlKey || e.evt.metaKey) {
            const direction = e.evt.deltaY > 0 ? -1 : 1
            zoomAt(viewport.zoom * (1 + direction * 0.08), pointer.x, pointer.y)
            return
          }

          panBy(-e.evt.deltaX, -e.evt.deltaY)
        }}
        onMouseDown={(e) => {
          const stage = e.target.getStage()
          if (!stage) return
          const pos = stage.getPointerPosition()
          if (!pos) return

          if (handMode || e.evt.button === 1) {
            panLastRef.current = { x: pos.x, y: pos.y }
            setInteraction({ mode: 'panning', tool: handMode ? 'hand' : interaction.tool })
            return
          }

          if (e.target === stage) {
            const docPoint = toDoc(pos.x, pos.y)
            setInteraction({
              mode: 'marquee',
              marquee: { x1: docPoint.x, y1: docPoint.y, x2: docPoint.x, y2: docPoint.y },
            })
          }
        }}
        onMouseMove={(e) => {
          const stage = e.target.getStage()
          if (!stage) return
          const pos = stage.getPointerPosition()
          if (!pos) return

          if (interaction.mode === 'panning' && panLastRef.current) {
            const dx = pos.x - panLastRef.current.x
            const dy = pos.y - panLastRef.current.y
            panLastRef.current = { x: pos.x, y: pos.y }
            panBy(dx, dy)
            return
          }

          if (interaction.mode === 'marquee' && interaction.marquee) {
            const docPoint = toDoc(pos.x, pos.y)
            setInteraction({
              marquee: {
                ...interaction.marquee,
                x2: docPoint.x,
                y2: docPoint.y,
              },
            })
          }
        }}
        onMouseUp={() => {
          if (interaction.mode === 'panning') {
            panLastRef.current = null
            setInteraction({
              mode: 'idle',
              tool: interaction.spacePressed ? 'hand' : 'select',
            })
            return
          }

          if (interaction.mode === 'marquee' && interaction.marquee) {
            const boxes = document.elements
              .filter((el) => templateRulesEngine.can(el, 'select', document).allowed)
              .map((el) => ({
                id: el.id,
                x: el.transform.x,
                y: el.transform.y,
                width: Math.abs(el.transform.width * el.transform.scaleX),
                height: Math.abs(el.transform.height * el.transform.scaleY),
              }))
            const ids = SelectionEngine.fromMarquee(boxes, interaction.marquee)
            selectElements(ids)
            setInteraction({ mode: 'idle', marquee: null })
          }
        }}
        onMouseLeave={() => {
          if (interaction.mode === 'panning') {
            panLastRef.current = null
            setInteraction({ mode: 'idle' })
          }
        }}
      >
        <Layer x={viewport.panX} y={viewport.panY} scaleX={viewport.zoom} scaleY={viewport.zoom}>
          <Rect
            x={0}
            y={0}
            width={pixelSize.widthPx}
            height={pixelSize.heightPx}
            fill={frame.paper.backgroundColor}
            shadowColor="rgba(0,0,0,0.25)"
            shadowBlur={24}
            shadowOpacity={0.35}
            listening={false}
          />
          <RegionsLayer regions={frame.regions} />
          <ObjectLayer
            document={viewDocument}
            listening={!handMode && !textEditActive}
            editingElementId={editingElementId}
            onSelect={handleObjectSelect}
            onDragMove={handleObjectDragMove}
            onDragEnd={handleObjectDragEnd}
            onEditStart={handleTextEditStart}
            getNodeRef={nodeRefRegistry.getNodeRef}
          />
          <GuidesLayer
            guides={interaction.guides}
            marquee={interaction.marquee}
            documentWidth={pixelSize.widthPx}
            documentHeight={pixelSize.heightPx}
          />
          {!textEditActive ? (
            <SelectionTransformer
              selectedIds={selectedIds}
              nodeMap={nodeMapRef.current}
              nodeMapVersion={nodeMapVersion}
              resizeEnabled={canResize && selectedIds.length === 1}
              rotateEnabled={canRotate && selectedIds.length === 1}
              keepRatio={keepRatio}
              onTransformEnd={(payload) => {
                const command = describeTransformCommand(payload)
                transformElement(command.elementId, command.transform)
                clearGuides()
              }}
            />
          ) : null}
        </Layer>
      </Stage>
      {editingTextElement ? (
        <TextEditOverlay
          key={editingTextElement.id}
          element={editingTextElement}
          viewport={viewport}
          onCommit={handleTextEditCommit}
          onCancel={handleTextEditCancel}
        />
      ) : null}
    </div>
    </AssetResolverProvider>
  )
}
