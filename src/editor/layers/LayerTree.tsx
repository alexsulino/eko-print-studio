import { LayerItem } from './LayerItem'
import type { LayerTreeNode } from './types'

export interface LayerTreeProps {
  nodes: LayerTreeNode[]
  selectedIds: readonly string[]
  onSelect: (id: string, modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => void
}

/**
 * Flat tree walk (depth from LayerEngine). Ready for future nesting / DnD.
 */
export function LayerTree({ nodes, selectedIds, onSelect }: LayerTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="eko-layer-tree eko-layer-tree--empty" data-testid="layer-tree">
        <p>Nenhum elemento nesta página.</p>
      </div>
    )
  }

  return (
    <div className="eko-layer-tree" role="tree" aria-label="Document layers" data-testid="layer-tree">
      {nodes.map((node) => (
        <div key={node.id} role="treeitem" aria-selected={selectedIds.includes(node.id)}>
          <LayerItem
            node={node}
            selected={selectedIds.includes(node.id)}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  )
}
