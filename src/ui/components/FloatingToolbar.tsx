import { useMemo } from 'react'
import { Button } from '@/ui/components/Button'
import { useEditorSession, useEditorSnapshot } from '@/sdk/react/EditorProvider'

/**
 * Canva-like floating toolbar — capability-driven via ObjectRegistry (through SDK).
 */
export function FloatingToolbar() {
  const session = useEditorSession()
  const snap = useEditorSnapshot()
  const caps = session.getObjectCapabilities()
  const type = session.getObjectType()

  const actions = useMemo(() => {
    if (!caps || snap.selectedIds.length === 0) return []
    const items: Array<{ id: string; label: string; run: () => void; danger?: boolean }> = []
    if (caps.flip) {
      items.push({
        id: 'flip-h',
        label: 'Flip H',
        run: () => session.flipSelected('horizontal'),
      })
      items.push({
        id: 'flip-v',
        label: 'Flip V',
        run: () => session.flipSelected('vertical'),
      })
    }
    items.push({
      id: 'duplicate',
      label: 'Duplicate',
      run: () => session.duplicateSelected(),
    })
    if (caps.delete) {
      items.push({
        id: 'delete',
        label: 'Delete',
        run: () => session.deleteSelected(),
        danger: true,
      })
    }
    return items
  }, [caps, session, snap.selectedIds.length])

  if (!actions.length || snap.selectedIds.length === 0) return null

  return (
    <div
      className="eko-floating-toolbar"
      data-testid="floating-toolbar"
      role="toolbar"
      aria-label={`Ferramentas · ${type ?? 'seleção'}`}
    >
      {actions.map((action) => (
        <Button
          key={action.id}
          variant={action.danger ? 'danger' : 'ghost'}
          onClick={action.run}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}
