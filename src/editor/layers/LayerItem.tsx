import { layerTypeGlyph, layerTypeLabel } from './layerIcons'
import type { LayerTreeNode } from './types'

export interface LayerItemProps {
  node: LayerTreeNode
  selected: boolean
  onSelect: (id: string, modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => void
}

/**
 * Single layer row — display + selection.
 * Protected template elements show an explicit Sistema / lock affordance.
 */
export function LayerItem({ node, selected, onSelect }: LayerItemProps) {
  const protectedTitle = node.protected
    ? 'Elemento protegido do template — não pode ser movido.'
    : undefined

  return (
    <div
      className={[
        'eko-layer-item',
        selected ? 'eko-layer-item--selected' : '',
        !node.effectivelyVisible ? 'eko-layer-item--hidden' : '',
        node.effectivelyLocked || node.protected ? 'eko-layer-item--locked' : '',
        node.protected ? 'eko-layer-item--protected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ['--eko-layer-depth' as string]: String(node.depth) }}
      data-testid={`layer-item-${node.id}`}
      title={protectedTitle}
    >
      <button
        type="button"
        className="eko-layer-item__main"
        aria-pressed={selected}
        title={protectedTitle}
        onClick={(e) => {
          onSelect(node.id, {
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
          })
        }}
      >
        <span className="eko-layer-item__icon" title={layerTypeLabel(node.type)} aria-hidden>
          {layerTypeGlyph(node.type)}
        </span>
        <span className="eko-layer-item__meta">
          <span className="eko-layer-item__name-row">
            <span className="eko-layer-item__name">{node.name}</span>
            {node.protected ? (
              <span className="eko-layer-item__badge" title={protectedTitle}>
                Sistema
              </span>
            ) : null}
          </span>
          <span className="eko-layer-item__type">{layerTypeLabel(node.type)}</span>
        </span>
      </button>

      <div className="eko-layer-item__flags" aria-label="Layer flags">
        <span
          className={
            node.visible
              ? 'eko-layer-item__flag'
              : 'eko-layer-item__flag eko-layer-item__flag--off'
          }
          title={node.visible ? 'Visível' : 'Oculto'}
        >
          {node.visible ? 'V' : 'H'}
        </span>
        <span
          className={
            node.locked || node.protected
              ? 'eko-layer-item__flag eko-layer-item__flag--lock'
              : 'eko-layer-item__flag'
          }
          title={
            node.protected
              ? 'Protegido (template)'
              : node.locked
                ? 'Bloqueado'
                : 'Editável'
          }
        >
          {node.locked || node.protected ? 'L' : 'U'}
        </span>
      </div>
    </div>
  )
}
