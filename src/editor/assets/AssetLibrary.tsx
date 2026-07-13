import { useMemo } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { AssetGrid } from './AssetGrid'
import { buildLibraryCatalog } from './libraryCatalog'
import './assets.css'

/**
 * Asset Library Experience — browse document assets and insert via InsertAsset.
 *
 * Flow: AssetLibrary → InsertAsset → element → History → EkoDocument → Renderer
 *
 * Deferred (prepared, not implemented): upload, drag-drop onto canvas, search,
 * categories, favorites.
 */
export function AssetLibrary() {
  const document = useEditorStore((s) => s.document)
  const insertAsset = useEditorStore((s) => s.insertAsset)

  const assets = useMemo(() => {
    if (!document) return []
    return buildLibraryCatalog(document.assets)
  }, [document])

  if (!document) {
    return (
      <div className="eko-asset-library eko-asset-library--empty" data-testid="asset-library">
        <p>Sem documento</p>
      </div>
    )
  }

  return (
    <div className="eko-asset-library" data-testid="asset-library">
      <header className="eko-asset-library__header">
        <h2 className="eko-asset-library__title">Assets</h2>
        <p className="eko-asset-library__hint">Clique para inserir no centro da página</p>
      </header>

      {/* Future: search / categories / favorites toolbar */}
      <div className="eko-asset-library__toolbar" aria-hidden>
        <span className="eko-asset-library__toolbar-slot">Search soon</span>
      </div>

      <AssetGrid
        assets={assets}
        onSelect={(assetId) => {
          const entry = assets.find((a) => a.id === assetId)
          if (!entry) return
          insertAsset({
            assetId: entry.id,
            libraryKind: entry.kind,
            sourceUri: entry.sourceUri,
            name: entry.name,
            mimeType: entry.mimeType,
          })
        }}
      />

      {/* Future: upload dropzone */}
    </div>
  )
}
