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
  | 'frame'
  | 'table'

/** Business grouping used by rules and UI filtering. */
export type ElementCategory = 'brand' | 'customer' | 'product' | 'system'

/**
 * Shared transform model for every object.
 * `originX` / `originY` are normalized pivots (0–1) relative to width/height.
 * Flip is encoded as negative scaleX / scaleY.
 */
export interface ElementTransform {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
  /** Pivot X in 0–1 (default 0 = left). */
  originX?: number
  /** Pivot Y in 0–1 (default 0 = top). */
  originY?: number
}

/** Interaction / template permission flags — not layout constraints. */
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
  group?: boolean
  effects?: boolean
}

/** Appearance separated from geometry (Style Engine source of truth). */
export interface ElementAppearance {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  cornerRadius?: number
  shadow?: {
    color?: string
    blur?: number
    offsetX?: number
    offsetY?: number
    opacity?: number
  }
  blur?: number
  blendMode?: string
  gradient?: {
    type: 'linear' | 'radial'
    stops: Array<{ offset: number; color: string }>
    angle?: number
  }
  pattern?: {
    src: string
    repeat?: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
  }
}

/** Layout / responsive prep (Constraint Engine). */
export type LayoutConstraintEdge = 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY' | 'scale' | 'stretch'

export interface ElementLayout {
  constraints?: LayoutConstraintEdge[]
  anchor?: string
  alignment?: 'start' | 'center' | 'end' | 'stretch'
  padding?: { top: number; right: number; bottom: number; left: number }
  margin?: { top: number; right: number; bottom: number; left: number }
  stretch?: boolean
  center?: boolean
}

/** Structured metadata bag — freeform keys allowed for integrations. */
export interface ElementObjectMetadata {
  createdAt?: string
  updatedAt?: string
  templateKey?: string
  mergeField?: string
  tags?: string[]
  source?: string
  [key: string]: unknown
}

/**
 * Base contract shared by every editor object.
 * Specializations only add `properties` — never redefine these fields.
 */
export interface ElementBase {
  id: string
  /** Optional human-stable identifier for templates / integrations. */
  slug?: string
  type: ElementType
  category: ElementCategory
  name?: string
  createdAt?: string
  updatedAt?: string
  visible: boolean
  locked: boolean
  /** When false, element is not interactive (mirrors constraints.selectable). */
  selectable?: boolean
  editable: boolean
  zIndex: number
  transform: ElementTransform
  appearance?: ElementAppearance
  layout?: ElementLayout
  metadata: ElementObjectMetadata
  constraints: ElementConstraints
  /** Parent group id when nested (Document Graph). */
  parentId?: string | null
  /** Owning surface id (optional explicit ownership). */
  surfaceId?: string | null
  /** Owning page id (denormalized convenience; surface remains canonical). */
  pageId?: string | null
  /** Optional region association. */
  regionId?: string | null
}

/** Declared capabilities per object type (registry) — prefer over scattered checks. */
export interface ObjectCapabilities {
  rotate: boolean
  resize: boolean
  move: boolean
  editText: boolean
  acceptImage: boolean
  groupable: boolean
  effects: boolean
  crop: boolean
  delete: boolean
  flip: boolean
}

export const DEFAULT_CAPABILITIES: ObjectCapabilities = {
  rotate: true,
  resize: true,
  move: true,
  editText: false,
  acceptImage: false,
  groupable: true,
  effects: true,
  crop: false,
  delete: true,
  flip: true,
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

export interface FrameProperties {
  clipContent?: boolean
  background?: string
}

export interface FrameElement extends ElementBase {
  type: 'frame'
  properties: FrameProperties
}

export interface TableProperties {
  rows: number
  columns: number
  cells?: string[][]
}

export interface TableElement extends ElementBase {
  type: 'table'
  properties: TableProperties
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
  | FrameElement
  | TableElement
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

/** Safe defaults for transform pivots. */
export function normalizeTransform(transform: ElementTransform): ElementTransform {
  return {
    ...transform,
    originX: transform.originX ?? 0,
    originY: transform.originY ?? 0,
  }
}
