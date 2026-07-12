import type { RuleAction } from './element'

export type PropertyGroupId = 'transform' | 'appearance' | 'typography' | 'content'

export type PropertyControlType =
  | 'string'
  | 'number'
  | 'color'
  | 'boolean'
  | 'select'
  | 'textarea'

export interface PropertyOption {
  value: string | number
  label: string
}

export interface PropertyDescriptor {
  /** Dot path: properties.text | transform.x | visible */
  path: string
  key: string
  label: string
  group: PropertyGroupId
  control: PropertyControlType
  value: unknown
  editable: boolean
  reason?: string
  ruleAction?: RuleAction
  min?: number
  max?: number
  step?: number
  options?: PropertyOption[]
}

export interface PropertyGroupDefinition {
  id: PropertyGroupId
  label: string
}

export const PROPERTY_GROUPS: PropertyGroupDefinition[] = [
  { id: 'transform', label: 'Transform' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'typography', label: 'Typography' },
  { id: 'content', label: 'Content' },
]

export interface PropertySchemaField {
  path: string
  key: string
  label: string
  group: PropertyGroupId
  control: PropertyControlType
  ruleAction?: RuleAction
  min?: number
  max?: number
  step?: number
  options?: PropertyOption[]
  /** Resolve options dynamically (e.g. allowed fonts). */
  optionsFrom?: 'allowedFonts'
}
