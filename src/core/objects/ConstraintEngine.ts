import type { ElementLayout, ElementTransform, LayoutConstraintEdge } from '@/types/element'
import { AnchorSystem } from '@/core/anchors/AnchorSystem'
import type { AnchorPreset } from '@/types/layout'

export interface ConstraintContext {
  /** Parent / page / frame bounds in document pixels. */
  bounds: { x: number; y: number; width: number; height: number }
}

/**
 * Constraint Engine — Canva-like edge/center/stretch prep.
 * Pure transform writers; UI binding is future work.
 */
export class ConstraintEngine {
  static defaultLayout(partial?: Partial<ElementLayout>): ElementLayout {
    return {
      constraints: [],
      stretch: false,
      center: false,
      ...partial,
    }
  }

  static apply(
    transform: ElementTransform,
    layout: ElementLayout | undefined,
    context: ConstraintContext,
  ): ElementTransform {
    if (!layout?.constraints?.length && !layout?.center && !layout?.stretch) {
      return transform
    }

    let next = { ...transform }
    const edges = new Set<LayoutConstraintEdge>(layout.constraints ?? [])

    if (layout.center || edges.has('centerX')) {
      next.x = context.bounds.x + (context.bounds.width - next.width) / 2
    }
    if (layout.center || edges.has('centerY')) {
      next.y = context.bounds.y + (context.bounds.height - next.height) / 2
    }
    if (edges.has('left')) {
      next.x = context.bounds.x + (layout.margin?.left ?? 0)
    }
    if (edges.has('right')) {
      next.x =
        context.bounds.x +
        context.bounds.width -
        next.width -
        (layout.margin?.right ?? 0)
    }
    if (edges.has('top')) {
      next.y = context.bounds.y + (layout.margin?.top ?? 0)
    }
    if (edges.has('bottom')) {
      next.y =
        context.bounds.y +
        context.bounds.height -
        next.height -
        (layout.margin?.bottom ?? 0)
    }
    if (layout.stretch || edges.has('stretch')) {
      next.x = context.bounds.x + (layout.padding?.left ?? 0)
      next.y = context.bounds.y + (layout.padding?.top ?? 0)
      next.width = Math.max(
        8,
        context.bounds.width - (layout.padding?.left ?? 0) - (layout.padding?.right ?? 0),
      )
      next.height = Math.max(
        8,
        context.bounds.height - (layout.padding?.top ?? 0) - (layout.padding?.bottom ?? 0),
      )
    }
    if (edges.has('scale') && layout.anchor) {
      const point = AnchorSystem.resolvePreset(
        layout.anchor as AnchorPreset,
        context.bounds,
      )
      next.x = point.x - next.width / 2
      next.y = point.y - next.height / 2
    }

    return next
  }
}
