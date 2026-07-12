export type ElementType =
  | 'text'
  | 'image'
  | 'shape'
  | 'svg'
  | 'qr-code'
  | 'barcode'
  | 'variable'
  | 'group'
  | 'mask'
  | 'mockup'

/** Business grouping used by rules and UI filtering. */
export type ElementCategory = 'brand' | 'customer' | 'product' | 'system'

export interface ElementTransform {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
}

export interface ElementConstraints {
  selectable?: boolean
  move?: boolean
  resize?: boolean
  rotate?: boolean
  changeText?: boolean
  changeFont?: boolean
  changeColor?: boolean
  replaceImage?: boolean
  crop?: boolean
  delete?: boolean
}

export interface ElementBase {
  id: string
  /** Optional human-stable identifier for templates / integrations. */
  slug?: string
  type: ElementType
  category: ElementCategory
  name?: string
  visible: boolean
  locked: boolean
  editable: boolean
  zIndex: number
  transform: ElementTransform
  metadata: Record<string, unknown>
  constraints: ElementConstraints
  /** Parent group id when nested (Document Graph). */
  parentId?: string | null
  /** Owning surface id (optional explicit ownership). */
  surfaceId?: string | null
  /** Optional region association. */
  regionId?: string | null
}

export interface TextProperties {
  text: string
  fontFamily: string
  fontSize: number
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bold italic'
  fill: string
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  lineHeight?: number
  letterSpacing?: number
}

export interface ImageProperties {
  src: string
  assetId?: string
  opacity?: number
  /** Prepared for future crop support. */
  cropRect?: { x: number; y: number; width: number; height: number }
}

export type ShapeKind = 'rect' | 'circle' | 'line'

export interface ShapeProperties {
  shape: ShapeKind
  fill?: string
  stroke?: string
  strokeWidth?: number
  cornerRadius?: number
  opacity?: number
}

export interface VariableProperties {
  key: string
  label: string
  fallback?: string
}

export interface TextElement extends ElementBase {
  type: 'text'
  properties: TextProperties
}

export interface ImageElement extends ElementBase {
  type: 'image'
  properties: ImageProperties
}

export interface ShapeElement extends ElementBase {
  type: 'shape'
  properties: ShapeProperties
}

export interface VariableElement extends ElementBase {
  type: 'variable'
  properties: VariableProperties
}

export interface GroupProperties {
  childIds: string[]
}

export interface GroupElement extends ElementBase {
  type: 'group'
  properties: GroupProperties
}

/** Future stubs — typed for registry extension. */
export interface StubElement extends ElementBase {
  type: 'svg' | 'qr-code' | 'barcode' | 'mask' | 'mockup'
  properties: Record<string, unknown>
}

export type EkoElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | VariableElement
  | GroupElement
  | StubElement

export type RuleAction =
  | 'select'
  | 'move'
  | 'resize'
  | 'rotate'
  | 'changeText'
  | 'changeFont'
  | 'changeColor'
  | 'replaceImage'
  | 'crop'
  | 'delete'
  | 'edit'
