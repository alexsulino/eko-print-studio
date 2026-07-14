import type { RenderContext } from './RenderContext'
import type { OverlayItem, OverlayKind } from './types'

export interface OverlayContributor {
  readonly kind: OverlayKind
  contribute(context: RenderContext): OverlayItem[]
}

/**
 * Overlay system — selection / hover / snap / guides / grid / …
 * Completely separate from object content renderers.
 */
export class OverlaySystem {
  private contributors = new Map<OverlayKind, OverlayContributor>()

  register(contributor: OverlayContributor): void {
    this.contributors.set(contributor.kind, contributor)
  }

  unregister(kind: OverlayKind): void {
    this.contributors.delete(kind)
  }

  list(): OverlayContributor[] {
    return [...this.contributors.values()]
  }

  collect(context: RenderContext, kinds?: OverlayKind[]): OverlayItem[] {
    const items: OverlayItem[] = []
    for (const contributor of this.contributors.values()) {
      if (kinds && !kinds.includes(contributor.kind)) continue
      items.push(...contributor.contribute(context))
    }
    return items.sort((a, b) => a.zIndex - b.zIndex)
  }
}

export const overlaySystem = new OverlaySystem()
