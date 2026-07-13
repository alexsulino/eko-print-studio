import type { Asset, CreateAssetInput } from './types'

/**
 * Abstract Asset catalog.
 * Implementations: in-memory (foundation), later IndexedDB / API / filesystem.
 *
 * No React, Konva, or DOM — pure domain I/O contract.
 */
export interface AssetRepository {
  add(input: CreateAssetInput | Asset): Asset
  get(id: string): Asset | undefined
  remove(id: string): boolean
  list(): Asset[]
  /** Updates lifecycle / metadata fields; returns undefined if missing. */
  update?(id: string, patch: Partial<Pick<Asset, 'metadata' | 'lifecycle' | 'source'>>): Asset | undefined
  clear?(): void
}
