import type { EkoDocument } from '@/types/document'
import type { EkoElement } from '@/types/element'
import type { UpdatePropertyCommand } from '@/types/history'
import type { PropertyDescriptor, PropertySchemaField } from '@/types/properties'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { LayerEngine } from '@/core/layers/LayerEngine'
import { getPropertySchema } from '@/core/properties/propertySchemas'
import { objectRegistry } from '@/core/registry/ObjectRegistry'
import { migrateElement } from '@/core/objects/migrateElement'

function getPathValue(element: EkoElement, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = element
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function setPathValue(element: EkoElement, path: string, value: unknown): EkoElement {
  const parts = path.split('.')
  if (parts.length === 1) {
    return { ...element, [parts[0]!]: value } as EkoElement
  }
  const root = parts[0]!
  const rest = parts.slice(1)
  const currentRoot = { ...((element as unknown as Record<string, unknown>)[root] as object) }
  let cursor: Record<string, unknown> = currentRoot as Record<string, unknown>
  for (let i = 0; i < rest.length - 1; i++) {
    const key = rest[i]!
    cursor[key] = { ...(cursor[key] as object) }
    cursor = cursor[key] as Record<string, unknown>
  }
  cursor[rest[rest.length - 1]!] = value
  return { ...element, [root]: currentRoot } as EkoElement
}

/**
 * Property Engine — central read / write / validate / patch / merge / migrate.
 * UI never mutates JSON; it asks the engine, which yields Commands.
 */
export class PropertyEngine {
  static getValue(element: EkoElement, path: string): unknown {
    return getPathValue(element, path)
  }

  static getSchema(element: EkoElement): PropertySchemaField[] {
    const fromRegistry = objectRegistry.get(element.type)?.propertySchema
    if (fromRegistry?.length) return fromRegistry
    return getPropertySchema(element.type)
  }

  static getDescriptors(document: EkoDocument, element: EkoElement): PropertyDescriptor[] {
    const schema = PropertyEngine.getSchema(element)
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

    const field = PropertyEngine.getSchema(element).find((item) => item.path === path)
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

  /** Apply a path map onto an element (no rules) — used by migrate / defaults. */
  static patch(element: EkoElement, patch: Record<string, unknown>): EkoElement {
    let next = element
    for (const [path, value] of Object.entries(patch)) {
      next = setPathValue(next, path, value)
    }
    const ts = new Date().toISOString()
    return {
      ...next,
      updatedAt: ts,
      metadata: { ...next.metadata, updatedAt: ts },
    }
  }

  /** Merge registry defaults under existing element without wiping user values. */
  static mergeDefaults(element: EkoElement): EkoElement {
    const factory = objectRegistry.create(element.type)
    if (!factory) return PropertyEngine.migrateElement(element)
    const merged = {
      ...factory,
      ...element,
      transform: { ...factory.transform, ...element.transform },
      appearance: { ...factory.appearance, ...element.appearance },
      layout: { ...factory.layout, ...element.layout },
      constraints: { ...factory.constraints, ...element.constraints },
      metadata: { ...factory.metadata, ...element.metadata },
      properties: {
        ...(factory.properties as Record<string, unknown>),
        ...(element.properties as Record<string, unknown>),
      },
    } as EkoElement
    return PropertyEngine.migrateElement(merged)
  }

  static migrateElement(element: EkoElement): EkoElement {
    return migrateElement(element)
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

  /** Sanitize properties via registry before command apply. */
  static sanitizeProperties(
    document: EkoDocument,
    element: EkoElement,
    properties: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitize = objectRegistry.get(element.type)?.sanitizeProperties
    return sanitize ? sanitize(properties, document) : properties
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
