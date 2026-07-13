import type { Asset } from './types'

/** Resolution outcome for a single assetId. */
export type AssetResolveStatus = 'missing' | 'unresolved' | 'resolved' | 'failed'

/**
 * Materialized locator for the renderer / loaders.
 * Phase 6.1 only produces `url` from `Asset.source.uri`.
 * `file` / `data` are reserved for upload & storage backends.
 */
export type ResolvedResource =
  | {
      mode: 'url'
      /** Browser / CDN / public path. */
      uri: string
    }
  | {
      mode: 'file'
      uri: string
      /** Absolute or sandbox-relative path when available. */
      path?: string
    }
  | {
      mode: 'data'
      uri: string
      /** Inline or referenced payload (never required by resolve today). */
      data?: string
      encoding?: 'base64' | 'utf8'
    }

export interface ResolvedAsset {
  assetId: string
  status: AssetResolveStatus
  asset?: Asset
  resource?: ResolvedResource
  error?: string
}
