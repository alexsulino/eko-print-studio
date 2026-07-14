import { useEffect, useMemo, useState } from 'react'
import { useEditorSession, useEditorSnapshot } from '@/sdk/react/EditorProvider'

export interface ContextMenuItem {
  id: string
  label: string
  shortcut?: string
  disabled?: boolean
  run: () => void
}

/**
 * Registered contextual actions — plugins may append via session later.
 * MVP items are registry/capability aware through the SDK session.
 */
export function ContextMenuHost() {
  const session = useEditorSession()
  const snap = useEditorSnapshot()
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const items = useMemo<ContextMenuItem[]>(() => {
    const hasSelection = snap.selectedIds.length > 0
    const caps = session.getObjectCapabilities()
    const list: ContextMenuItem[] = [
      {
        id: 'undo',
        label: 'Desfazer',
        shortcut: 'Ctrl+Z',
        disabled: !snap.canUndo,
        run: () => session.undo(),
      },
      {
        id: 'redo',
        label: 'Refazer',
        shortcut: 'Ctrl+Y',
        disabled: !snap.canRedo,
        run: () => session.redo(),
      },
      {
        id: 'copy',
        label: 'Copiar',
        shortcut: 'Ctrl+C',
        disabled: !hasSelection,
        run: () => session.copySelected(),
      },
      {
        id: 'paste',
        label: 'Colar',
        shortcut: 'Ctrl+V',
        run: () => session.pasteClipboard(),
      },
      {
        id: 'duplicate',
        label: 'Duplicar',
        shortcut: 'Ctrl+D',
        disabled: !hasSelection,
        run: () => session.duplicateSelected(),
      },
      {
        id: 'delete',
        label: 'Excluir',
        shortcut: 'Del',
        disabled: !hasSelection || caps?.delete === false,
        run: () => session.deleteSelected(),
      },
    ]
    return list
  }, [session, snap.canRedo, snap.canUndo, snap.selectedIds.length])

  useEffect(() => {
    const onContext = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target?.closest('[data-eko-canvas], .eko-editor-layout__canvas')) return
      event.preventDefault()
      setPos({ x: event.clientX, y: event.clientY })
    }
    const onDismiss = () => setPos(null)
    window.addEventListener('contextmenu', onContext)
    window.addEventListener('click', onDismiss)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') onDismiss()
    })
    return () => {
      window.removeEventListener('contextmenu', onContext)
      window.removeEventListener('click', onDismiss)
    }
  }, [])

  if (!pos) return null

  return (
    <div
      className="eko-context-menu"
      data-testid="context-menu"
      role="menu"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className="eko-context-menu__item"
          disabled={item.disabled}
          onClick={() => {
            item.run()
            setPos(null)
          }}
        >
          <span>{item.label}</span>
          {item.shortcut ? <span className="eko-context-menu__shortcut">{item.shortcut}</span> : null}
        </button>
      ))}
    </div>
  )
}
