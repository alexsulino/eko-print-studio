import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import type Konva from 'konva'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { SelectionEngine } from '@/core/selection/SelectionEngine'
import { viewportManager } from '@/core/viewport/ViewportManager'
import { LayoutResolver, RendererAdapter } from '@/core/layout'
import { useEditorStore } from '@/store/editorStore'
import { useKeyboardEngine } from '@/hooks/useKeyboardEngine'
import { ObjectLayer } from './ObjectLayer'
import { SelectionTransformer } from './SelectionTransformer'
import { GuidesLayer } from './GuidesLayer'
import { RegionsLayer } from './RegionsLayer'

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

  useKeyboardEngine(Boolean(document))

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
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const width = Math.round(entry.contentRect.width)
      const height = Math.round(entry.contentRect.height)
      if (width <= 0 || height <= 0) return

      const current = viewportManager.getState()
      const sizeChanged = current.stageWidth !== width || current.stageHeight !== height
      if (sizeChanged) {
        viewportManager.setStageSize(width, height)
        setViewport({
          ...viewportManager.getState(),
          stageWidth: width,
          stageHeight: height,
        })
      }

      // Re-fit whenever the stage gains a real size (or changes). Skipping re-fit after the
      // first observation was leaving the paper/elements off-screen after layout settled.
      if (useEditorStore.getState().document && (sizeChanged || !fittedOnceRef.current)) {
        fittedOnceRef.current = true
        fitViewport()
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [fitViewport, setViewport])

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

  const handleNodeRef = useCallback((id: string, node: Konva.Node | null) => {
    const map = nodeMapRef.current
    if (node) {
      if (map.get(id) === node) return
      map.set(id, node)
    } else {
      if (!map.has(id)) return
      map.delete(id)
    }
    setNodeMapVersion((v) => v + 1)
  }, [])

  const handMode = interaction.tool === 'hand' || interaction.spacePressed

  const primary = selectedIds[selectedIds.length - 1] ?? null
  const selectedElement = document?.elements.find((el) => el.id === primary) ?? null
  const canResize = selectedElement
    ? templateRulesEngine.can(selectedElement, 'resize', document ?? undefined).allowed
    : false
  const canRotate = selectedElement
    ? templateRulesEngine.can(selectedElement, 'rotate', document ?? undefined).allowed
    : false

  if (!document || !frame || !viewDocument) {
    return <div className="canvas-empty">Preparando canvas…</div>
  }

  const toDoc = (screenX: number, screenY: number) =>
    viewportManager.screenToDocument(screenX, screenY)

  return (
    <div
      className={`canvas-shell${handMode ? ' canvas-shell--hand' : ''}`}
      ref={containerRef}
      tabIndex={0}
    >
      <Stage
        width={viewport.stageWidth}
        height={viewport.stageHeight}
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
            selectedIds={selectedIds}
            listening={!handMode}
            onSelect={(id, modifiers) => {
              const next = SelectionEngine.applyClick(selectedIds, id, modifiers)
              selectElements(next)
            }}
            onDragMove={(id, x, y) => {
              setInteraction({ mode: 'dragging' })
              const snapped = snapMove(id, x, y)
              setGuides(snapped.guides)
              const doc = useEditorStore.getState().document
              const ids = useEditorStore.getState().selectedIds
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
            }}
            onDragEnd={(id, x, y) => {
              const snapped = snapMove(id, x, y)
              const doc = useEditorStore.getState().document
              const ids = useEditorStore.getState().selectedIds
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
                  return
                }
              }
              moveElement(id, snapped.x, snapped.y)
              clearGuides()
            }}
            onNodeRef={handleNodeRef}
          />
          <GuidesLayer
            guides={interaction.guides}
            marquee={interaction.marquee}
            documentWidth={pixelSize.widthPx}
            documentHeight={pixelSize.heightPx}
          />
          <SelectionTransformer
            selectedIds={selectedIds}
            nodeMap={nodeMapRef.current}
            nodeMapVersion={nodeMapVersion}
            resizeEnabled={canResize && selectedIds.length === 1}
            rotateEnabled={canRotate && selectedIds.length === 1}
            keepRatio={keepRatio}
            onTransformEnd={(payload) => {
              transformElement(payload.id, {
                x: payload.x,
                y: payload.y,
                width: payload.width,
                height: payload.height,
                rotation: payload.rotation,
                scaleX: payload.scaleX,
                scaleY: payload.scaleY,
              })
              clearGuides()
            }}
          />
        </Layer>
      </Stage>
    </div>
  )
}
