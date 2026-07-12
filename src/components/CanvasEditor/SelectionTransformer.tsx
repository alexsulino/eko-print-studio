import { Transformer } from 'react-konva'
import { useEffect, useRef } from 'react'
import type Konva from 'konva'

interface SelectionTransformerProps {
  selectedId: string | null
  nodeMap: Map<string, Konva.Node>
  enabled: boolean
  onTransformEnd: (payload: {
    id: string
    x: number
    y: number
    width: number
    height: number
    rotation: number
    scaleX: number
    scaleY: number
  }) => void
}

export function SelectionTransformer({
  selectedId,
  nodeMap,
  enabled,
  onTransformEnd,
}: SelectionTransformerProps) {
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    if (!selectedId || !enabled) {
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
      return
    }

    const node = nodeMap.get(selectedId)
    if (!node) {
      transformer.nodes([])
      return
    }

    transformer.nodes([node])
    transformer.getLayer()?.batchDraw()
  }, [selectedId, nodeMap, enabled])

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={enabled}
      enabledAnchors={
        enabled
          ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']
          : []
      }
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 8 || newBox.height < 8) return oldBox
        return newBox
      }}
      onTransformEnd={() => {
        if (!selectedId) return
        const node = nodeMap.get(selectedId)
        if (!node) return

        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        const width = Math.max(8, node.width() * scaleX)
        const height = Math.max(8, node.height() * scaleY)

        node.scaleX(1)
        node.scaleY(1)

        onTransformEnd({
          id: selectedId,
          x: node.x(),
          y: node.y(),
          width,
          height,
          rotation: node.rotation(),
          scaleX: 1,
          scaleY: 1,
        })
      }}
    />
  )
}
