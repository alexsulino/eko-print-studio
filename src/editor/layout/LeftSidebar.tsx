import { useState, type ReactNode } from 'react'

export type LeftSidebarTab = 'elements' | 'assets' | 'layers'

export interface LeftSidebarProps {
  /** Existing LayersPanel (or future layers UI) — optional slot. */
  layersContent?: ReactNode
  /** Future Elements catalog. */
  elementsContent?: ReactNode
  /** Future Assets browser. */
  assetsContent?: ReactNode
  defaultTab?: LeftSidebarTab
}

const TABS: { id: LeftSidebarTab; label: string }[] = [
  { id: 'elements', label: 'Elements' },
  { id: 'assets', label: 'Assets' },
  { id: 'layers', label: 'Layers' },
]

/**
 * Left rail — tabbed placeholders. Panels stay independent via slots.
 */
export function LeftSidebar({
  layersContent,
  elementsContent,
  assetsContent,
  defaultTab = 'layers',
}: LeftSidebarProps) {
  const [tab, setTab] = useState<LeftSidebarTab>(defaultTab)

  return (
    <div className="eko-left-sidebar" data-testid="left-sidebar">
      <nav className="eko-left-sidebar__tabs" aria-label="Left sidebar">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              tab === item.id
                ? 'eko-left-sidebar__tab eko-left-sidebar__tab--active'
                : 'eko-left-sidebar__tab'
            }
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="eko-left-sidebar__body">
        {tab === 'elements' ? (
          elementsContent ?? (
            <Placeholder
              title="Elements"
              hint="Biblioteca de objetos (texto, formas, imagens) — em breve."
            />
          )
        ) : null}
        {tab === 'assets' ? (
          assetsContent ?? (
            <Placeholder
              title="Assets"
              hint="Catálogo de assets resolvidos pelo Asset Engine — em breve."
            />
          )
        ) : null}
        {tab === 'layers' ? (
          layersContent ?? (
            <Placeholder title="Layers" hint="Árvore de camadas do documento — em breve." />
          )
        ) : null}
      </div>
    </div>
  )
}

function Placeholder({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="eko-panel-placeholder">
      <h2>{title}</h2>
      <p>{hint}</p>
    </div>
  )
}
