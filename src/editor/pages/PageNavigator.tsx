import { useMemo } from 'react'
import { useEditorSession, useEditorSnapshot } from '@/sdk/react/EditorProvider'
import { AddPageButton } from './AddPageButton'
import { PageItem } from './PageItem'
import './pages.css'

/**
 * Multi-page navigator — SDK session only.
 */
export function PageNavigator() {
  const session = useEditorSession()
  const snap = useEditorSnapshot()
  const document = snap.document

  const pages = useMemo(() => {
    const list = document?.pages ?? []
    return [...list].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  }, [document?.pages])

  if (!document) {
    return (
      <div className="eko-page-navigator eko-page-navigator--empty" data-testid="page-navigator">
        <span className="eko-page-navigator__hint">Sem documento</span>
      </div>
    )
  }

  return (
    <div className="eko-page-navigator" data-testid="page-navigator" aria-label="Pages">
      <div className="eko-page-navigator__label">Pages</div>
      <div className="eko-page-navigator__list" role="list">
        {pages.map((page, index) => (
          <div key={page.id} role="listitem">
            <PageItem
              id={page.id}
              name={page.name}
              index={page.index ?? index}
              active={page.id === snap.activePageId}
              onSelect={(id) => session.activatePage(id)}
              onDuplicate={(id) => session.duplicatePage(id)}
            />
          </div>
        ))}
      </div>
      <AddPageButton onAdd={() => session.addPage()} />
    </div>
  )
}
