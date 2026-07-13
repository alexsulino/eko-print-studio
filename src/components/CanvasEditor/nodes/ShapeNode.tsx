import { memo } from 'react'
import { Circle, Line, Rect } from 'react-konva'
import type { ShapeElement } from '@/types/element'
import type Konva from 'konva'
import { recordReactRender } from '@/diagnostics/dragProfiler'
import { areCanvasNodePropsEqual, type CanvasNodeRenderProps } from './nodeRenderCompare'

type ShapeNodeProps = CanvasNodeRenderProps & {
  element: ShapeElement
}

function ShapeNodeComponent({
  element,
  draggable,
  listening = true,
  interactionCursor,
  onSelect,
  onDragMove,
  onDragEnd,
  nodeRef,
}: ShapeNodeProps) {
  recordReactRender('ShapeNode')
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
    listening,
    visible: element.visible,
    onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage && interactionCursor) {
        stage.container().style.cursor = interactionCursor
      }
    },
    onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage()
      if (stage) stage.container().style.cursor = 'default'
    },
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
    ref: nodeRef,
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

export const ShapeNode = memo(ShapeNodeComponent, areCanvasNodePropsEqual)
