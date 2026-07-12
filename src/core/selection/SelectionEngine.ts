/**
 * Selection Engine — pure selection-set operations.
 * Selection lives only in application state, never in Konva nodes.
 */
export class SelectionEngine {
  static empty(): string[] {
    return []
  }

  static replace(ids: string[]): string[] {
    return [...new Set(ids.filter(Boolean))]
  }

  static clear(): string[] {
    return []
  }

  static add(current: string[], id: string): string[] {
    if (current.includes(id)) return current
    return [...current, id]
  }

  static remove(current: string[], id: string): string[] {
    return current.filter((item) => item !== id)
  }

  static toggle(current: string[], id: string): string[] {
    return current.includes(id) ? SelectionEngine.remove(current, id) : SelectionEngine.add(current, id)
  }

  /** SHIFT/CTRL semantics: ctrl → toggle; shift → add; else replace. */
  static applyClick(
    current: string[],
    id: string,
    modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean },
  ): string[] {
    if (modifiers.ctrlKey || modifiers.metaKey) {
      return SelectionEngine.toggle(current, id)
    }
    if (modifiers.shiftKey) {
      return SelectionEngine.add(current, id)
    }
    return SelectionEngine.replace([id])
  }

  static primary(ids: string[]): string | null {
    return ids.length > 0 ? ids[ids.length - 1]! : null
  }

  static cycle(selectableIds: string[], current: string[], direction: 1 | -1): string[] {
    if (selectableIds.length === 0) return []
    const primary = SelectionEngine.primary(current)
    const index = primary ? selectableIds.indexOf(primary) : -1
    const nextIndex =
      index === -1
        ? direction === 1
          ? 0
          : selectableIds.length - 1
        : (index + direction + selectableIds.length) % selectableIds.length
    return SelectionEngine.replace([selectableIds[nextIndex]!])
  }

  static fromMarquee(
    elements: Array<{ id: string; x: number; y: number; width: number; height: number }>,
    marquee: { x1: number; y1: number; x2: number; y2: number },
  ): string[] {
    const left = Math.min(marquee.x1, marquee.x2)
    const right = Math.max(marquee.x1, marquee.x2)
    const top = Math.min(marquee.y1, marquee.y2)
    const bottom = Math.max(marquee.y1, marquee.y2)

    return elements
      .filter((el) => {
        const elRight = el.x + el.width
        const elBottom = el.y + el.height
        return el.x < right && elRight > left && el.y < bottom && elBottom > top
      })
      .map((el) => el.id)
  }
}
