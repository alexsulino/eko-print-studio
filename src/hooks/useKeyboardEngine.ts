import { useEffect, useRef } from 'react'
import { KeyboardEngine } from '@/core/keyboard/KeyboardEngine'
import { useEditorStore } from '@/store/editorStore'

type DiagnosticsBridge = {
  toggle?: () => void
}

const diagnosticsBridge: DiagnosticsBridge = {}

/** Allows App to register diagnostics toggle without owning editor shortcuts. */
export function registerDiagnosticsToggle(toggle: (() => void) | null) {
  diagnosticsBridge.toggle = toggle ?? undefined
}

/**
 * Binds global shortcuts → store actions (Commands / viewport / selection).
 * No React component should attach its own editor shortcut listeners.
 */
export function useKeyboardEngine(enabled = true) {
  const diagnosticsRef = useRef(diagnosticsBridge)
  diagnosticsRef.current = diagnosticsBridge

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (KeyboardEngine.isTypingTarget(event.target)) return

      const intent = KeyboardEngine.resolve(event)
      if (!intent) return

      const store = useEditorStore.getState()

      switch (intent.type) {
        case 'toolHand':
          event.preventDefault()
          store.setInteraction({
            spacePressed: true,
            tool: 'hand',
            mode: store.interaction.mode === 'panning' ? 'panning' : store.interaction.mode,
          })
          return
        case 'keepRatio':
          event.preventDefault()
          store.setInteraction({ keepRatio: true })
          return
        case 'toggleDiagnostics':
          event.preventDefault()
          diagnosticsRef.current.toggle?.()
          return
        case 'delete':
          event.preventDefault()
          store.deleteSelected()
          return
        case 'escape':
          event.preventDefault()
          if (store.interaction.session.kind !== 'none') {
            store.endInteractionSession()
            return
          }
          store.clearSelection()
          store.clearGuides()
          store.setHoveredId(null)
          store.setInteraction({ marquee: null, mode: 'idle' })
          return
        case 'enter':
          event.preventDefault()
          store.setInteraction({ mode: 'idle', marquee: null })
          return
        case 'copy':
          event.preventDefault()
          store.copySelected()
          return
        case 'cut':
          event.preventDefault()
          store.cutSelected()
          return
        case 'paste':
          event.preventDefault()
          store.pasteClipboard()
          return
        case 'duplicate':
          event.preventDefault()
          store.duplicateSelected()
          return
        case 'undo':
          event.preventDefault()
          store.undo()
          return
        case 'redo':
          event.preventDefault()
          store.redo()
          return
        case 'nudge':
          event.preventDefault()
          store.nudgeSelected(intent.dx, intent.dy)
          return
        case 'cycle':
          event.preventDefault()
          store.cycleSelection(intent.direction)
          return
        case 'selectAll':
          event.preventDefault()
          store.selectAllSelectable()
          return
        case 'flipHorizontal':
          event.preventDefault()
          store.flipSelected('horizontal')
          return
        case 'flipVertical':
          event.preventDefault()
          store.flipSelected('vertical')
          return
        case 'align':
          event.preventDefault()
          store.alignSelected(intent.mode)
          return
        case 'distribute':
          event.preventDefault()
          store.distributeSelected(intent.mode)
          return
        case 'zoomIn':
          event.preventDefault()
          store.zoomIn()
          return
        case 'zoomOut':
          event.preventDefault()
          store.zoomOut()
          return
        case 'zoomFit':
          event.preventDefault()
          store.fitViewport()
          return
        case 'zoomToSelection':
          event.preventDefault()
          store.zoomToSelection()
          return
        case 'zoom100':
          event.preventDefault()
          store.zoomTo100()
          return
        default:
          return
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      const intent = KeyboardEngine.resolveKeyUp(event)
      if (!intent) return
      if (intent.type === 'toolHand') {
        useEditorStore.getState().setInteraction({
          spacePressed: false,
          tool: 'select',
          mode: 'idle',
        })
        return
      }
      if (intent.type === 'keepRatio') {
        useEditorStore.getState().setInteraction({ keepRatio: false })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [enabled])
}
