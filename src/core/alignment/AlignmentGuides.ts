import type { EkoElement, ElementTransform } from '@/types/element'
import type { AlignMode, DistributeMode, SnapGuide } from '@/types/interaction'

export interface DocumentRect {
  x: number
  y: number
  width: number
  height: number
}

export interface AlignMove {
  elementId: string
  x: number
  y: number
}

/**
 * Alignment Guides — selection AABB, align/distribute moves, ephemeral center guides.
 * Smart-guide *lines* during drag come from SnappingEngine; this module owns
 * geometry used by zoom-to-selection and alignment commands.
 */
export class AlignmentGuides {
  /** Axis-aligned box from transform (rotation ignored — same model as marquee). */
  static fromTransform(transform: ElementTransform): DocumentRect {
    const width = Math.abs(transform.width * transform.scaleX)
    const height = Math.abs(transform.height * transform.scaleY)
    return {
      x: transform.x,
      y: transform.y,
      width: Math.max(1, width),
      height: Math.max(1, height),
    }
  }

  static union(rects: DocumentRect[]): DocumentRect | null {
    if (!rects.length) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const r of rects) {
      minX = Math.min(minX, r.x)
      minY = Math.min(minY, r.y)
      maxX = Math.max(maxX, r.x + r.width)
      maxY = Math.max(maxY, r.y + r.height)
    }
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    }
  }

  static selectionBounds(elements: EkoElement[]): DocumentRect | null {
    return AlignmentGuides.union(elements.map((el) => AlignmentGuides.fromTransform(el.transform)))
  }

  /** Center crosshair guides for a rect (ephemeral, not stored on document). */
  static centerGuides(rect: DocumentRect): SnapGuide[] {
    return [
      {
        orientation: 'vertical',
        position: rect.x + rect.width / 2,
        kind: 'center',
      },
      {
        orientation: 'horizontal',
        position: rect.y + rect.height / 2,
        kind: 'center',
      },
    ]
  }

  /**
   * Align selected elements to the selection bounding box (Canva multi-select).
   * Single element aligns to the provided page bounds when `pageBounds` is set.
   */
  static align(
    elements: EkoElement[],
    mode: AlignMode,
    pageBounds?: DocumentRect | null,
  ): AlignMove[] {
    if (!elements.length) return []

    const bounds =
      elements.length === 1 && pageBounds
        ? pageBounds
        : AlignmentGuides.selectionBounds(elements)
    if (!bounds) return []

    return elements.map((el) => {
      const box = AlignmentGuides.fromTransform(el.transform)
      let x = el.transform.x
      let y = el.transform.y
      switch (mode) {
        case 'left':
          x = bounds.x
          break
        case 'right':
          x = bounds.x + bounds.width - box.width
          break
        case 'top':
          y = bounds.y
          break
        case 'bottom':
          y = bounds.y + bounds.height - box.height
          break
        case 'centerHorizontal':
          x = bounds.x + (bounds.width - box.width) / 2
          break
        case 'centerVertical':
          y = bounds.y + (bounds.height - box.height) / 2
          break
      }
      return { elementId: el.id, x, y }
    })
  }

  /**
   * Distribute elements evenly along an axis (requires ≥ 3).
   * Outer elements keep their positions; interiors are spaced proportionally.
   */
  static distribute(elements: EkoElement[], mode: DistributeMode): AlignMove[] {
    if (elements.length < 3) return []

    const annotated = elements.map((el) => ({
      el,
      box: AlignmentGuides.fromTransform(el.transform),
    }))

    if (mode === 'horizontal') {
      annotated.sort((a, b) => a.box.x - b.box.x)
      const first = annotated[0]!
      const last = annotated[annotated.length - 1]!
      const left = first.box.x
      const right = last.box.x + last.box.width
      const totalWidth = annotated.reduce((sum, item) => sum + item.box.width, 0)
      const gap = (right - left - totalWidth) / (annotated.length - 1)
      let cursor = left
      return annotated.map((item) => {
        const x = cursor
        cursor += item.box.width + gap
        return { elementId: item.el.id, x, y: item.el.transform.y }
      })
    }

    annotated.sort((a, b) => a.box.y - b.box.y)
    const first = annotated[0]!
    const last = annotated[annotated.length - 1]!
    const top = first.box.y
    const bottom = last.box.y + last.box.height
    const totalHeight = annotated.reduce((sum, item) => sum + item.box.height, 0)
    const gap = (bottom - top - totalHeight) / (annotated.length - 1)
    let cursor = top
    return annotated.map((item) => {
      const y = cursor
      cursor += item.box.height + gap
      return { elementId: item.el.id, x: item.el.transform.x, y }
    })
  }
}
