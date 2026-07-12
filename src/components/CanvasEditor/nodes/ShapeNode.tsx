import { Circle, Line, Rect } from 'react-konva'
import type { ShapeElement } from '@/types/element'
import type Konva from 'konva'

interface ShapeNodeProps {
  element: ShapeElement
  draggable: boolean
  selected?: boolean
  onSelect: (id: string, evt: { evt: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } }) => void
  onDragMove?: (id: string, x: number, y: number) => { x: number; y: number }
  onDragEnd: (id: string, x: number, y: number) => void
  onNodeRef?: (id: string, node: Konva.Node | null) => void
}

export function ShapeNode({
  element,
  draggable,
  onSelect,
  onDragMove,
  onDragEnd,
  onNodeRef,
}: ShapeNodeProps) {
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
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true
      onSelect(element.id, e)
    },
    onTap: (e: Konva.KonvaEventObject<Event>) => {
      e.cancelBubble = true
      const native = e.evt as Partial<MouseEvent>
      onSelect(element.id, {
        evt: {
          ctrlKey: native.ctrlKey,
          metaKey: native.metaKey,
          shiftKey: native.shiftKey,
        },
      })
    },
    onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!onDragMove) return
      const snapped = onDragMove(element.id, e.target.x(), e.target.y())
      e.target.position(snapped)
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
      onDragEnd(element.id, e.target.x(), e.target.y()),
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
