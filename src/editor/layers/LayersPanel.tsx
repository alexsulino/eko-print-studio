import { useCallback, useMemo } from 'react'
import { LayerEngine } from '@/core/layers/LayerEngine'
import { SelectionEngine } from '@/core/selection/SelectionEngine'
import { useEditorStore } from '@/store/editorStore'
import { LayerTree } from './LayerTree'
import { toLayerTreeNodes } from './types'
import './layers.css'

/**
 * Layer Experience — reads LayerEngine, writes selection only via store APIs.
 * No parallel selection state; no Konva access.
 */
export function LayersPanel() {
  const document = useEditorStore((s) => s.document)
  const activePageId = useEditorStore((s) => s.activePageId)
  const activeSurfaceId = useEditorStore((s) => s.activeSurfaceId)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const selectElements = useEditorStore((s) => s.selectElements)

  const pageLabel = useMemo(() => {
    if (!document) return 'Page'
    const page =
      document.pages?.find((p) => p.id === activePageId) ?? document.pages?.[0] ?? null
    return page?.name ?? document.metadata.name ?? 'Page'
  }, [document, activePageId])

  const nodes = useMemo(() => {
    if (!document) return []
    const extras = new Map(
      document.elements.map((el) => [
        el.id,
        {
          category: el.category,
          protected:
            el.metadata?.protected === true ||
            el.metadata?.guide === true ||
            el.category === 'system' ||
            el.category === 'brand' ||
            !el.editable ||
            el.locked,
        },
      ]),
    )
    return toLayerTreeNodes(LayerEngine.listForSurface(document, activeSurfaceId), extras)
  }, [document, activeSurfaceId])
  const handleSelect = useCallback(
    (id: string, modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
      const current = useEditorStore.getState().selectedIds
      const next = SelectionEngine.applyClick(current, id, modifiers)
      selectElements(next)
    },
    [selectElements],
  )

  if (!document) {
    return (
      <aside className="eko-layers-panel eko-layers-panel--empty" data-testid="layers-panel">
        <header className="eko-layers-panel__header">
          <h2>Layers</h2>
        </header>
        <p className="eko-layers-panel__hint">Sem documento</p>
      </aside>
    )
  }

  return (
    <aside className="eko-layers-panel" data-testid="layers-panel">
      <header className="eko-layers-panel__header">
        <h2>Layers</h2>
      </header>

      <section className="eko-layers-panel__page" aria-label="Page">
        <div className="eko-layers-panel__page-label">
          <span className="eko-layers-panel__section-kicker">Page</span>
          <strong>{pageLabel}</strong>
        </div>
      </section>

      <section className="eko-layers-panel__elements" aria-label="Elements">
        <div className="eko-layers-panel__section-kicker">Elements</div>
        <LayerTree nodes={nodes} selectedIds={selectedIds} onSelect={handleSelect} />
      </section>
    </aside>
  )
}
