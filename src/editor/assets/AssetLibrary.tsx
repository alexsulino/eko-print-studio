import { useMemo } from 'react'
import { useEditorSession, useEditorSnapshot } from '@/sdk/react/EditorProvider'
import { AssetGrid } from './AssetGrid'
import './assets.css'

/**
 * Asset Library — catalog + InsertAsset via SDK session.
 */
export function AssetLibrary() {
  const session = useEditorSession()
  const snap = useEditorSnapshot()
  const document = snap.document

  const assets = useMemo(() => session.listLibraryCatalog(), [session, document?.assets])

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

      <div className="eko-asset-library__toolbar" aria-hidden />

      <AssetGrid
        assets={assets}
        onSelect={(assetId) => {
          const asset = assets.find((a) => a.id === assetId)
          if (!asset) return
          session.insertAsset({
            assetId: asset.id,
            libraryKind: asset.kind,
            sourceUri: asset.sourceUri,
            name: asset.name,
            mimeType: 'mimeType' in asset ? asset.mimeType : undefined,
          })
        }}
      />
    </div>
  )
}
