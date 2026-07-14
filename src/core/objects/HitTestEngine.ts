import type { EkoElement, ElementTransform } from '@/types/element'

export type HitTargetKind = 'element' | 'group' | 'handle' | 'empty'

export interface HitResult {
  kind: HitTargetKind
  elementId: string | null
  /** Depth in nest (0 = root). */
  depth: number
}

export interface HitBox {
  id: string
  type: EkoElement['type']
  parentId?: string | null
  zIndex: number
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

/**
 * Hit Testing Engine — document-space picking for thousands of objects (O(n)).
 * Rotation uses AABB of the local box (same model as marquee); OBB can refine later.
 */
export class HitTestEngine {
  static boxesFromElements(elements: EkoElement[]): HitBox[] {
    return elements
      .filter((el) => el.visible)
      .map((el) => HitTestEngine.boxFromTransform(el.id, el.type, el.transform, el.parentId, el.zIndex))
  }

  static boxFromTransform(
    id: string,
    type: EkoElement['type'],
    transform: ElementTransform,
    parentId: string | null | undefined,
    zIndex: number,
  ): HitBox {
    const width = Math.abs(transform.width * transform.scaleX)
    const height = Math.abs(transform.height * transform.scaleY)
    return {
      id,
      type,
      parentId,
      zIndex,
      x: transform.x,
      y: transform.y,
      width: Math.max(1, width),
      height: Math.max(1, height),
      rotation: transform.rotation,
    }
  }

  /**
   * Top-most element under point (higher zIndex wins).
   * Prefers leaf over group when both hit, unless `preferGroups`.
   */
  static hitTest(
    point: { x: number; y: number },
    boxes: HitBox[],
    options?: { preferGroups?: boolean },
  ): HitResult {
    const hits = boxes
      .filter((box) => HitTestEngine.contains(point, box))
      .sort((a, b) => b.zIndex - a.zIndex)

    if (!hits.length) {
      return { kind: 'empty', elementId: null, depth: 0 }
    }

    if (options?.preferGroups) {
      const group = hits.find((h) => h.type === 'group')
      if (group) {
        return { kind: 'group', elementId: group.id, depth: group.parentId ? 1 : 0 }
      }
    }

    const top = hits.find((h) => h.type !== 'group') ?? hits[0]!
    return {
      kind: top.type === 'group' ? 'group' : 'element',
      elementId: top.id,
      depth: top.parentId ? 1 : 0,
    }
  }

  static contains(point: { x: number; y: number }, box: HitBox): boolean {
    // Axis-aligned for now (matches SelectionEngine marquee model).
    return (
      point.x >= box.x &&
      point.y >= box.y &&
      point.x <= box.x + box.width &&
      point.y <= box.y + box.height
    )
  }
}
