import type { LayerListItem } from '@/core/layers/LayerEngine'
import type { ElementCategory, ElementType } from '@/types/element'

/** View-model for the layers tree — derived from LayerEngine, never stored. */
export interface LayerTreeNode {
  id: string
  name: string
  type: ElementType
  category: ElementCategory
  depth: number
  visible: boolean
  locked: boolean
  effectivelyVisible: boolean
  effectivelyLocked: boolean
  /** Template / system chrome — shown with badge, not a broken editor. */
  protected: boolean
  parentId: string | null
  /** Reserved for future nesting / drag. */
  childIds: string[]
}

export function toLayerTreeNodes(
  items: LayerListItem[],
  extras?: Map<
    string,
    { category: ElementCategory; protected: boolean }
  >,
): LayerTreeNode[] {
  const childrenByParent = new Map<string | null, string[]>()
  for (const item of items) {
    const key = item.parentId
    const list = childrenByParent.get(key) ?? []
    list.push(item.id)
    childrenByParent.set(key, list)
  }

  return items.map((item) => {
    const extra = extras?.get(item.id)
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      category: extra?.category ?? 'customer',
      depth: item.depth,
      visible: item.visible,
      locked: item.locked,
      effectivelyVisible: item.effectivelyVisible,
      effectivelyLocked: item.effectivelyLocked,
      protected: extra?.protected ?? item.locked,
      parentId: item.parentId,
      childIds: childrenByParent.get(item.id) ?? [],
    }
  })
}