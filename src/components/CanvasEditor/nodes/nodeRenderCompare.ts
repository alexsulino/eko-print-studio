import type Konva from 'konva'
import type { EkoElement } from '@/types/element'

export interface CanvasNodeRenderProps {
  element: EkoElement
  draggable: boolean
  /** Konva hit listening — false for non-selectable overlays (e.g. system guides). */
  listening?: boolean
  /** Hide Konva paint while an HTML overlay owns the visual (text edit). */
  suppressPaint?: boolean
  /** CSS cursor while hovering this node (e.g. not-allowed for protected). */
  interactionCursor?: string
  nodeRef?: (node: Konva.Node | null) => void
  onSelect: (id: string, evt: { evt: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } }) => void
  onHover?: (id: string | null) => void
  onEditStart?: (id: string) => void
  onDragMove?: (id: string, x: number, y: number) => { x: number; y: number }
  onDragEnd: (id: string, x: number, y: number) => void
}

/** Shared memo comparator — selection is handled by SelectionTransformer, not node props. */
export function areCanvasNodePropsEqual(
  prev: CanvasNodeRenderProps,
  next: CanvasNodeRenderProps,
): boolean {
  return (
    prev.element === next.element &&
    prev.draggable === next.draggable &&
    prev.listening === next.listening &&
    prev.suppressPaint === next.suppressPaint &&
    prev.interactionCursor === next.interactionCursor &&
    prev.nodeRef === next.nodeRef &&
    prev.onSelect === next.onSelect &&
    prev.onHover === next.onHover &&
    prev.onEditStart === next.onEditStart &&
    prev.onDragMove === next.onDragMove &&
    prev.onDragEnd === next.onDragEnd
  )
}
