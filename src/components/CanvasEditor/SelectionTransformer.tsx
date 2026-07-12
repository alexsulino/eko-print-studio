import { Transformer } from 'react-konva'
import { useEffect, useRef } from 'react'
import type Konva from 'konva'

interface SelectionTransformerProps {
  selectedIds: string[]
  nodeMap: Map<string, Konva.Node>
  nodeMapVersion: number
  resizeEnabled: boolean
  rotateEnabled: boolean
  keepRatio: boolean
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
  selectedIds,
  nodeMap,
  nodeMapVersion,
  resizeEnabled,
  rotateEnabled,
  keepRatio,
  onTransformEnd,
}: SelectionTransformerProps) {
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return

    if (!selectedIds.length || (!resizeEnabled && !rotateEnabled)) {
      transformer.nodes([])
      transformer.getLayer()?.batchDraw()
      return
    }

    const nodes = selectedIds
      .map((id) => nodeMap.get(id))
      .filter((node): node is Konva.Node => Boolean(node))

    transformer.nodes(nodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedIds, nodeMap, nodeMapVersion, resizeEnabled, rotateEnabled])

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={rotateEnabled && selectedIds.length === 1}
      keepRatio={keepRatio}
      enabledAnchors={
        resizeEnabled
          ? [
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
              'top-center',
              'bottom-center',
            ]
          : []
      }
      boundBoxFunc={(oldBox, newBox) => {
        if (Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8) return oldBox
        return newBox
      }}
      onTransformEnd={() => {
        if (selectedIds.length !== 1) return
        const id = selectedIds[0]!
        const node = nodeMap.get(id)
        if (!node) return

        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        const width = Math.max(8, Math.abs(node.width() * scaleX))
        const height = Math.max(8, Math.abs(node.height() * scaleY))
        const flipX = scaleX < 0 ? -1 : 1
        const flipY = scaleY < 0 ? -1 : 1

        node.scaleX(flipX)
        node.scaleY(flipY)
        node.width(width)
        node.height(height)

        onTransformEnd({
          id,
          x: node.x(),
          y: node.y(),
          width,
          height,
          rotation: node.rotation(),
          scaleX: flipX,
          scaleY: flipY,
        })
      }}
    />
  )
}
