import { Text as KonvaText } from 'react-konva'
import type { TextElement } from '@/types/element'
import type Konva from 'konva'

interface TextNodeProps {
  element: TextElement
  draggable: boolean
  selected?: boolean
  onSelect: (id: string, evt: { evt: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } }) => void
  onDragMove?: (id: string, x: number, y: number) => { x: number; y: number }
  onDragEnd: (id: string, x: number, y: number) => void
  onNodeRef?: (id: string, node: Konva.Node | null) => void
}

export function TextNode({
  element,
  draggable,
  onSelect,
  onDragMove,
  onDragEnd,
  onNodeRef,
}: TextNodeProps) {
  const { transform, properties } = element

  return (
    <KonvaText
      id={element.id}
      name={element.id}
      x={transform.x}
      y={transform.y}
      width={transform.width}
      height={transform.height}
      rotation={transform.rotation}
      scaleX={transform.scaleX}
      scaleY={transform.scaleY}
      text={properties.text}
      fontFamily={properties.fontFamily}
      fontSize={properties.fontSize}
      fontStyle={properties.fontStyle ?? 'normal'}
      fill={properties.fill}
      align={properties.align ?? 'left'}
      verticalAlign={properties.verticalAlign ?? 'top'}
      lineHeight={properties.lineHeight}
      letterSpacing={properties.letterSpacing}
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
