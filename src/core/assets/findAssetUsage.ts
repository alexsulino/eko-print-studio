import type { EkoDocument } from '@/types/document'
import type { EkoElement, ImageElement } from '@/types/element'
import type { AssetRepository } from './AssetRepository'
import type { Asset, AssetUsageRef } from './types'

/**
 * Finds elements that reference an asset via `properties.assetId`.
 * Read-only — does not mutate document or repository.
 */
export function findAssetUsage(
  document: EkoDocument,
  assetId: string,
): AssetUsageRef[] {
  const refs: AssetUsageRef[] = []
  for (const el of document.elements) {
    const id = readAssetId(el)
    if (id === assetId) {
      refs.push({
        elementId: el.id,
        elementType: el.type,
        assetId,
      })
    }
  }
  return refs
}

/**
 * Assets present in the repository but not referenced by any element.
 * Useful for cleanup / health diagnostics (orphan assets).
 */
export function findOrphanAssets(
  repository: AssetRepository,
  document: EkoDocument,
): Asset[] {
  const referenced = collectReferencedAssetIds(document)
  return repository.list().filter((asset) => !referenced.has(asset.id))
}

/**
 * Element assetIds that point to missing repository entries.
 */
export function findBrokenAssetReferences(
  repository: AssetRepository,
  document: EkoDocument,
): AssetUsageRef[] {
  const broken: AssetUsageRef[] = []
  for (const el of document.elements) {
    const assetId = readAssetId(el)
    if (!assetId) continue
    if (!repository.get(assetId)) {
      broken.push({
        elementId: el.id,
        elementType: el.type,
        assetId,
      })
    }
  }
  return broken
}

function readAssetId(el: EkoElement): string | undefined {
  if (el.type !== 'image') return undefined
  const props = (el as ImageElement).properties
  return props.assetId
}

function collectReferencedAssetIds(document: EkoDocument): Set<string> {
  const ids = new Set<string>()
  for (const el of document.elements) {
    const id = readAssetId(el)
    if (id) ids.add(id)
  }
  return ids
}
