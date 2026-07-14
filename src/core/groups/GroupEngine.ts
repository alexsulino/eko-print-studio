import type { EkoDocument } from '@/types/document'
import type { EkoElement, ElementTransform, GroupElement } from '@/types/element'
import { createId } from '@/utils/id'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { NamingEngine } from '@/core/objects/NamingEngine'
import { migrateElement } from '@/core/objects/migrateElement'

export interface GroupBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Group Engine — create/ungroup, nested membership, bounds, transform propagation.
 * Groups behave as objects: moving/resizing a group deltas its descendants.
 */
export class GroupEngine {
  static createGroup(document: EkoDocument, elementIds: string[], name?: string): EkoDocument {
    const doc = normalizeDocument(document)
    const unique = [...new Set(elementIds)]
    if (unique.length < 2) return doc

    const members = unique
      .map((id) => doc.elements.find((el) => el.id === id))
      .filter((el): el is EkoElement => Boolean(el))

    if (members.length < 2) return doc

    const bounds = GroupEngine.boundsOf(members)
    if (!bounds) return doc
    const maxZ = Math.max(...members.map((el) => el.zIndex))
    const ts = new Date().toISOString()

    const groupId = createId('group')
    const groupName = name ?? NamingEngine.nextName(doc.elements, 'Group')
    const group: GroupElement = migrateElement({
      id: groupId,
      type: 'group',
      category: 'customer',
      name: groupName,
      visible: true,
      locked: false,
      selectable: true,
      editable: true,
      zIndex: maxZ + 1,
      parentId: null,
      surfaceId: members[0]?.surfaceId ?? null,
      pageId: members[0]?.pageId ?? null,
      createdAt: ts,
      updatedAt: ts,
      transform: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        originX: 0,
        originY: 0,
      },
      appearance: { opacity: 1 },
      layout: { constraints: [] },
      metadata: { createdAt: ts, updatedAt: ts },
      constraints: {
        selectable: true,
        move: true,
        resize: true,
        rotate: true,
        delete: true,
        group: true,
      },
      properties: { childIds: members.map((el) => el.id) },
    }) as GroupElement

    const memberIds = new Set(members.map((el) => el.id))
    const elements = doc.elements.map((el) =>
      memberIds.has(el.id) ? { ...el, parentId: groupId, updatedAt: ts } : el,
    )
    elements.push(group)

    const surfaces = (doc.surfaces ?? []).map((surface) => ({
      ...surface,
      elementIds: [
        ...surface.elementIds.filter((id) => !memberIds.has(id)),
        ...(surface.elementIds.some((id) => memberIds.has(id)) ? [groupId] : []),
      ],
    }))

    if (!surfaces.some((s) => s.elementIds.includes(groupId)) && surfaces[0]) {
      surfaces[0] = {
        ...surfaces[0],
        elementIds: [...surfaces[0].elementIds, groupId],
      }
    }

