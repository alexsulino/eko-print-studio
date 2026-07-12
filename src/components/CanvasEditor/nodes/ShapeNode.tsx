import { Circle, Line, Rect } from 'react-konva'
import type { ShapeElement } from '@/types/element'
import type Konva from 'konva'

interface ShapeNodeProps {
  element: ShapeElement
  draggable: boolean
  onSelect: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onNodeRef?: (id: string, node: Konva.Node | null) => void
}

export function ShapeNode({ element, draggable, onSelect, onDragEnd, onNodeRef }: ShapeNodeProps) {
  const { transform, properties } = element
  const common = {
    id: element.id,
    name: element.id,
    x: transform.x,
    y: transform.y,
    rotation: transform.rotation,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
    opacity: properties.opacity ?? 1,
    draggable,
    visible: element.visible,
    onClick: () => onSelect(element.id),
    onTap: () => onSelect(element.id),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onDragEnd(element.id, e.target.x(), e.target.y()),
    ref: (node: Konva.Node | null) => onNodeRef?.(element.id, node),
  }

  if (properties.shape === 'circle') {
    const radius = Math.min(transform.width, transform.height) / 2
    return (
      <Circle
        {...common}
        radius={radius}
        offsetX={-radius}
        offsetY={-radius}
        fill={properties.fill}
        stroke={properties.stroke}
        strokeWidth={properties.strokeWidth ?? 0}
      />
    )
  }

  if (properties.shape === 'line') {
    return (
      <Line
        {...common}
        points={[0, 0, transform.width, transform.height]}
        stroke={properties.stroke ?? properties.fill ?? '#111'}
        strokeWidth={properties.strokeWidth ?? 2}
      />
    )
  }

  return (
    <Rect
      {...common}
      width={transform.width}
      height={transform.height}
      fill={properties.fill}
      stroke={properties.stroke}
      strokeWidth={properties.strokeWidth ?? 0}
      cornerRadius={properties.cornerRadius ?? 0}
    />
  )
}
