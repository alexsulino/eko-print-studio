/**
 * Asset Engine domain types.
 * Pure data — no React, Konva, DOM, or binary payloads.
 */

/** Extensible asset kinds for future Asset Engine phases. */
export type AssetType = 'image' | 'svg' | 'font' | 'template' | 'external'

/**
 * How the asset bytes are located (never the bytes themselves).
 * Storage backends (IndexedDB, CDN, WP Media, API) plug in later.
 */
export type AssetSourceKind = 'url' | 'local' | 'cdn' | 'wp-media' | 'api' | 'blob-ref'

/**
 * Content access mode for future loaders (upload / filesystem / inline).
 * Optional — when omitted, resolver infers from `kind` (defaults to url-like).
 */
export type AssetSourceMode = 'url' | 'file' | 'data'

export interface AssetSource {
  kind: AssetSourceKind
  /**
   * Locator for the asset content.
   * Examples: `/sample/demo.svg`, `https://cdn…/x.png`, storage key for blob-ref.
   * Always present — never broken by mode evolution.
   */
  uri: string
  /**
   * How `uri` should be interpreted by loaders.
   * - url: http(s) or public path
   * - file: filesystem / sandbox path
   * - data: inline or blob-ref payload key
   */
  mode?: AssetSourceMode
}

export interface AssetMetadata {
  name: string
  mimeType?: string
  /** Natural pixel size when known (images / svg). */
  width?: number
  height?: number
  /** Original filename or display label from import. */
  originalName?: string
  /** Opaque extension bag — Asset Engine may grow fields without schema breaks. */
  extra?: Record<string, unknown>
}

export type AssetLifecycleStatus =
  | 'draft'
  | 'ready'
  | 'missing'
  | 'orphaned'
  | 'archived'

export interface AssetLifecycle {
  status: AssetLifecycleStatus
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
}

/**
 * Canonical Asset entity — decoupled from canvas Elements.
 * Elements reference assets via `properties.assetId` only.
 */
export interface Asset {
  id: string
  type: AssetType
  source: AssetSource
  metadata: AssetMetadata
  lifecycle: AssetLifecycle
}

/** Payload for creating a new asset (id / timestamps may be omitted). */
export type CreateAssetInput = {
  id?: string
  type: AssetType
  source: AssetSource
  metadata: AssetMetadata
  lifecycle?: Partial<AssetLifecycle>
}

/** Where an asset is referenced from a document graph. */
export interface AssetUsageRef {
  elementId: string
  /** Element type that holds the reference (typically `image`). */
  elementType: string
  assetId: string
}
