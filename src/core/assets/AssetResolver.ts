import type { AssetRepository } from './AssetRepository'
import type { AssetCache } from './AssetCache'
import type { Asset } from './types'
import type { ResolvedAsset, ResolvedResource } from './ResolvedAsset'

export interface AssetResolverOptions {
  /** Optional memoization layer. */
  cache?: AssetCache
}

/**
 * Maps assetId → ResolvedAsset for the renderer pipeline.
 * Never throws for missing/bad assets — returns status envelopes instead.
 */
export class AssetResolver {
  constructor(
    private readonly repository: AssetRepository,
    private readonly options: AssetResolverOptions = {},
  ) {}

  resolve(assetId: string): ResolvedAsset {
    const id = assetId?.trim() ?? ''
    if (!id) {
      return {
        assetId: id,
        status: 'failed',
        error: 'Empty asset id',
      }
    }

    const cached = this.options.cache?.get(id)
    if (cached) return cached

    try {
      const asset = this.repository.get(id)
      if (!asset) {
        const missing: ResolvedAsset = { assetId: id, status: 'missing' }
        this.options.cache?.set(id, missing)
        return missing
      }

      if (asset.lifecycle.status === 'draft' || asset.lifecycle.status === 'missing') {
        const unresolved: ResolvedAsset = {
          assetId: id,
          status: 'unresolved',
          asset,
          error: `Asset lifecycle is ${asset.lifecycle.status}`,
        }
        this.options.cache?.set(id, unresolved)
        return unresolved
      }

      const resource = materializeResource(asset)
      if (!resource) {
        const failed: ResolvedAsset = {
          assetId: id,
          status: 'failed',
          asset,
          error: 'Asset source.uri is empty or invalid',
        }
        this.options.cache?.set(id, failed)
        return failed
      }

      const resolved: ResolvedAsset = {
        assetId: id,
        status: 'resolved',
        asset,
        resource,
      }
      this.options.cache?.set(id, resolved)
      return resolved
    } catch (error) {
      const failed: ResolvedAsset = {
        assetId: id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Asset resolution failed',
      }
      this.options.cache?.set(id, failed)
      return failed
    }
  }

  resolveMany(assetIds: string[]): ResolvedAsset[] {
    return assetIds.map((id) => this.resolve(id))
  }
}

/**
 * Turns Asset.source into a ResolvedResource without loading bytes.
 * Preserves `source.uri`; uses optional `source.mode` when present.
 */
export function materializeResource(asset: Asset): ResolvedResource | null {
  const uri = asset.source.uri?.trim()
  if (!uri) return null

  const mode = asset.source.mode ?? inferMode(asset.source.kind)

  if (mode === 'file') {
    return { mode: 'file', uri, path: uri }
  }
  if (mode === 'data') {
    return { mode: 'data', uri }
  }
  return { mode: 'url', uri }
}

function inferMode(kind: Asset['source']['kind']): 'url' | 'file' | 'data' {
  if (kind === 'blob-ref') return 'data'
  if (kind === 'local') return 'url'
  return 'url'
}
