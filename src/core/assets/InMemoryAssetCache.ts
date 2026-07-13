import type { AssetCache } from './AssetCache'
import type { ResolvedAsset } from './ResolvedAsset'

/** Ephemeral cache for AssetResolver (tests + session until persistent cache exists). */
export class InMemoryAssetCache implements AssetCache {
  private readonly entries = new Map<string, ResolvedAsset>()

  get(assetId: string): ResolvedAsset | undefined {
    return this.entries.get(assetId)
  }

  set(assetId: string, value: ResolvedAsset): void {
    this.entries.set(assetId, value)
  }

  has(assetId: string): boolean {
    return this.entries.has(assetId)
  }

  invalidate(assetId: string): void {
    this.entries.delete(assetId)
  }

  clear(): void {
    this.entries.clear()
  }
}
