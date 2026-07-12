import type { EkoDocument } from '@/types/document'
import type { EkoElement, RuleAction } from '@/types/element'
import type { EditorCommand } from '@/types/history'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { commandToRuleAction } from '@/types/history'

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
): { document: EkoDocument; success: boolean; reason?: string; selectedId?: string | null } {
  switch (command.type) {
    case 'LoadDocument':
      return { document: command.document, success: true, selectedId: null }

    case 'SelectElement': {
      if (!command.elementId) {
        return { document, success: true, selectedId: null }
      }
      const el = findElement(document, command.elementId)
      if (!el) return { document, success: false, reason: 'Element not found' }
      const check = guard(document, el, 'select')
      if (!check.ok) return { document, success: false, reason: check.reason }
      return { document, success: true, selectedId: command.elementId }
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
            scaleX: command.scaleX ?? 1,
            scaleY: command.scaleY ?? 1,
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
