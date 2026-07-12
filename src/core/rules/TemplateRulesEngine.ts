import type { EkoDocument } from '@/types/document'
import type { EkoElement, RuleAction } from '@/types/element'
import type { RuleDecision } from '@/types/rules'

const ACTION_CONSTRAINT_MAP: Partial<Record<RuleAction, keyof NonNullable<EkoElement['constraints']>>> = {
  select: 'selectable',
  move: 'move',
  resize: 'resize',
  rotate: 'rotate',
  changeText: 'changeText',
  changeFont: 'changeFont',
  changeColor: 'changeColor',
  replaceImage: 'replaceImage',
  crop: 'crop',
  delete: 'delete',
}

function deny(reason: string): RuleDecision {
  return { allowed: false, reason }
}

function allow(): RuleDecision {
  return { allowed: true, reason: '' }
}

/**
 * Independent business-rules layer.
 * Canvas / UI must consult this before applying mutations.
 */
export class TemplateRulesEngine {
  can(element: EkoElement, action: RuleAction, document?: EkoDocument): RuleDecision {
    if (document?.type === 'template' && document.permissions.lockMaster) {
      return deny('Template master is locked; create a session to edit')
    }

    if (document && !document.permissions.canEdit && action !== 'select') {
      return deny('Document permissions deny editing')
    }

    if (element.locked && action !== 'select') {
      return deny('Element is locked')
    }

    if (!element.editable && action !== 'select') {
      return deny('Element is not editable')
    }

    if (action === 'select') {
      if (element.constraints.selectable === false) {
        return deny('Element cannot be selected')
      }
      return allow()
    }

    if (element.category === 'brand' && !element.editable) {
      return deny('Brand elements are protected')
    }

    if (action === 'delete' && document?.permissions.canDeleteElements === false) {
      return deny('Document does not allow deleting elements')
    }

    if (action === 'changeFont' && document) {
      // Font family validation happens at property update time; gate is open here if constraint allows.
    }

    const constraintKey = ACTION_CONSTRAINT_MAP[action]
    if (constraintKey && element.constraints[constraintKey] === false) {
      return deny(`Constraint denies action "${action}"`)
    }

    // Default: if constraint key is undefined, allow when editable.
    return allow()
  }

  canUseFont(document: EkoDocument, fontFamily: string): RuleDecision {
    if (!document.rules.allowedFonts.includes(fontFamily)) {
      return deny(`Font "${fontFamily}" is not allowed for this template`)
    }
    return allow()
  }

  canUseBackground(document: EkoDocument, backgroundId: string): RuleDecision {
    if (!document.rules.allowedBackgrounds.includes(backgroundId)) {
      return deny(`Background "${backgroundId}" is not allowed for this template`)
    }
    return allow()
  }
}

export const templateRulesEngine = new TemplateRulesEngine()