    return {
      ...doc,
      metadata: { ...doc.metadata, updatedAt: ts },
      elements,
      surfaces,
    }
  }

  static ungroup(document: EkoDocument, groupId: string): EkoDocument {
    const doc = normalizeDocument(document)
    const group = doc.elements.find((el) => el.id === groupId)
    if (!group || group.type !== 'group') return doc

    const childIds = new Set(group.properties.childIds)
    const elements = doc.elements
      .filter((el) => el.id !== groupId)
      .map((el) => (childIds.has(el.id) ? { ...el, parentId: null } : el))

    const surfaces = (doc.surfaces ?? []).map((surface) => {
      const withoutGroup = surface.elementIds.filter((id) => id !== groupId)
      if (surface.elementIds.includes(groupId)) {
        return { ...surface, elementIds: [...withoutGroup, ...childIds] }
      }
      return { ...surface, elementIds: withoutGroup }
    })

    return {
      ...doc,
      metadata: { ...doc.metadata, updatedAt: new Date().toISOString() },
      elements,
      surfaces,
    }
  }

  static addChild(document: EkoDocument, groupId: string, elementId: string): EkoDocument {
    const doc = normalizeDocument(document)
    const group = doc.elements.find((el) => el.id === groupId)
    if (!group || group.type !== 'group') return doc
    if (group.properties.childIds.includes(elementId)) return doc

    return {
      ...doc,
      metadata: { ...doc.metadata, updatedAt: new Date().toISOString() },
      elements: doc.elements.map((el) => {
        if (el.id === groupId && el.type === 'group') {
          return {
            ...el,
            properties: { childIds: [...el.properties.childIds, elementId] },
          }
        }
        if (el.id === elementId) return { ...el, parentId: groupId }
        return el
      }),
    }
  }

  static removeChild(document: EkoDocument, groupId: string, elementId: string): EkoDocument {
    const doc = normalizeDocument(document)
    return {
      ...doc,
      metadata: { ...doc.metadata, updatedAt: new Date().toISOString() },
      elements: doc.elements.map((el) => {
        if (el.id === groupId && el.type === 'group') {
          return {
            ...el,
            properties: {
              childIds: el.properties.childIds.filter((id) => id !== elementId),
            },
          }
        }
        if (el.id === elementId && el.parentId === groupId) {
          return { ...el, parentId: null }
        }
        return el
      }),
    }
  }

  static boundsOf(elements: EkoElement[]): GroupBounds | null {
    if (!elements.length) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const el of elements) {
      const w = Math.abs(el.transform.width * el.transform.scaleX)
      const h = Math.abs(el.transform.height * el.transform.scaleY)
      minX = Math.min(minX, el.transform.x)
      minY = Math.min(minY, el.transform.y)
      maxX = Math.max(maxX, el.transform.x + w)
      maxY = Math.max(maxY, el.transform.y + h)
    }
    return {
      x: minX,
      y: minY,
      width: Math.max(8, maxX - minX),
      height: Math.max(8, maxY - minY),
    }
  }

  static getDescendantIds(document: EkoDocument, groupId: string): string[] {
    const byId = new Map(document.elements.map((el) => [el.id, el]))
    const out: string[] = []
    const visit = (id: string) => {
      const el = byId.get(id)
      if (!el || el.type !== 'group') return
      for (const childId of el.properties.childIds) {
        out.push(childId)
        visit(childId)
      }
    }
    visit(groupId)
    return out
  }

  /**
   * Apply a translation delta to a group and all nested children (selection propagation).
   */
  static applyMoveDelta(document: EkoDocument, groupId: string, dx: number, dy: number): EkoDocument {
    if (dx === 0 && dy === 0) return document
    const ids = new Set([groupId, ...GroupEngine.getDescendantIds(document, groupId)])
    const ts = new Date().toISOString()
    return {
      ...document,
      metadata: { ...document.metadata, updatedAt: ts },
      elements: document.elements.map((el) => {
        if (!ids.has(el.id)) return el
        return {
          ...el,
          updatedAt: ts,
          transform: {
            ...el.transform,
            x: el.transform.x + dx,
            y: el.transform.y + dy,
          },
        }
      }),
    }
  }

  /**
   * Recompute group AABB from children (after child edits).
   */
  static recomputeBounds(document: EkoDocument, groupId: string): EkoDocument {
    const group = document.elements.find((el) => el.id === groupId)
    if (!group || group.type !== 'group') return document
    const children = group.properties.childIds
      .map((id) => document.elements.find((el) => el.id === id))
      .filter((el): el is EkoElement => Boolean(el))
    const bounds = GroupEngine.boundsOf(children)
    if (!bounds) return document
    return {
      ...document,
      elements: document.elements.map((el) =>
        el.id === groupId
          ? {
              ...el,
              transform: {
                ...el.transform,
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
              },
            }
          : el,
      ),
    }
  }

  static isGroup(element: EkoElement): element is GroupElement {
    return element.type === 'group'
  }

  /** Scale children relative to group origin when group size changes. */
  static applyTransformPatch(
    document: EkoDocument,
    groupId: string,
    nextTransform: ElementTransform,
  ): EkoDocument {
    const group = document.elements.find((el) => el.id === groupId)
    if (!group || group.type !== 'group') return document

    const prev = group.transform
    const sx = prev.width > 0 ? nextTransform.width / prev.width : 1
    const sy = prev.height > 0 ? nextTransform.height / prev.height : 1
    const childIds = new Set(GroupEngine.getDescendantIds(document, groupId))
    const ts = new Date().toISOString()

    return {
      ...document,
      metadata: { ...document.metadata, updatedAt: ts },
      elements: document.elements.map((el) => {
        if (el.id === groupId) {
          return { ...el, transform: { ...nextTransform }, updatedAt: ts }
        }
        if (!childIds.has(el.id)) return el
        const relX = el.transform.x - prev.x
        const relY = el.transform.y - prev.y
        return {
          ...el,
          updatedAt: ts,
          transform: {
            ...el.transform,
            x: nextTransform.x + relX * sx,
            y: nextTransform.y + relY * sy,
            width: el.transform.width * sx,
            height: el.transform.height * sy,
            rotation: el.transform.rotation + (nextTransform.rotation - prev.rotation),
          },
        }
      }),
    }
  }
}
