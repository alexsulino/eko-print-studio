import { useCallback, useMemo } from 'react'
import { useEditorSession, useEditorSnapshot } from '@/sdk/react/EditorProvider'
import { LayerTree } from './LayerTree'
import { toLayerTreeNodes } from './types'
import './layers.css'

/**
 * Layer Experience — SDK session only (no Core / store imports).
 */
export function LayersPanel() {
  const session = useEditorSession()
  const snap = useEditorSnapshot()
  const document = snap.document
  const selectedIds = snap.selectedIds

  const pageLabel = useMemo(() => {
    if (!document) return 'Page'
    const page =
      document.pages?.find((p) => p.id === snap.activePageId) ?? document.pages?.[0] ?? null
    return page?.name ?? document.metadata.name ?? 'Page'
  }, [document, snap.activePageId])

  const nodes = useMemo(() => {
    if (!document) return []
    const layers = session.listLayers()
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
    return toLayerTreeNodes(layers, extras)
  }, [document, session, snap.activeSurfaceId, snap.document?.elements])

  const handleSelect = useCallback(
    (id: string, modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
      session.applySelectionClick(id, modifiers)
    },
    [session],
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
