import type { LibraryAssetEntry, LibraryAssetKind } from '@/sdk/session/assetTypes'

export interface AssetCardProps {
  id: string
  name: string
  kind: LibraryAssetKind
  previewUri: string | null
  selected?: boolean
  onSelect: (id: string) => void
  /** Reserved for future drag-and-drop. */
  draggable?: boolean
}

const KIND_LABEL: Record<LibraryAssetKind, string> = {
  image: 'Image',
  svg: 'SVG',
  template: 'Template',
}

/**
 * Single library card — preview, name, type.
 * Click selects/inserts; drag hooks prepared but unused.
 */
export function AssetCard({
  id,
  name,
  kind,
  previewUri,
  selected,
  onSelect,
  draggable = false,
}: AssetCardProps) {
  return (
    <button
      type="button"
      className={
        selected
          ? 'eko-asset-card eko-asset-card--selected'
          : 'eko-asset-card'
      }
      data-testid={`asset-card-${id}`}
      data-asset-kind={kind}
      aria-label={`Insert ${name}`}
      draggable={draggable}
      onClick={() => onSelect(id)}
      onDragStart={(event) => {
        if (!draggable) return
        event.dataTransfer.setData('application/x-eko-asset-id', id)
        event.dataTransfer.effectAllowed = 'copy'
      }}
    >
      <div className="eko-asset-card__preview" aria-hidden>
        {previewUri ? (
          <img src={previewUri} alt="" className="eko-asset-card__thumb" />
        ) : (
          <span className="eko-asset-card__placeholder">{KIND_LABEL[kind]}</span>
        )}
      </div>
      <div className="eko-asset-card__meta">
        <span className="eko-asset-card__name" title={name}>
          {name}
        </span>
        <span className="eko-asset-card__type">{KIND_LABEL[kind]}</span>
      </div>
    </button>
  )
}

export function assetCardFromEntry(
  entry: LibraryAssetEntry,
  props: Pick<AssetCardProps, 'onSelect' | 'selected' | 'draggable'>,
): AssetCardProps {
  return {
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    previewUri: entry.previewUri,
    ...props,
  }
}
