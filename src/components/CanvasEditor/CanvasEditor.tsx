import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect } from 'react-konva'
import type Konva from 'konva'
import { getDocumentPixelSize } from '@/core/document/units'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { viewportManager } from '@/core/viewport/ViewportManager'
import { useEditorStore } from '@/store/editorStore'
import { ObjectLayer } from './ObjectLayer'
import { SelectionTransformer } from './SelectionTransformer'

export function CanvasEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeMapRef = useRef(new Map<string, Konva.Node>())
  const [nodeMapVersion, setNodeMapVersion] = useState(0)

  const document = useEditorStore((s) => s.document)
  const selectedId = useEditorStore((s) => s.selectedId)
  const viewport = useEditorStore((s) => s.viewport)
  const selectElement = useEditorStore((s) => s.selectElement)
  const moveElement = useEditorStore((s) => s.moveElement)
  const resizeElement = useEditorStore((s) => s.resizeElement)
  const rotateElement = useEditorStore((s) => s.rotateElement)
  const setViewport = useEditorStore((s) => s.setViewport)
  const fitViewport = useEditorStore((s) => s.fitViewport)

  const pixelSize = useMemo(
    () => (document ? getDocumentPixelSize(document.canvas) : { widthPx: 0, heightPx: 0 }),
    [document],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      viewportManager.setStageSize(width, height)
      setViewport({
        ...viewportManager.getState(),
        stageWidth: width,
        stageHeight: height,
      })
      fitViewport()
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [fitViewport, setViewport])

  const handleNodeRef = useCallback((id: string, node: Konva.Node | null) => {
    if (node) {
      nodeMapRef.current.set(id, node)
    } else {
      nodeMapRef.current.delete(id)
    }
    setNodeMapVersion((v) => v + 1)
  }, [])

  const selectedElement = document?.elements.find((el) => el.id === selectedId) ?? null
  const canResize = selectedElement
    ? templateRulesEngine.can(selectedElement, 'resize', document ?? undefined).allowed
    : false
  const canRotate = selectedElement
    ? templateRulesEngine.can(selectedElement, 'rotate', document ?? undefined).allowed
    : false
  const transformerEnabled = Boolean(selectedElement && (canResize || canRotate))

  if (!document) {
    return <div className="canvas-empty">Carregando documento…</div>
  }

  return (
    <div className="canvas-shell" ref={containerRef}>
      <Stage
        width={viewport.stageWidth}
        height={viewport.stageHeight}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            selectElement(null)
          }
        }}
      >
        <Layer x={viewport.panX} y={viewport.panY} scaleX={viewport.zoom} scaleY={viewport.zoom}>
          <Rect
            x={0}
            y={0}
            width={pixelSize.widthPx}
            height={pixelSize.heightPx}
            fill={document.canvas.backgroundColor ?? '#ffffff'}
            shadowColor="rgba(0,0,0,0.25)"
            shadowBlur={24}
            shadowOpacity={0.35}
            listening={false}
          />
          <ObjectLayer
            document={document}
            onSelect={selectElement}
            onDragEnd={(id, x, y) => moveElement(id, x, y)}
            onNodeRef={handleNodeRef}
          />
          <SelectionTransformer
            key={nodeMapVersion}
            selectedId={selectedId}
            nodeMap={nodeMapRef.current}
            enabled={transformerEnabled}
            onTransformEnd={(payload) => {
              resizeElement(payload.id, {
                width: payload.width,
                height: payload.height,
                x: payload.x,
                y: payload.y,
                scaleX: payload.scaleX,
                scaleY: payload.scaleY,
              })
              rotateElement(payload.id, payload.rotation)
            }}
          />
        </Layer>
      </Stage>
    </div>
  )
}
