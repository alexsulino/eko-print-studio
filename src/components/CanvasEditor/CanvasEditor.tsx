import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import type Konva from 'konva'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { SelectionEngine } from '@/core/selection/SelectionEngine'
import { AlignmentGuides } from '@/core/alignment/AlignmentGuides'
import { resolveCanvasSelection, describeTransformCommands } from '@/editor/canvas'
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
import { GridLayer } from './GridLayer'
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

function stageCursor(mode: string, tool: string, spacePressed: boolean): string {
  if (tool === 'hand' || spacePressed || mode === 'panning') return 'grab'
  if (mode === 'dragging') return 'move'
  if (mode === 'rotating') return 'crosshair'
  if (mode === 'resizing') return 'nwse-resize'
  if (mode === 'marquee') return 'crosshair'
  if (tool === 'text') return 'text'
  return 'default'
}

export function CanvasEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeMapRef = useRef(new Map<string, Konva.Node>())
  const [nodeMapVersion, setNodeMapVersion] = useState(0)
  const panLastRef = useRef<{ x: number; y: number } | null>(null)
  const fittedOnceRef = useRef(false)
  const marqueeModifiersRef = useRef<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }>({
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  })

  const document = useEditorStore((s) => s.document)
  const activePageId = useEditorStore((s) => s.activePageId)
  const activeSurfaceId = useEditorStore((s) => s.activeSurfaceId)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const viewport = useEditorStore((s) => s.viewport)
  const workspace = useEditorStore((s) => s.workspace)
  const grid = useEditorStore((s) => s.grid)
  const interaction = useEditorStore((s) => s.interaction)
  const selectElements = useEditorStore((s) => s.selectElements)
  const moveElement = useEditorStore((s) => s.moveElement)
  const transformElements = useEditorStore((s) => s.transformElements)
  const setViewport = useEditorStore((s) => s.setViewport)
  const fitViewport = useEditorStore((s) => s.fitViewport)
  const zoomAt = useEditorStore((s) => s.zoomAt)
  const zoomAtToggle = useEditorStore((s) => s.zoomAtToggle)
  const panBy = useEditorStore((s) => s.panBy)
  const setInteraction = useEditorStore((s) => s.setInteraction)
  const setHoveredId = useEditorStore((s) => s.setHoveredId)
  const setGuides = useEditorStore((s) => s.setGuides)
  const clearGuides = useEditorStore((s) => s.clearGuides)
  const snapMove = useEditorStore((s) => s.snapMove)
  const beginInteractionSession = useEditorStore((s) => s.beginInteractionSession)
  const endInteractionSession = useEditorStore((s) => s.endInteractionSession)
  const updateProperty = useEditorStore((s) => s.updateProperty)
  const session = interaction.session
  const textEditActive = isInteractionSession(session, 'textEdit')
  const editingElementId = textEditActive ? session.elementId : null
  const keepRatio = interaction.keepRatio

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
        fitViewport(false)
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

  const handleObjectSelect = useCallback(
    (id: string, modifiers: { ctrlKey: boolean; shiftKey: boolean; metaKey: boolean }) => {
      const ids = useEditorStore.getState().selectedIds
      const next = resolveCanvasSelection(ids, id, modifiers)
      selectElements(next)
    },
    [selectElements],
  )

  const handleObjectHover = useCallback(
    (id: string | null) => {
      const mode = useEditorStore.getState().interaction.mode
      if (mode !== 'idle' && mode !== 'hover') return
      setHoveredId(id)
    },
    [setHoveredId],
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

  const selectedElements = document
    ? selectedIds
        .map((id) => document.elements.find((el) => el.id === id))
        .filter((el): el is NonNullable<typeof el> => Boolean(el))
    : []
  const editingTextElement =
    editingElementId && document
      ? document.elements.find(
          (el): el is Extract<typeof el, { type: 'text' }> =>
            el.id === editingElementId && el.type === 'text',
        )
      : null
  const canResize =
    selectedElements.length > 0 &&
    selectedElements.every((el) =>
      templateRulesEngine.can(el, 'resize', document ?? undefined).allowed,
    )
  const canRotate =
    selectedElements.length > 0 &&
    selectedElements.every((el) =>
      templateRulesEngine.can(el, 'rotate', document ?? undefined).allowed,
    )

  const hoveredRect = useMemo(() => {
    if (!document || !interaction.hoveredId) return null
    if (selectedIds.includes(interaction.hoveredId)) return null
    if (interaction.mode !== 'idle' && interaction.mode !== 'hover') return null
    const el = document.elements.find((item) => item.id === interaction.hoveredId)
    if (!el) return null
    return AlignmentGuides.fromTransform(el.transform)
  }, [document, interaction.hoveredId, interaction.mode, selectedIds])

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
      style={{ cursor: stageCursor(interaction.mode, interaction.tool, interaction.spacePressed) }}
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
        onDblClick={(e) => {
          if (handMode) return
          if (e.target !== e.target.getStage()) return
          const stage = e.target.getStage()
          if (!stage) return
          const pos = stage.getPointerPosition()
          if (!pos) return
          zoomAtToggle(pos.x, pos.y)
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
            marqueeModifiersRef.current = {
              ctrlKey: e.evt.ctrlKey,
              metaKey: e.evt.metaKey,
              shiftKey: e.evt.shiftKey,
            }
            const docPoint = toDoc(pos.x, pos.y)
            setHoveredId(null)
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
            const hitIds = SelectionEngine.fromMarquee(boxes, interaction.marquee)
            const next = SelectionEngine.applyMarquee(
              useEditorStore.getState().selectedIds,
              hitIds,
              marqueeModifiersRef.current,
            )
            selectElements(next)
            setInteraction({ mode: 'idle', marquee: null })
          }
        }}
        onMouseLeave={() => {
          setHoveredId(null)
          if (interaction.mode === 'panning') {
            panLastRef.current = null
            setInteraction({ mode: 'idle' })
          }
        }}
      >
        <Layer x={viewport.panX} y={viewport.panY} scaleX={viewport.zoom} scaleY={viewport.zoom}>
          {/* Infinite pasteboard — workspace world, independent of document elements */}
          <Rect
            x={workspace.bounds.x - workspace.activeOrigin.x}
            y={workspace.bounds.y - workspace.activeOrigin.y}
            width={workspace.bounds.width}
            height={workspace.bounds.height}
            fill={workspace.config.background}
            listening={false}
          />
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
          <GridLayer
            width={pixelSize.widthPx}
            height={pixelSize.heightPx}
            grid={grid}
            zoom={viewport.zoom}
          />
          <RegionsLayer regions={frame.regions} />
          <ObjectLayer
            document={viewDocument}
            listening={!handMode && !textEditActive}
            editingElementId={editingElementId}
            onSelect={handleObjectSelect}
            onHover={handleObjectHover}
            onDragMove={handleObjectDragMove}
            onDragEnd={handleObjectDragEnd}
            onEditStart={handleTextEditStart}
            getNodeRef={nodeRefRegistry.getNodeRef}
          />
          <GuidesLayer
            guides={interaction.guides}
            marquee={interaction.marquee}
            hoveredRect={hoveredRect}
            documentWidth={pixelSize.widthPx}
            documentHeight={pixelSize.heightPx}
          />
          {!textEditActive ? (
            <SelectionTransformer
              selectedIds={selectedIds}
              nodeMap={nodeMapRef.current}
              nodeMapVersion={nodeMapVersion}
              resizeEnabled={canResize}
              rotateEnabled={canRotate}
              keepRatio={keepRatio}
              onTransformStart={(kind) => {
                setInteraction({ mode: kind })
              }}
              onTransformEnd={(payloads) => {
                const transforms = describeTransformCommands(payloads)
                transformElements(transforms)
                clearGuides()
                setInteraction({ mode: 'idle' })
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
