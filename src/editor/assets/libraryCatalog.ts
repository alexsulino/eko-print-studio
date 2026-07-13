import type { LibraryAssetEntry } from '@/core/assets'
import { listDocumentLibraryAssets } from '@/core/assets'

/**
 * Static template placeholders for the library (not stored in Zustand).
 * Upload / favorites / categories will extend this catalog later.
 */
export const TEMPLATE_LIBRARY_PLACEHOLDERS: LibraryAssetEntry[] = [
  {
    id: 'tpl_blank_placeholder',
    kind: 'template',
    name: 'Blank template',
    previewUri: null,
    sourceUri: '#template/blank',
  },
]

/**
 * Full insertable catalog for the session document.
 * Document pools + static placeholders — no parallel asset state.
 */
export function buildLibraryCatalog(
  documentAssets: Parameters<typeof listDocumentLibraryAssets>[0],
): LibraryAssetEntry[] {
  return [...listDocumentLibraryAssets(documentAssets), ...TEMPLATE_LIBRARY_PLACEHOLDERS]
}
