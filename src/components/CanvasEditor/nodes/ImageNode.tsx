import { memo } from 'react'
import { Image as KonvaImage } from 'react-konva'
import type { ImageElement } from '@/types/element'
import { recordReactRender } from '@/diagnostics/dragProfiler'
import { useAssetResource } from '../hooks/useAssetResource'
import { areCanvasNodePropsEqual, type CanvasNodeRenderProps } from './nodeRenderCompare'

type ImageNodeProps = CanvasNodeRenderProps & {
  element: ImageElement
}

function ImageNodeComponent({
  element,
  draggable,
  listening = true,
  interactionCursor,
  onSelect,
  onHover,
  onDragMove,
  onDragEnd,
  nodeRef,
}: ImageNodeProps) {
  recordReactRender('ImageNode')
  const { image } = useAssetResource(element.properties.assetId, element.properties.src)
  const { transform, properties } = element

  return (
    <KonvaImage
      id={element.id}
      name={element.id}
      image={image}
      x={transform.x}
      y={transform.y}
      width={transform.width}
      height={transform.height}
      rotation={transform.rotation}
      scaleX={transform.scaleX}
      scaleY={transform.scaleY}
      opacity={properties.opacity ?? 1}
      draggable={draggable}
      listening={listening}
      visible={element.visible}
      onMouseEnter={(e) => {
        onHover?.(element.id)
        const stage = e.target.getStage()
        if (stage && interactionCursor) {
          stage.container().style.cursor = interactionCursor
        }
      }}
      onMouseLeave={(e) => {
        onHover?.(null)
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = 'default'
      }}
      onClick={(e) => {
        e.cancelBubble = true
        onSelect(element.id, e)
      }}
      onTap={(e) => {
        e.cancelBubble = true
        onSelect(element.id, e)
      }}
      onDragMove={(e) => {
        if (!onDragMove) return
        const snapped = onDragMove(element.id, e.target.x(), e.target.y())
        e.target.position(snapped)
      }}
      onDragEnd={(e) => onDragEnd(element.id, e.target.x(), e.target.y())}
      ref={nodeRef}
    />
  )
}

export const ImageNode = memo(ImageNodeComponent, areCanvasNodePropsEqual)
