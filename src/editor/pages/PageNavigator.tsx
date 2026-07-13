import { useMemo } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { AddPageButton } from './AddPageButton'
import { PageItem } from './PageItem'
import './pages.css'

/**
 * Multi-page navigator — reads pages from document; active page from Zustand only.
 * Mutations go through AddPage / DuplicatePage commands.
 */
export function PageNavigator() {
  const document = useEditorStore((s) => s.document)
  const activePageId = useEditorStore((s) => s.activePageId)
  const activatePage = useEditorStore((s) => s.activatePage)
  const addPage = useEditorStore((s) => s.addPage)
  const duplicatePage = useEditorStore((s) => s.duplicatePage)

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
              active={page.id === activePageId}
              onSelect={activatePage}
              onDuplicate={duplicatePage}
            />
          </div>
        ))}
      </div>
      <AddPageButton onAdd={() => addPage()} />
    </div>
  )
}
