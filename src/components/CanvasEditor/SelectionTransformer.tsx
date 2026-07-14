import { Transformer } from 'react-konva'
import { useEffect, useRef } from 'react'
import type Konva from 'konva'
import { recordReactRender, recordUseEffect } from '@/diagnostics/dragProfiler'

export interface TransformEndPayload {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
}

interface SelectionTransformerProps {
  selectedIds: string[]
  nodeMap: Map<string, Konva.Node>
  nodeMapVersion: number
  resizeEnabled: boolean
  rotateEnabled: boolean
  keepRatio: boolean
  onTransformStart?: (kind: 'resizing' | 'rotating' | 'transforming') => void
  onTransformEnd: (payloads: TransformEndPayload[]) => void
}

/** Canva-like transformer chrome — soft blue, compact anchors. */
const TRANSFORMER_STYLE = {
  borderStroke: '#3b82f6',
  borderStrokeWidth: 1.5,
  anchorFill: '#ffffff',
  anchorStroke: '#3b82f6',
  anchorStrokeWidth: 1.5,
  anchorSize: 8,
  anchorCornerRadius: 2,
  rotateAnchorOffset: 22,
  padding: 2,
} as const

export function SelectionTransformer({
  selectedIds,
  nodeMap,
  nodeMapVersion,
  resizeEnabled,
  rotateEnabled,
  keepRatio,
  onTransformStart,
  onTransformEnd,
}: SelectionTransformerProps) {
  recordReactRender('SelectionTransformer')
  const transformerRef = useRef<Konva.Transformer>(null)
  const activeKindRef = useRef<'resizing' | 'rotating' | 'transforming'>('transforming')

  useEffect(() => {
    recordUseEffect('SelectionTransformer.attachNodes')
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
      rotateEnabled={rotateEnabled}
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
      borderStroke={TRANSFORMER_STYLE.borderStroke}
      borderStrokeWidth={TRANSFORMER_STYLE.borderStrokeWidth}
      anchorFill={TRANSFORMER_STYLE.anchorFill}
      anchorStroke={TRANSFORMER_STYLE.anchorStroke}
      anchorStrokeWidth={TRANSFORMER_STYLE.anchorStrokeWidth}
      anchorSize={TRANSFORMER_STYLE.anchorSize}
      anchorCornerRadius={TRANSFORMER_STYLE.anchorCornerRadius}
      rotateAnchorOffset={TRANSFORMER_STYLE.rotateAnchorOffset}
      padding={TRANSFORMER_STYLE.padding}
      onTransformStart={(e) => {
        const anchor = (e.currentTarget as Konva.Transformer).getActiveAnchor?.()
        const kind =
          anchor === 'rotater' ? 'rotating' : anchor ? 'resizing' : 'transforming'
        activeKindRef.current = kind
        onTransformStart?.(kind)
      }}
      onTransformEnd={() => {
        if (!selectedIds.length) return
        const payloads: TransformEndPayload[] = []
        for (const id of selectedIds) {
          const node = nodeMap.get(id)
          if (!node) continue

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

          payloads.push({
            id,
            x: node.x(),
            y: node.y(),
            width,
            height,
            rotation: node.rotation(),
            scaleX: flipX,
            scaleY: flipY,
          })
        }
        if (payloads.length) onTransformEnd(payloads)
      }}
    />
  )
}
