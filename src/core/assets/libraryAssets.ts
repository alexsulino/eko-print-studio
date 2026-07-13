import type { AssetRef, DocumentAssets } from '@/types/document'

/** Insertable kinds exposed by the Asset Library UX (Phase 7.5). */
export type LibraryAssetKind = 'image' | 'svg' | 'template'

/**
 * Read-only projection of an asset for the library UI.
 * Derived from DocumentAssets — not a parallel store.
 */
export interface LibraryAssetEntry {
  id: string
  kind: LibraryAssetKind
  name: string
  /** URI for card preview (null for non-visual placeholders). */
  previewUri: string | null
  /** Locator copied into the InsertAsset command / element. */
  sourceUri: string
  mimeType?: string
}

export function classifyLibraryKind(
  typeHint: 'image' | 'svg' | 'template' | 'font' | 'external' | undefined,
  mimeType?: string,
): LibraryAssetKind {
  if (typeHint === 'template') return 'template'
  if (typeHint === 'svg') return 'svg'
  const mime = mimeType?.toLowerCase() ?? ''
  if (mime.includes('svg')) return 'svg'
  return 'image'
}

function fromAssetRef(ref: AssetRef, poolHint?: 'image' | 'background'): LibraryAssetEntry {
  const kind = classifyLibraryKind(
    poolHint === 'background' ? 'image' : undefined,
    ref.mimeType,
  )
  return {
    id: ref.id,
    kind,
    name: ref.name,
    previewUri: ref.src,
    sourceUri: ref.src,
    mimeType: ref.mimeType,
  }
}

/**
 * Lists insertable assets from document pools (images + backgrounds).
 * Fonts are excluded — not canvas insert targets in this phase.
 */
export function listDocumentLibraryAssets(assets: DocumentAssets): LibraryAssetEntry[] {
  const entries: LibraryAssetEntry[] = []
  const seen = new Set<string>()

  for (const ref of assets.images) {
    if (seen.has(ref.id)) continue
    seen.add(ref.id)
    entries.push(fromAssetRef(ref, 'image'))
  }
  for (const ref of assets.backgrounds) {
    if (seen.has(ref.id)) continue
    seen.add(ref.id)
    entries.push(fromAssetRef(ref, 'background'))
  }

  return entries
}
