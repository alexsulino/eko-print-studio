import type { LibraryAssetEntry } from '@/sdk/session/assetTypes'
import { AssetCard } from './AssetCard'

export interface AssetGridProps {
  assets: LibraryAssetEntry[]
  onSelect: (assetId: string) => void
  /** Future: highlight while dragging onto canvas. */
  selectedId?: string | null
}

/**
 * Responsive grid of AssetCards.
 * Search / categories / favorites will filter `assets` upstream.
 */
export function AssetGrid({ assets, onSelect, selectedId }: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <div className="eko-asset-grid eko-asset-grid--empty" data-testid="asset-grid">
        <p className="eko-asset-grid__empty">Nenhum asset no documento.</p>
      </div>
    )
  }

  return (
    <div className="eko-asset-grid" data-testid="asset-grid" role="list">
      {assets.map((asset) => (
        <div key={asset.id} role="listitem">
          <AssetCard
            id={asset.id}
            name={asset.name}
            kind={asset.kind}
            previewUri={asset.previewUri}
            selected={asset.id === selectedId}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  )
}
