import { memo } from 'react'
import { Text as KonvaText } from 'react-konva'
import type { TextElement } from '@/types/element'
import { recordReactRender } from '@/diagnostics/dragProfiler'
import { areCanvasNodePropsEqual, type CanvasNodeRenderProps } from './nodeRenderCompare'

type TextNodeProps = CanvasNodeRenderProps & {
  element: TextElement
}

function TextNodeComponent({
  element,
  draggable,
  listening = true,
  suppressPaint,
  interactionCursor,
  onSelect,
  onHover,
  onEditStart,
  onDragMove,
  onDragEnd,
  nodeRef,
}: TextNodeProps) {
  recordReactRender('TextNode')
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
      opacity={suppressPaint ? 0 : 1}
      draggable={draggable}
      listening={listening}
      visible={element.visible}
      hitFunc={(ctx, shape) => {
        ctx.beginPath()
        ctx.rect(0, 0, shape.width(), shape.height())
        ctx.closePath()
        ctx.fillStrokeShape(shape)
      }}
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
      onDblClick={(e) => {
        e.cancelBubble = true
        onEditStart?.(element.id)
      }}
      onDblTap={(e) => {
        e.cancelBubble = true
        onEditStart?.(element.id)
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

export const TextNode = memo(TextNodeComponent, areCanvasNodePropsEqual)
