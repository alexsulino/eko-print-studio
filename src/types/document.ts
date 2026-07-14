/** Semantic schema version for EkoDocument compatibility. */
export const CURRENT_SCHEMA_VERSION = '1.1.0'

/** Oldest schema still accepted by normalize/validate. */
export const MIN_SUPPORTED_SCHEMA_VERSION = '1.0.0'

export type DocumentType = 'template' | 'session' | 'production'
export type Unit = 'mm' | 'cm' | 'px' | 'in' | 'pt'
export type Orientation = 'portrait' | 'landscape'

export interface DocumentProductionMeta {
  bleedMm?: number
  safeAreaMm?: number
  colorMode?: 'rgb' | 'cmyk'
}

export interface DocumentMetadata {
  name: string
  /** Optional authoring description (not required for production). */
  description?: string
  productId?: string
  masterId?: string
  createdAt: string
  updatedAt: string
  orientation?: Orientation
  production?: DocumentProductionMeta
}

export interface DocumentCanvas {
  width: number
  height: number
  unit: Unit
  dpi: number
  backgroundColor?: string
}

export interface TemplateRules {
  allowedFonts: string[]
  allowedBackgrounds: string[]
  allowAddElements?: boolean
  allowDeleteElements?: boolean
}

export type AssetSource = 'local' | 'cdn' | 'wp-media' | 'api'

export interface AssetRef {
  id: string
  name: string
  src: string
  mimeType?: string
  source?: AssetSource
}

export interface DocumentAssets {
  fonts: AssetRef[]
  images: AssetRef[]
  backgrounds: AssetRef[]
}

/**
 * Document-level permissions (who can do what with this document).
 * Distinct from per-element constraints.
 */
export interface DocumentPermissions {
  canEdit: boolean
  canExport: boolean
  canSave: boolean
  canAddElements: boolean
  canDeleteElements: boolean
  canChangeBackground: boolean
  /** When true, client UI must not mutate a template master. */
  lockMaster: boolean
}

export interface DocumentVariable {
  key: string
  label: string
  /** Resolved or default value for preview. */
  value?: string
  fallback?: string
  source?: 'manual' | 'order' | 'customer' | 'product' | 'system'
}

export interface DocumentVariables {
  definitions: DocumentVariable[]
  /** Runtime values keyed by variable key (session resolution). */
  values: Record<string, string>
}

export type {
  DocumentPage,
  DocumentSurface,
  DocumentRegion,
  EditorGuide,
  EkoPage,
} from './layout'

import type { DocumentPage, DocumentSurface, DocumentRegion, EditorGuide } from './layout'

/**
 * Canonical Web-to-Print document.
 *
 * Layout model (Phase 3):
 * Document → Pages / Surfaces → Regions → Elements
 *
 * Root `elements[]` remain the flat source of truth for Interaction Engine.
 * Surfaces/pages reference elements by id for multi-face / multi-page products.
 */
export interface EkoDocument {
  id: string
  type: DocumentType
  /** Semantic version of this document schema (e.g. "1.1.0"). */
  schemaVersion: string
  metadata: DocumentMetadata
  canvas: DocumentCanvas
  rules: TemplateRules
  assets: DocumentAssets
  permissions: DocumentPermissions
  variables: DocumentVariables
  /** Flat element collection (canonical for editing / commands). */
  elements: import('./element').EkoElement[]
  /** Multi-page products (folder, calendar, book). */
  pages?: DocumentPage[]
  /** Product faces (front/back, shirt sides, packaging panels). */
  surfaces?: DocumentSurface[]
  /** Printable / safe / bleed / margin / custom regions. */
  regions?: DocumentRegion[]
  /**
   * Optional editor guides for authoring sessions.
   * Never part of production output — stripped when type === 'production'.
   */
  guides?: EditorGuide[]
}
