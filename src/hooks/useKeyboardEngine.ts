import { useEffect } from 'react'
import { KeyboardEngine } from '@/core/keyboard/KeyboardEngine'
import { useEditorStore } from '@/store/editorStore'

/**
 * Binds global shortcuts → store actions (Commands / viewport / selection).
 */
export function useKeyboardEngine(enabled = true) {
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
        case 'delete':
          event.preventDefault()
          store.deleteSelected()
          return
        case 'escape':
          event.preventDefault()
          store.clearSelection()
          store.clearGuides()
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
        case 'flipHorizontal': {
          event.preventDefault()
          const id = store.selectedId
          if (id) store.flipElement(id, 'horizontal')
          return
        }
        case 'flipVertical': {
          event.preventDefault()
          const id = store.selectedId
          if (id) store.flipElement(id, 'vertical')
          return
        }
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
      if (!intent || intent.type !== 'toolHand') return
      useEditorStore.getState().setInteraction({
        spacePressed: false,
        tool: 'select',
        mode: 'idle',
      })
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [enabled])
}
