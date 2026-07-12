import type { EkoDocument } from '@/types/document'
import type { EkoElement, GroupElement } from '@/types/element'
import { createId } from '@/utils/id'
import { normalizeDocument } from '@/core/document/normalizeDocument'

/**
 * Group Engine — create/ungroup and child membership (domain only).
 */
export class GroupEngine {
  static createGroup(document: EkoDocument, elementIds: string[], name = 'Group'): EkoDocument {
    const doc = normalizeDocument(document)
    const unique = [...new Set(elementIds)]
    if (unique.length < 2) return doc

    const members = unique
      .map((id) => doc.elements.find((el) => el.id === id))
      .filter((el): el is EkoElement => Boolean(el))

    if (members.length < 2) return doc

    const minX = Math.min(...members.map((el) => el.transform.x))
    const minY = Math.min(...members.map((el) => el.transform.y))
    const maxX = Math.max(...members.map((el) => el.transform.x + el.transform.width))
    const maxY = Math.max(...members.map((el) => el.transform.y + el.transform.height))
    const maxZ = Math.max(...members.map((el) => el.zIndex))

    const groupId = createId('group')
    const group: GroupElement = {
      id: groupId,
      type: 'group',
      category: 'customer',
      name,
      visible: true,
      locked: false,
      editable: true,
      zIndex: maxZ + 1,
      parentId: null,
      surfaceId: members[0]?.surfaceId ?? null,
      transform: {
        x: minX,
        y: minY,
        width: Math.max(8, maxX - minX),
        height: Math.max(8, maxY - minY),
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      metadata: {},
      constraints: {
        selectable: true,
        move: true,
        resize: true,
        rotate: true,
        delete: true,
      },
      properties: { childIds: members.map((el) => el.id) },
    }

    const memberIds = new Set(members.map((el) => el.id))
    const elements = doc.elements.map((el) =>
      memberIds.has(el.id) ? { ...el, parentId: groupId } : el,
    )
    elements.push(group)

    const surfaces = (doc.surfaces ?? []).map((surface) => ({
      ...surface,
      elementIds: [
        ...surface.elementIds.filter((id) => !memberIds.has(id)),
        ...(surface.elementIds.some((id) => memberIds.has(id)) ? [groupId] : []),
      ],
    }))

    // Ensure group attached to first surface if none claimed it.
    if (!surfaces.some((s) => s.elementIds.includes(groupId)) && surfaces[0]) {
      surfaces[0] = {
        ...surfaces[0],
        elementIds: [...surfaces[0].elementIds, groupId],
      }
    }

    return {
      ...doc,
      metadata: { ...doc.metadata, updatedAt: new Date().toISOString() },
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
}
