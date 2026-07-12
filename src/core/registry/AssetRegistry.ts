import type { AssetRef, DocumentAssets, EkoDocument } from '@/types/document'

/**
 * Per-document asset catalog.
 * Prepared for local / CDN / WP Media / API sources.
 */
export class AssetRegistry {
  list(document: EkoDocument): DocumentAssets {
    return document.assets
  }

  find(document: EkoDocument, assetId: string): AssetRef | undefined {
    const pools = [
      ...document.assets.images,
      ...document.assets.backgrounds,
      ...document.assets.fonts,
    ]
    return pools.find((asset) => asset.id === assetId)
  }

  isAllowedBackground(document: EkoDocument, backgroundNameOrId: string): boolean {
    return (
      document.rules.allowedBackgrounds.includes(backgroundNameOrId) ||
      document.assets.backgrounds.some(
        (bg) => bg.id === backgroundNameOrId || bg.name === backgroundNameOrId,
      )
    )
  }

  isAllowedFont(document: EkoDocument, fontFamily: string): boolean {
    return document.rules.allowedFonts.includes(fontFamily)
  }
}

export const assetRegistry = new AssetRegistry()
