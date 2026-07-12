import type { EkoDocument } from '@/types/document'
import type { EkoElement, RuleAction } from '@/types/element'
import type { EditorCommand } from '@/types/history'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { commandToRuleAction } from '@/types/history'
import { TransformerEngine } from '@/core/transformer/TransformerEngine'
import { clipboardEngine } from '@/core/clipboard/ClipboardEngine'
import { LayerEngine } from '@/core/layers/LayerEngine'
import { GroupEngine } from '@/core/groups/GroupEngine'
import { PropertyEngine } from '@/core/properties/PropertyEngine'
import { getPropertySchema } from '@/core/properties/propertySchemas'
import { createId } from '@/utils/id'

function updateElement(
  document: EkoDocument,
  elementId: string,
  updater: (el: EkoElement) => EkoElement,
): EkoDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      updatedAt: new Date().toISOString(),
    },
    elements: document.elements.map((el) => (el.id === elementId ? updater(el) : el)),
  }
}

function touch(document: EkoDocument, elements: EkoElement[]): EkoDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      updatedAt: new Date().toISOString(),
    },
    elements,
  }
}

function findElement(document: EkoDocument, elementId: string): EkoElement | undefined {
  return document.elements.find((el) => el.id === elementId)
}

function guard(
  document: EkoDocument,
  element: EkoElement,
  action: RuleAction,
): { ok: true } | { ok: false; reason: string } {
  const decision = templateRulesEngine.can(element, action, document)
  return decision.allowed ? { ok: true } : { ok: false, reason: decision.reason }
}

/**
 * Applies typed editor commands against an EkoDocument.
 * Returns a new document when mutation succeeds.
 */
