import { Text as KonvaText } from 'react-konva'
import type { TextElement } from '@/types/element'
import type Konva from 'konva'

interface TextNodeProps {
  element: TextElement
  draggable: boolean
  onSelect: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onNodeRef?: (id: string, node: Konva.Node | null) => void
}

export function TextNode({ element, draggable, onSelect, onDragEnd, onNodeRef }: TextNodeProps) {
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
      onClick={() => onSelect(element.id)}
      onTap={() => onSelect(element.id)}
      onDragEnd={(e) => onDragEnd(element.id, e.target.x(), e.target.y())}
      ref={(node) => onNodeRef?.(element.id, node)}
    />
  )
}
