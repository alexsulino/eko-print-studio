import type { AssetRef, EkoDocument } from '@/types/document'
import { assetRegistry } from '@/core/registry/AssetRegistry'

export function listDocumentAssets(document: EkoDocument) {
  return assetRegistry.list(document)
}

export function findAsset(document: EkoDocument, assetId: string): AssetRef | undefined {
  return assetRegistry.find(document, assetId)
}

export function resolveImageSrc(document: EkoDocument, assetId?: string, fallbackSrc?: string): string {
  if (assetId) {
    const asset = assetRegistry.find(document, assetId)
    if (asset) return asset.src
  }
  return fallbackSrc ?? ''
}