export function applyCommand(
  document: EkoDocument,
  command: EditorCommand,
): {
  document: EkoDocument
  success: boolean
  reason?: string
  selectedId?: string | null
  selectedIds?: string[]
} {
  switch (command.type) {
    case 'LoadDocument':
      return { document: command.document, success: true, selectedId: null, selectedIds: [] }

    case 'SelectElement': {
      if (!command.elementId) {
        return { document, success: true, selectedId: null, selectedIds: [] }
      }
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }
      const check = guard(document, el, 'select')
      if (!check.ok) return { document, success: false, reason: check.reason }
      return {
        document,
        success: true,
        selectedId: command.elementId,
        selectedIds: [command.elementId],
      }
    }

    case 'SelectElements': {
      const ids: string[] = []
      for (const id of command.elementIds) {
        const el = findElement(document, id)
        if (!el) continue
        const check = guard(document, el, 'select')
        if (check.ok) ids.push(id)
      }
      return {
        document,
        success: true,
        selectedIds: ids,
        selectedId: ids.length ? ids[ids.length - 1]! : null,
      }
    }

    case 'MoveElement': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }
      const check = guard(document, el, 'move')
      if (!check.ok) return { document, success: false, reason: check.reason }
      return {
        success: true,
        document: updateElement(document, command.elementId, (current) => ({
          ...current,
          transform: { ...current.transform, x: command.x, y: command.y },
        })),
      }
    }

    case 'MoveElements': {
      let next = document
      for (const move of command.moves) {
        const el = findElement(next, move.elementId)
        if (!el) return { document, success: false, reason: `Element not found: ${move.elementId}` }
        const check = guard(next, el, 'move')
        if (!check.ok) return { document, success: false, reason: check.reason }
        next = updateElement(next, move.elementId, (current) => ({
          ...current,
          transform: { ...current.transform, x: move.x, y: move.y },
        }))
      }
      return { success: true, document: next }
    }

    case 'ResizeElement': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }
      const check = guard(document, el, 'resize')
      if (!check.ok) return { document, success: false, reason: check.reason }
      return {
        success: true,
        document: updateElement(document, command.elementId, (current) => ({
          ...current,
          transform: {
            ...current.transform,
            width: command.width,
            height: command.height,
            x: command.x ?? current.transform.x,
            y: command.y ?? current.transform.y,
            scaleX: command.scaleX ?? current.transform.scaleX,
            scaleY: command.scaleY ?? current.transform.scaleY,
          },
        })),
      }
    }

    case 'RotateElement': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }
      const check = guard(document, el, 'rotate')
      if (!check.ok) return { document, success: false, reason: check.reason }
      return {
        success: true,
        document: updateElement(document, command.elementId, (current) => ({
          ...current,
          transform: { ...current.transform, rotation: command.rotation },
        })),
      }
    }

    case 'TransformElement': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }

      const needsMove =
        command.transform.x !== undefined || command.transform.y !== undefined
      const needsResize =
        command.transform.width !== undefined ||
        command.transform.height !== undefined ||
        command.transform.scaleX !== undefined ||
        command.transform.scaleY !== undefined
      const needsRotate = command.transform.rotation !== undefined

      if (needsMove) {
        const check = guard(document, el, 'move')
        if (!check.ok) return { document, success: false, reason: check.reason }
      }
      if (needsResize) {
        const check = guard(document, el, 'resize')
        if (!check.ok) return { document, success: false, reason: check.reason }
      }
      if (needsRotate) {
        const check = guard(document, el, 'rotate')
        if (!check.ok) return { document, success: false, reason: check.reason }
      }

      return {
        success: true,
        document: updateElement(document, command.elementId, (current) => ({
          ...current,
          transform: TransformerEngine.applyPatch(current.transform, command.transform),
        })),
      }
    }

    case 'FlipElement': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }
      const check = guard(document, el, 'resize')
      if (!check.ok) return { document, success: false, reason: check.reason }
      return {
        success: true,
        document: updateElement(document, command.elementId, (current) => ({
          ...current,
          transform:
            command.axis === 'horizontal'
              ? TransformerEngine.flipHorizontal(current.transform)
              : TransformerEngine.flipVertical(current.transform),
        })),
      }
    }

    case 'UpdateElementProperties': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }

      const action = commandToRuleAction(command) ?? 'edit'
      const check = guard(document, el, action)
      if (!check.ok) return { document, success: false, reason: check.reason }

      if ('fontFamily' in command.properties && typeof command.properties.fontFamily === 'string') {
        const fontCheck = templateRulesEngine.canUseFont(document, command.properties.fontFamily)
        if (!fontCheck.allowed) {
          return { document, success: false, reason: fontCheck.reason }
        }
        const fontConstraint = templateRulesEngine.can(el, 'changeFont', document)
        if (!fontConstraint.allowed) {
          return { document, success: false, reason: fontConstraint.reason }
        }
      }

      if ('text' in command.properties) {
        const textCheck = templateRulesEngine.can(el, 'changeText', document)
        if (!textCheck.allowed) return { document, success: false, reason: textCheck.reason }
      }

      if ('fill' in command.properties) {
        const colorCheck = templateRulesEngine.can(el, 'changeColor', document)
        if (!colorCheck.allowed) return { document, success: false, reason: colorCheck.reason }
      }

      return {
        success: true,
        document: updateElement(document, command.elementId, (current) => {
          const next = {
            ...current,
            properties: {
              ...(current.properties as Record<string, unknown>),
              ...command.properties,
            },
          }
          return next as EkoElement
        }),
      }
    }

    case 'UpdateProperty': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }

      const field = getPropertySchema(el.type).find((item) => item.path === command.path)
      if (!field) return { document, success: false, reason: `Unknown property path: ${command.path}` }

      const gate = PropertyEngine.canUpdate(document, el, field)
      if (!gate.allowed) return { document, success: false, reason: gate.reason }

      if (command.path === 'properties.fontFamily' && typeof command.newValue === 'string') {
        const fontCheck = templateRulesEngine.canUseFont(document, command.newValue)
        if (!fontCheck.allowed) return { document, success: false, reason: fontCheck.reason }
      }

      if (command.path.startsWith('transform.')) {
        const key = command.path.slice('transform.'.length) as
          | 'x'
          | 'y'
          | 'width'
          | 'height'
          | 'rotation'
          | 'scaleX'
          | 'scaleY'
        const patch = { [key]: command.newValue as number }
        if (key === 'x' || key === 'y') {
          const check = guard(document, el, 'move')
          if (!check.ok) return { document, success: false, reason: check.reason }
        } else if (key === 'width' || key === 'height' || key === 'scaleX' || key === 'scaleY') {
          const check = guard(document, el, 'resize')
          if (!check.ok) return { document, success: false, reason: check.reason }
        } else if (key === 'rotation') {
          const check = guard(document, el, 'rotate')
          if (!check.ok) return { document, success: false, reason: check.reason }
        }
        return {
          success: true,
          document: updateElement(document, command.elementId, (current) => ({
            ...current,
            transform: TransformerEngine.applyPatch(current.transform, patch),
          })),
        }
      }

      if (command.path.startsWith('properties.')) {
        const key = command.path.slice('properties.'.length)
        return applyCommand(document, {
          type: 'UpdateElementProperties',
          elementId: command.elementId,
          properties: { [key]: command.newValue },
          timestamp: command.timestamp,
        })
      }

      return { document, success: false, reason: `Unsupported property path: ${command.path}` }
    }

    case 'SetVisibility': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }
      return {
        success: true,
        document: updateElement(document, command.elementId, (current) => ({
          ...current,
          visible: command.visible,
        })),
      }
    }

    case 'SetLocked': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }
      return {
        success: true,
        document: updateElement(document, command.elementId, (current) => ({
          ...current,
          locked: command.locked,
        })),
      }
    }

    case 'DeleteElements': {
      if (document.permissions.canDeleteElements === false) {
        return { document, success: false, reason: 'Document does not allow deleting elements' }
      }
      if (document.rules.allowDeleteElements === false) {
        return { document, success: false, reason: 'Template rules deny deleting elements' }
      }

      for (const id of command.elementIds) {
        const el = findElement(document, id)
        if (!el) return { document, success: false, reason: `Element not found: ${id}` }
        const check = guard(document, el, 'delete')
        if (!check.ok) return { document, success: false, reason: check.reason }
      }

      const remove = new Set(command.elementIds)
      const remaining = document.elements.filter((el) => !remove.has(el.id))
      const surfaces = document.surfaces?.map((surface) => ({
        ...surface,
        elementIds: surface.elementIds.filter((id) => !remove.has(id)),
      }))
      return {
        success: true,
        document: {
          ...touch(document, remaining),
          ...(surfaces ? { surfaces } : {}),
        },
        selectedIds: [],
        selectedId: null,
      }
    }

    case 'AddElements': {
      if (document.permissions.canAddElements === false) {
        return { document, success: false, reason: 'Document does not allow adding elements' }
      }
      if (document.rules.allowAddElements === false) {
        return { document, success: false, reason: 'Template rules deny adding elements' }
      }
      if (!document.permissions.canEdit) {
        return { document, success: false, reason: 'Document permissions deny editing' }
      }

      const withIds = command.elements.map((el) =>
        el.id ? el : ({ ...el, id: createId(el.type) } as EkoElement),
      )
      const ids = withIds.map((el) => el.id)
      const withElements = touch(document, [...document.elements, ...withIds])
      const surfaces = withElements.surfaces?.length
        ? withElements.surfaces.map((surface, index) =>
            index === 0
              ? { ...surface, elementIds: [...surface.elementIds, ...ids] }
              : surface,
          )
        : withElements.surfaces
      return {
        success: true,
        document: surfaces ? { ...withElements, surfaces } : withElements,
        selectedIds: ids,
        selectedId: ids.length ? ids[ids.length - 1]! : null,
      }
    }

    case 'DuplicateElements': {
      if (document.permissions.canAddElements === false) {
        return { document, success: false, reason: 'Document does not allow adding elements' }
      }
      if (document.rules.allowAddElements === false) {
        return { document, success: false, reason: 'Template rules deny adding elements' }
      }

      const sources: EkoElement[] = []
      for (const id of command.elementIds) {
        const el = findElement(document, id)
        if (!el) return { document, success: false, reason: `Element not found: ${id}` }
        const selectCheck = guard(document, el, 'select')
        if (!selectCheck.ok) return { document, success: false, reason: selectCheck.reason }
        sources.push(el)
      }

      const clones = clipboardEngine.duplicate(sources, {
        x: command.offsetX ?? 24,
        y: command.offsetY ?? 24,
      })
      const ids = clones.map((el) => el.id)
      const withElements = touch(document, [...document.elements, ...clones])
      const surfaces = withElements.surfaces?.length
        ? withElements.surfaces.map((surface, index) =>
            index === 0
              ? { ...surface, elementIds: [...surface.elementIds, ...ids] }
              : surface,
          )
        : withElements.surfaces
      return {
        success: true,
        document: surfaces ? { ...withElements, surfaces } : withElements,
        selectedIds: ids,
        selectedId: ids.length ? ids[ids.length - 1]! : null,
      }
    }

    case 'BringForward':
    case 'SendBackward':
    case 'BringToFront':
    case 'SendToBack': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }
      if (!document.permissions.canEdit) {
        return { document, success: false, reason: 'Document permissions deny editing' }
      }
      const mode =
        command.type === 'BringForward'
          ? 'forward'
          : command.type === 'SendBackward'
            ? 'backward'
            : command.type === 'BringToFront'
              ? 'front'
              : 'back'
      return { success: true, document: LayerEngine.reorder(document, command.elementId, mode) }
    }

    case 'MoveToParent': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }
      if (!document.permissions.canEdit) {
        return { document, success: false, reason: 'Document permissions deny editing' }
      }
      if (command.parentId) {
        const parent = findElement(document, command.parentId)
        if (!parent || parent.type !== 'group') {
          return { document, success: false, reason: 'Parent must be a group' }
        }
        return {
          success: true,
          document: GroupEngine.addChild(document, command.parentId, command.elementId),
          selectedIds: [command.elementId],
          selectedId: command.elementId,
        }
      }
      if (el.parentId) {
        return {
          success: true,
          document: GroupEngine.removeChild(document, el.parentId, command.elementId),
          selectedIds: [command.elementId],
          selectedId: command.elementId,
        }
      }
      return { success: true, document }
    }

    case 'MoveToSurface': {
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }
      const surface = document.surfaces?.find((s) => s.id === command.surfaceId)
      if (!surface) return { document, success: false, reason: 'Surface not found' }
      if (!document.permissions.canEdit) {
        return { document, success: false, reason: 'Document permissions deny editing' }
      }

      const surfaces = (document.surfaces ?? []).map((s) => ({
        ...s,
        elementIds:
          s.id === command.surfaceId
            ? [...new Set([...s.elementIds, command.elementId])]
            : s.elementIds.filter((id) => id !== command.elementId),
      }))

      return {
        success: true,
        document: {
          ...document,
          metadata: { ...document.metadata, updatedAt: new Date().toISOString() },
          surfaces,
          elements: document.elements.map((item) =>
            item.id === command.elementId
              ? { ...item, surfaceId: command.surfaceId, parentId: null }
              : item,
          ),
        },
        selectedIds: [command.elementId],
        selectedId: command.elementId,
      }
    }

    case 'GroupElements': {
      if (!document.permissions.canEdit) {
        return { document, success: false, reason: 'Document permissions deny editing' }
      }
      const next = GroupEngine.createGroup(document, command.elementIds, command.name)
      const group = next.elements.find((el) => el.type === 'group' && !document.elements.some((d) => d.id === el.id))
      return {
        success: true,
        document: next,
        selectedIds: group ? [group.id] : command.elementIds,
        selectedId: group?.id ?? command.elementIds[0] ?? null,
      }
    }

    case 'UngroupElements': {
      if (!document.permissions.canEdit) {
        return { document, success: false, reason: 'Document permissions deny editing' }
      }
      const group = findElement(document, command.groupId)
      if (!group || group.type !== 'group') {
        return { document, success: false, reason: 'Group not found' }
      }
      const childIds = [...group.properties.childIds]
      return {
        success: true,
        document: GroupEngine.ungroup(document, command.groupId),
        selectedIds: childIds,
        selectedId: childIds[0] ?? null,
      }
    }

    default:
      return { document, success: false, reason: 'Unknown command' }
  }
}

export function createCommand(command: EditorCommand): EditorCommand {
  return {
    ...command,
    timestamp: command.timestamp ?? Date.now(),
  }
}

/** Build a command with automatic timestamp. */
export function cmd(command: EditorCommand): EditorCommand {
  return createCommand({
    ...command,
    timestamp: command.timestamp ?? Date.now(),
  })
}
