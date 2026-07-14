import type { EkoDocument } from '@/types/document'
import type { EkoElement, ElementTransform, RuleAction } from '@/types/element'
import type { EditorCommand } from '@/types/history'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { commandToRuleAction } from '@/types/history'
import { TransformerEngine } from '@/core/transformer/TransformerEngine'
import { clipboardEngine } from '@/core/clipboard/ClipboardEngine'
import { LayerEngine } from '@/core/layers/LayerEngine'
import { GroupEngine } from '@/core/groups/GroupEngine'
import { PropertyEngine } from '@/core/properties/PropertyEngine'
import { getPropertySchema } from '@/core/properties/propertySchemas'
import { addBlankPage, duplicateDocumentPage } from '@/core/pages/pageMutations'
import { PageEngine } from '@/core/pages/PageEngine'
import {
  createElementFromAsset,
  defaultInsertSize,
} from '@/core/assets/createElementFromAsset'
import { getDocumentPixelSize } from '@/core/document/units'
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
      if (el.type === 'group') {
        const dx = command.x - el.transform.x
        const dy = command.y - el.transform.y
        return {
          success: true,
          document: GroupEngine.applyMoveDelta(document, el.id, dx, dy),
        }
      }
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

      const patch: Partial<ElementTransform> = {
        ...command.transform,
      }

      // Independent semantics: deny only the fields for the blocked action.
      if (patch.x !== undefined || patch.y !== undefined) {
        const check = guard(document, el, 'move')
        if (!check.ok) {
          delete patch.x
          delete patch.y
        }
      }
      if (
        patch.width !== undefined ||
        patch.height !== undefined ||
        patch.scaleX !== undefined ||
        patch.scaleY !== undefined
      ) {
        const check = guard(document, el, 'resize')
        if (!check.ok) {
          delete patch.width
          delete patch.height
          delete patch.scaleX
          delete patch.scaleY
        }
      }
      if (patch.rotation !== undefined) {
        const check = guard(document, el, 'rotate')
        if (!check.ok) {
          delete patch.rotation
        }
      }

      const keys = Object.keys(patch) as Array<keyof typeof patch>
      if (keys.length === 0) {
        return { document, success: false, reason: 'No allowed transform fields in patch' }
      }

      if (el.type === 'group') {
        const nextTransform = TransformerEngine.applyPatch(el.transform, patch)
        return {
          success: true,
          document: GroupEngine.applyTransformPatch(document, el.id, nextTransform),
        }
      }

      return {
        success: true,
        document: updateElement(document, command.elementId, (current) => {
          const prevHeight = current.transform.height
          const nextTransform = TransformerEngine.applyPatch(current.transform, patch)

          if (current.type === 'text' && patch.height !== undefined && prevHeight > 0) {
            const ratio = nextTransform.height / prevHeight
            if (Number.isFinite(ratio) && Math.abs(ratio - 1) > 0.0001) {
              const prevSize = current.properties.fontSize ?? 16
              return {
                ...current,
                transform: nextTransform,
                properties: {
                  ...current.properties,
                  fontSize: Math.max(1, Math.round(prevSize * ratio * 1000) / 1000),
                },
              }
            }
          }

          return {
            ...current,
            transform: nextTransform,
          }
        }),
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

    case 'TransformElements': {
      let next = document
      let applied = 0
      for (const item of command.transforms) {
        const result = applyCommand(next, {
          type: 'TransformElement',
          elementId: item.elementId,
          transform: item.transform,
          timestamp: command.timestamp,
        })
        if (result.success && result.document) {
          next = result.document
          applied += 1
        }
      }
      if (!applied) {
        return { document, success: false, reason: 'No transforms applied' }
      }
      return { success: true, document: next }
    }

    case 'FlipElements': {
      let next = document
      let applied = 0
      for (const elementId of command.elementIds) {
        const result = applyCommand(next, {
          type: 'FlipElement',
          elementId,
          axis: command.axis,
          timestamp: command.timestamp,
        })
        if (result.success && result.document) {
          next = result.document
          applied += 1
        }
      }
      if (!applied) {
        return { document, success: false, reason: 'No flips applied' }
      }
      return { success: true, document: next }
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

    case 'AddPage': {
      if (!document.permissions.canEdit) {
        return { document, success: false, reason: 'Document permissions deny editing' }
      }
      const result = addBlankPage(document, command.name)
      return {
        success: true,
        document: result.document,
        selectedIds: [],
        selectedId: null,
      }
    }

    case 'DuplicatePage': {
      if (!document.permissions.canEdit) {
        return { document, success: false, reason: 'Document permissions deny editing' }
      }
      const result = duplicateDocumentPage(document, command.pageId)
      if (!result) {
        return { document, success: false, reason: 'Page not found' }
      }
      return {
        success: true,
        document: result.document,
        selectedIds: [],
        selectedId: null,
      }
    }

    case 'DeletePage': {
      if (!document.permissions.canEdit) {
        return { document, success: false, reason: 'Document permissions deny editing' }
      }
      const next = PageEngine.delete(document, command.pageId)
      if (!next) {
        return {
          document,
          success: false,
          reason: 'Cannot delete page (missing or last page)',
        }
      }
      return {
        success: true,
        document: next,
        selectedIds: [],
        selectedId: null,
      }
    }

    case 'ReorderPages': {
      if (!document.permissions.canEdit) {
        return { document, success: false, reason: 'Document permissions deny editing' }
      }
      const next = PageEngine.reorder(document, command.orderedIds)
      if (!next) {
        return { document, success: false, reason: 'Invalid page order' }
      }
      return {
        success: true,
        document: next,
      }
    }

    case 'InsertAsset': {
      if (document.permissions.canAddElements === false) {
        return { document, success: false, reason: 'Document does not allow adding elements' }
      }
      if (document.rules.allowAddElements === false) {
        return { document, success: false, reason: 'Template rules deny adding elements' }
      }
      if (!document.permissions.canEdit) {
        return { document, success: false, reason: 'Document permissions deny editing' }
      }

      const surface = document.surfaces?.find((s) => s.id === command.surfaceId)
      if (!surface) {
        return { document, success: false, reason: 'Surface not found' }
      }

      const size = defaultInsertSize(command.libraryKind)
      const width = command.width ?? size.width
      const height = command.height ?? size.height
      const { widthPx, heightPx } = getDocumentPixelSize(document.canvas)
      const x = command.x ?? Math.max(0, (widthPx - width) / 2)
      const y = command.y ?? Math.max(0, (heightPx - height) / 2)

      const element = createElementFromAsset({
        assetId: command.assetId,
        libraryKind: command.libraryKind,
        sourceUri: command.sourceUri,
        name: command.name,
        mimeType: command.mimeType,
        x,
        y,
        width,
        height,
      })

      const withElements = touch(document, [...document.elements, element])
      const surfaces = (withElements.surfaces ?? []).map((s) =>
        s.id === command.surfaceId
          ? { ...s, elementIds: [...s.elementIds, element.id] }
          : s,
      )

      return {
        success: true,
        document: { ...withElements, surfaces },
        selectedIds: [element.id],
        selectedId: element.id,
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
