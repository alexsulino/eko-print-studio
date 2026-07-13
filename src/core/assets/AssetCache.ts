import type { ResolvedAsset } from './ResolvedAsset'

/**
 * Contract for resolved-asset memoization.
 * Pure domain — no DOM, fetch, or binary decode.
 */
export interface AssetCache {
  get(assetId: string): ResolvedAsset | undefined
  set(assetId: string, value: ResolvedAsset): void
  has(assetId: string): boolean
  invalidate(assetId: string): void
  clear(): void
}
