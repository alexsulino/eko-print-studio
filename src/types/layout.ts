import type { Unit } from './document'
import type { TemplateRules } from './document'
import type { EkoElement } from './element'

/** Region purpose within a print layout. */
export type RegionKind = 'printable' | 'safe' | 'bleed' | 'margin' | 'custom'

/**
 * Document Region — domain geometry (not Konva, not editing guides).
 * Examples: Printable Area, Safe Area, Bleed, Margin, Custom.
 */
export interface DocumentRegion {
  id: string
  name: string
  kind: RegionKind
  x: number
  y: number
  width: number
  height: number
  /** Document pixel space unless unit is set. */
  unit?: Unit
  visible: boolean
  purpose?: string
  pageId?: string
  surfaceId?: string
}

/**
 * Surface — printable face of a product (front/back of card, shirt front, etc.).
 * Owns dimensions and may reference elements by id (flat root elements remain canonical).
 */
export interface DocumentSurface {
  id: string
  name: string
  /** Stable product-facing key: front | back | sleeve | … */
  slug?: string
  width: number
  height: number
  unit?: Unit
  /** Offset of this surface within the page/document layout. */
  offsetX?: number
  offsetY?: number
  backgroundColor?: string
  pageId?: string
  /** Elements belonging to this surface (ids into document.elements). */
  elementIds: string[]
  regionIds?: string[]
  /** Optional surface-level rule overrides (merged by Rules later). */
  rules?: Partial<TemplateRules>
}

/**
 * Page — multi-page products (folder, calendar, book).
 * May compose one or more surfaces (e.g. spread).
 */
export interface DocumentPage {
  id: string
  name: string
  index?: number
  width?: number
  height?: number
  unit?: Unit
  surfaceIds?: string[]
  regionIds?: string[]
  /**
   * Legacy / page-local elements. Prefer surface.elementIds → document.elements.
   * Kept for backward compatibility with schema 1.0.0 `pages[].elements`.
   */
  elements?: EkoElement[]
}

/** @deprecated Use DocumentPage. Alias kept for existing imports. */
export type EkoPage = DocumentPage

/** Anchor presets for future responsive / auto-align features. */
export type AnchorPreset =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'surface-center'

export interface AnchorPoint {
  id: string
  preset: AnchorPreset
  x: number
  y: number
  surfaceId?: string
  pageId?: string
  regionId?: string
}

/**
 * Editing guides (ruler lines). NOT part of production output.
 * May appear on session/editor state; stripped for production serialization.
 */
export interface EditorGuide {
  id: string
  orientation: 'horizontal' | 'vertical'
  /** Position in document pixel space. */
  position: number
  locked?: boolean
  /** When false, guide is hidden but may still snap if engine includes hidden. */
  visible?: boolean
  label?: string
  /**
   * Page scope for multi-page shared guides prep.
   * `null` / omitted = document-global guide.
   */
  pageId?: string | null
}

/** Print / safe layout bounds in document pixels (independent of Konva). */
export interface LayoutBounds {
  printable: { x: number; y: number; width: number; height: number }
  safe: { x: number; y: number; width: number; height: number } | null
  bleed: { x: number; y: number; width: number; height: number } | null
  margin: { x: number; y: number; width: number; height: number } | null
  crop: { x: number; y: number; width: number; height: number }
}

/** Prepared element lifecycle states (visual wiring is future work). */
export type ElementLifecycleState =
  | 'created'
  | 'loaded'
  | 'selected'
  | 'focused'
  | 'hovered'
  | 'editing'
  | 'transforming'
  | 'locked'
  | 'hidden'
  | 'removed'
  | 'serialized'
  | 'exported'

export interface ElementLifecycleRecord {
  elementId: string
  state: ElementLifecycleState
  updatedAt: number
}
