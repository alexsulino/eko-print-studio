/** Semantic schema version for EkoDocument compatibility. */
export const CURRENT_SCHEMA_VERSION = '1.0.0'

export type DocumentType = 'template' | 'session' | 'production'
export type Unit = 'mm' | 'cm' | 'px'
export type Orientation = 'portrait' | 'landscape'

export interface DocumentProductionMeta {
  bleedMm?: number
  safeAreaMm?: number
  colorMode?: 'rgb' | 'cmyk'
}

export interface DocumentMetadata {
  name: string
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

export interface EkoPage {
  id: string
  name: string
  elements: import('./element').EkoElement[]
}

export interface EkoDocument {
  id: string
  type: DocumentType
  /** Semantic version of this document schema (e.g. "1.0.0"). */
  schemaVersion: string
  metadata: DocumentMetadata
  canvas: DocumentCanvas
  rules: TemplateRules
  assets: DocumentAssets
  permissions: DocumentPermissions
  variables: DocumentVariables
  elements: import('./element').EkoElement[]
  /** Prepared for multi-page; Phase 1 keeps elements on the root. */
  pages?: EkoPage[]
}
