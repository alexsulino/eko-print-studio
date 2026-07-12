import type { ElementType } from '@/types/element'
import type { PropertySchemaField } from '@/types/properties'

const TRANSFORM_FIELDS: PropertySchemaField[] = [
  { path: 'transform.x', key: 'x', label: 'X', group: 'transform', control: 'number', ruleAction: 'move', step: 1 },
  { path: 'transform.y', key: 'y', label: 'Y', group: 'transform', control: 'number', ruleAction: 'move', step: 1 },
  {
    path: 'transform.width',
    key: 'width',
    label: 'Width',
    group: 'transform',
    control: 'number',
    ruleAction: 'resize',
    min: 8,
    step: 1,
  },
  {
    path: 'transform.height',
    key: 'height',
    label: 'Height',
    group: 'transform',
    control: 'number',
    ruleAction: 'resize',
    min: 8,
    step: 1,
  },
  {
    path: 'transform.rotation',
    key: 'rotation',
    label: 'Rotation',
    group: 'transform',
    control: 'number',
    ruleAction: 'rotate',
    step: 1,
  },
]

export const TEXT_PROPERTY_SCHEMA: PropertySchemaField[] = [
  ...TRANSFORM_FIELDS,
  {
    path: 'properties.text',
    key: 'text',
    label: 'Text',
    group: 'content',
    control: 'textarea',
    ruleAction: 'changeText',
  },
  {
    path: 'properties.fontFamily',
    key: 'fontFamily',
    label: 'Font',
    group: 'typography',
    control: 'select',
    ruleAction: 'changeFont',
    optionsFrom: 'allowedFonts',
  },
  {
    path: 'properties.fontSize',
    key: 'fontSize',
    label: 'Size',
    group: 'typography',
    control: 'number',
    ruleAction: 'edit',
    min: 8,
    step: 1,
  },
  {
    path: 'properties.fill',
    key: 'fill',
    label: 'Color',
    group: 'appearance',
    control: 'color',
    ruleAction: 'changeColor',
  },
  {
    path: 'properties.align',
    key: 'align',
    label: 'Alignment',
    group: 'typography',
    control: 'select',
    ruleAction: 'edit',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
    ],
  },
  {
    path: 'properties.lineHeight',
    key: 'lineHeight',
    label: 'Line height',
    group: 'typography',
    control: 'number',
    ruleAction: 'edit',
    min: 0.5,
    step: 0.1,
  },
  {
    path: 'properties.letterSpacing',
    key: 'letterSpacing',
    label: 'Letter spacing',
    group: 'typography',
    control: 'number',
    ruleAction: 'edit',
    step: 0.5,
  },
]

export const IMAGE_PROPERTY_SCHEMA: PropertySchemaField[] = [
  ...TRANSFORM_FIELDS,
  {
    path: 'properties.src',
    key: 'src',
    label: 'Source',
    group: 'content',
    control: 'string',
    ruleAction: 'replaceImage',
  },
  {
    path: 'properties.opacity',
    key: 'opacity',
    label: 'Opacity',
    group: 'appearance',
    control: 'number',
    ruleAction: 'edit',
    min: 0,
    max: 1,
    step: 0.05,
  },
]

export const SHAPE_PROPERTY_SCHEMA: PropertySchemaField[] = [
  ...TRANSFORM_FIELDS,
  {
    path: 'properties.fill',
    key: 'fill',
    label: 'Fill',
    group: 'appearance',
    control: 'color',
    ruleAction: 'changeColor',
  },
  {
    path: 'properties.stroke',
    key: 'stroke',
    label: 'Stroke',
    group: 'appearance',
    control: 'color',
    ruleAction: 'changeColor',
  },
  {
    path: 'properties.strokeWidth',
    key: 'strokeWidth',
    label: 'Stroke width',
    group: 'appearance',
    control: 'number',
    ruleAction: 'edit',
    min: 0,
    step: 1,
  },
  {
    path: 'properties.cornerRadius',
    key: 'cornerRadius',
    label: 'Radius',
    group: 'appearance',
    control: 'number',
    ruleAction: 'edit',
    min: 0,
    step: 1,
  },
  {
    path: 'properties.opacity',
    key: 'opacity',
    label: 'Opacity',
    group: 'appearance',
    control: 'number',
    ruleAction: 'edit',
    min: 0,
    max: 1,
    step: 0.05,
  },
]

export const VARIABLE_PROPERTY_SCHEMA: PropertySchemaField[] = [
  ...TRANSFORM_FIELDS,
  {
    path: 'properties.key',
    key: 'key',
    label: 'Variable key',
    group: 'content',
    control: 'string',
    ruleAction: 'edit',
  },
  {
    path: 'properties.label',
    key: 'label',
    label: 'Label',
    group: 'content',
    control: 'string',
    ruleAction: 'edit',
  },
  {
    path: 'properties.fallback',
    key: 'fallback',
    label: 'Fallback',
    group: 'content',
    control: 'string',
    ruleAction: 'edit',
  },
]

const SCHEMA_BY_TYPE: Partial<Record<ElementType, PropertySchemaField[]>> = {
  text: TEXT_PROPERTY_SCHEMA,
  image: IMAGE_PROPERTY_SCHEMA,
  shape: SHAPE_PROPERTY_SCHEMA,
  variable: VARIABLE_PROPERTY_SCHEMA,
  group: TRANSFORM_FIELDS,
}

export function getPropertySchema(type: ElementType): PropertySchemaField[] {
  return SCHEMA_BY_TYPE[type] ?? TRANSFORM_FIELDS
}
