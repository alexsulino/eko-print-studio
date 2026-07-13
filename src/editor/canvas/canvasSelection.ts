import { SelectionEngine } from '@/core/selection/SelectionEngine'

export type CanvasClickModifiers = {
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
}

/**
 * Pure bridge: Konva click modifiers → next selection set.
 * Shift currently maps to add (SelectionEngine); range-select can extend later.
 */
export function resolveCanvasSelection(
  currentIds: readonly string[],
  elementId: string,
  modifiers: CanvasClickModifiers,
): string[] {
  return SelectionEngine.applyClick([...currentIds], elementId, modifiers)
}
