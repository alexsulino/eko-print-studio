export interface PageItemProps {
  id: string
  name: string
  index: number
  active: boolean
  onSelect: (pageId: string) => void
  onDuplicate: (pageId: string) => void
}

/**
 * Single page chip — prepared for future thumbnails / reorder handles.
 */
export function PageItem({ id, name, index, active, onSelect, onDuplicate }: PageItemProps) {
  return (
    <div
      className={active ? 'eko-page-item eko-page-item--active' : 'eko-page-item'}
      data-testid={`page-item-${id}`}
    >
      <button
        type="button"
        className="eko-page-item__main"
        aria-pressed={active}
        onClick={() => onSelect(id)}
        title={name}
      >
        <span className="eko-page-item__thumb" aria-hidden>
          {index + 1}
        </span>
        <span className="eko-page-item__name">{name}</span>
      </button>
      <button
        type="button"
        className="eko-page-item__duplicate"
        title="Duplicate page"
        aria-label={`Duplicate ${name}`}
        onClick={(e) => {
          e.stopPropagation()
          onDuplicate(id)
        }}
      >
        Dup
      </button>
    </div>
  )
}
