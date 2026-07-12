import type { EkoDocument } from '@/types/document'
import type { EkoElement } from '@/types/element'
import type { UpdatePropertyCommand } from '@/types/history'
import type { PropertyDescriptor, PropertySchemaField } from '@/types/properties'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { LayerEngine } from '@/core/layers/LayerEngine'
import { getPropertySchema } from '@/core/properties/propertySchemas'

function getPathValue(element: EkoElement, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = element
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Property Engine — domain layer for readable / updatable attributes.
 * UI never mutates JSON; it asks the engine, which yields Commands.
 */
export class PropertyEngine {
  static getDescriptors(document: EkoDocument, element: EkoElement): PropertyDescriptor[] {
    const schema = getPropertySchema(element.type)
    const byId = new Map(document.elements.map((el) => [el.id, el]))
    const effective = LayerEngine.effectiveFlags(element, byId)

    return schema.map((field) => {
      const decision = PropertyEngine.canUpdate(document, element, field)
      const lockedByHierarchy = effective.locked && field.ruleAction !== 'select'
      const editable = decision.allowed && !lockedByHierarchy

      return {
        path: field.path,
        key: field.key,
        label: field.label,
        group: field.group,
        control: field.control,
        value: getPathValue(element, field.path) ?? defaultForControl(field),
        editable,
        reason: lockedByHierarchy ? 'Element is locked by hierarchy' : decision.reason || undefined,
        ruleAction: field.ruleAction,
        min: field.min,
        max: field.max,
        step: field.step,
        options: resolveOptions(field, document),
      }
    })
  }

  static canUpdate(
    document: EkoDocument,
    element: EkoElement,
    field: PropertySchemaField,
  ): { allowed: boolean; reason: string } {
    const action = field.ruleAction ?? 'edit'
    const decision = templateRulesEngine.can(element, action, document)
    if (!decision.allowed) return decision

    if (field.path === 'properties.fontFamily' && typeof getPathValue(element, field.path) === 'string') {
      // Font allow-list checked when applying a specific new value.
    }

    return { allowed: true, reason: '' }
  }

  static createUpdateCommand(
    document: EkoDocument,
    elementId: string,
    path: string,
    newValue: unknown,
  ): { success: true; command: UpdatePropertyCommand } | { success: false; reason: string } {
    const element = document.elements.find((el) => el.id === elementId)
    if (!element) return { success: false, reason: 'Element not found' }

    const field = getPropertySchema(element.type).find((item) => item.path === path)
    if (!field) return { success: false, reason: `Unknown property path: ${path}` }

    const gate = PropertyEngine.canUpdate(document, element, field)
    if (!gate.allowed) return { success: false, reason: gate.reason }

    if (path === 'properties.fontFamily' && typeof newValue === 'string') {
      const fontCheck = templateRulesEngine.canUseFont(document, newValue)
      if (!fontCheck.allowed) return { success: false, reason: fontCheck.reason }
    }

    const oldValue = getPathValue(element, path)
    if (Object.is(oldValue, newValue)) {
      return { success: false, reason: 'Value unchanged' }
    }

    return {
      success: true,
      command: {
        type: 'UpdateProperty',
        elementId,
        path,
        oldValue,
        newValue,
        timestamp: Date.now(),
      },
    }
  }

  static groupDescriptors(descriptors: PropertyDescriptor[]): Record<string, PropertyDescriptor[]> {
    const groups: Record<string, PropertyDescriptor[]> = {
      transform: [],
      appearance: [],
      typography: [],
      content: [],
    }
    for (const descriptor of descriptors) {
      groups[descriptor.group]?.push(descriptor)
    }
    return groups
  }
}

function resolveOptions(field: PropertySchemaField, document: EkoDocument) {
  if (field.optionsFrom === 'allowedFonts') {
    return document.rules.allowedFonts.map((font) => ({ value: font, label: font }))
  }
  return field.options
}

function defaultForControl(field: PropertySchemaField): unknown {
  switch (field.control) {
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'color':
      return '#000000'
    default:
      return ''
  }
}
