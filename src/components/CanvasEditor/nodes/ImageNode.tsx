import { Image as KonvaImage } from 'react-konva'
import type { ImageElement } from '@/types/element'
import type Konva from 'konva'
import { useHtmlImage } from '../hooks/useHtmlImage'

interface ImageNodeProps {
  element: ImageElement
  draggable: boolean
  selected?: boolean
  onSelect: (id: string, evt: { evt: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } }) => void
  onDragMove?: (id: string, x: number, y: number) => { x: number; y: number }
  onDragEnd: (id: string, x: number, y: number) => void
  onNodeRef?: (id: string, node: Konva.Node | null) => void
}

export function ImageNode({
  element,
  draggable,
  onSelect,
  onDragMove,
  onDragEnd,
  onNodeRef,
}: ImageNodeProps) {
  const image = useHtmlImage(element.properties.src)
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
      visible={element.visible}
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
      ref={(node) => onNodeRef?.(element.id, node)}
    />
  )
}
