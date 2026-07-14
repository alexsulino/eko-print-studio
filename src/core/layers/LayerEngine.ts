import type { EkoDocument } from '@/types/document'
import type { EkoElement } from '@/types/element'
import { normalizeDocument } from '@/core/document/normalizeDocument'

export interface LayerListItem {
  id: string
  name: string
  type: EkoElement['type']
  zIndex: number
  visible: boolean
  locked: boolean
  parentId: string | null
  /** Effective after hierarchy (group lock/visibility). */
  effectivelyVisible: boolean
  effectivelyLocked: boolean
  depth: number
}

/**
 * Layer Engine — domain ordering and hierarchy (not UI).
 */
export class LayerEngine {
  static listForSurface(document: EkoDocument, surfaceId?: string | null): LayerListItem[] {
    const doc = normalizeDocument(document)
    const surface =
      (surfaceId ? doc.surfaces?.find((s) => s.id === surfaceId) : doc.surfaces?.[0]) ?? null
    const byId = new Map(doc.elements.map((el) => [el.id, el]))
    const seedIds =
      surface?.elementIds.filter((id) => byId.has(id)) ?? doc.elements.map((el) => el.id)
    const ids = new Set<string>()
    const collect = (id: string) => {
      if (ids.has(id)) return
      const el = byId.get(id)
      if (!el) return
      ids.add(id)
      if (el.type === 'group') {
        for (const childId of el.properties.childIds ?? []) collect(childId)
      }
    }
    for (const id of seedIds) collect(id)
    // Compat: empty surface membership still lists root document elements.
    if (ids.size === 0) {
      for (const el of doc.elements) ids.add(el.id)
    }
    const elements = doc.elements.filter((el) => ids.has(el.id))

    const roots = elements
      .filter((el) => !el.parentId || !byId.has(el.parentId))
      .sort((a, b) => b.zIndex - a.zIndex)

    const items: LayerListItem[] = []
    const walk = (el: EkoElement, depth: number) => {
      const eff = LayerEngine.effectiveFlags(el, byId)
      items.push({
        id: el.id,
        name: el.name ?? el.slug ?? el.id,
        type: el.type,
        zIndex: el.zIndex,
        visible: el.visible,
        locked: el.locked,
        parentId: el.parentId ?? null,
        effectivelyVisible: eff.visible,
        effectivelyLocked: eff.locked,
        depth,
      })
      if (el.type === 'group') {
        const childIds = el.properties.childIds ?? []
        const children = childIds
          .map((id) => byId.get(id))
          .filter((c): c is EkoElement => Boolean(c))
          .sort((a, b) => b.zIndex - a.zIndex)
        for (const child of children) walk(child, depth + 1)
      }
    }

    for (const root of roots) walk(root, 0)
    return items
  }

  static effectiveFlags(
    element: EkoElement,
    byId: Map<string, EkoElement>,
  ): { visible: boolean; locked: boolean } {
    let visible = element.visible
    let locked = element.locked
    let parentId = element.parentId
    const guard = new Set<string>()
    while (parentId && !guard.has(parentId)) {
      guard.add(parentId)
      const parent = byId.get(parentId)
      if (!parent) break
      if (!parent.visible) visible = false
      if (parent.locked) locked = true
      parentId = parent.parentId
    }
    return { visible, locked }
  }

  static sortByZ(elements: EkoElement[], ascending = true): EkoElement[] {
    return [...elements].sort((a, b) => (ascending ? a.zIndex - b.zIndex : b.zIndex - a.zIndex))
  }

  static reorder(
    document: EkoDocument,
    elementId: string,
    mode: 'forward' | 'backward' | 'front' | 'back',
  ): EkoDocument {
    const doc = normalizeDocument(document)
    const target = doc.elements.find((el) => el.id === elementId)
    if (!target) return doc

    const siblings = doc.elements
      .filter((el) => (el.parentId ?? null) === (target.parentId ?? null))
      .sort((a, b) => a.zIndex - b.zIndex)

    const index = siblings.findIndex((el) => el.id === elementId)
    if (index < 0) return doc

    let next = [...siblings]
    const [item] = next.splice(index, 1)
    if (!item) return doc

    if (mode === 'forward' && index < siblings.length - 1) next.splice(index + 1, 0, item)
    else if (mode === 'backward' && index > 0) next.splice(index - 1, 0, item)
    else if (mode === 'front') next.push(item)
    else if (mode === 'back') next.unshift(item)
    else next.splice(index, 0, item)

    const zMap = new Map(next.map((el, i) => [el.id, i]))
    return {
      ...doc,
      metadata: { ...doc.metadata, updatedAt: new Date().toISOString() },
      elements: doc.elements.map((el) =>
        zMap.has(el.id) ? { ...el, zIndex: zMap.get(el.id)! } : el,
      ),
    }
  }

  /** Place `elementId` immediately before `beforeId` among siblings. */
  static moveBefore(document: EkoDocument, elementId: string, beforeId: string): EkoDocument {
    return LayerEngine.moveRelative(document, elementId, beforeId, 'before')
  }

  /** Place `elementId` immediately after `afterId` among siblings. */
  static moveAfter(document: EkoDocument, elementId: string, afterId: string): EkoDocument {
    return LayerEngine.moveRelative(document, elementId, afterId, 'after')
  }

  private static moveRelative(
    document: EkoDocument,
    elementId: string,
    anchorId: string,
    mode: 'before' | 'after',
  ): EkoDocument {
    const doc = normalizeDocument(document)
    const target = doc.elements.find((el) => el.id === elementId)
    const anchor = doc.elements.find((el) => el.id === anchorId)
    if (!target || !anchor) return doc
    if ((target.parentId ?? null) !== (anchor.parentId ?? null)) return doc

    const siblings = doc.elements
      .filter((el) => (el.parentId ?? null) === (target.parentId ?? null))
      .sort((a, b) => a.zIndex - b.zIndex)

    const without = siblings.filter((el) => el.id !== elementId)
    const anchorIndex = without.findIndex((el) => el.id === anchorId)
    if (anchorIndex < 0) return doc
    const insertAt = mode === 'before' ? anchorIndex : anchorIndex + 1
    const next = [...without]
    next.splice(insertAt, 0, target)
    const zMap = new Map(next.map((el, i) => [el.id, i]))
    return {
      ...doc,
      metadata: { ...doc.metadata, updatedAt: new Date().toISOString() },
      elements: doc.elements.map((el) =>
        zMap.has(el.id) ? { ...el, zIndex: zMap.get(el.id)! } : el,
      ),
    }
  }
}
