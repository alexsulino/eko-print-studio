/**
 * Keyboard Engine — maps key events to interaction intents.
 * Intents are executed by the store as Commands (never direct document mutation).
 */
export type KeyboardIntent =
  | { type: 'delete' }
  | { type: 'escape' }
  | { type: 'enter' }
  | { type: 'copy' }
  | { type: 'cut' }
  | { type: 'paste' }
  | { type: 'duplicate' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'nudge'; dx: number; dy: number }
  | { type: 'cycle'; direction: 1 | -1 }
  | { type: 'selectAll' }
  | { type: 'flipHorizontal' }
  | { type: 'flipVertical' }
  | { type: 'toolHand'; pressed: boolean }
  | { type: 'keepRatio'; pressed: boolean }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'zoomFit' }
  | { type: 'zoomToSelection' }
  | { type: 'zoom100' }
  | { type: 'toggleDiagnostics' }
  | { type: 'align'; mode: AlignIntentMode }
  | { type: 'distribute'; mode: 'horizontal' | 'vertical' }

export type AlignIntentMode =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'centerHorizontal'
  | 'centerVertical'

export class KeyboardEngine {
  static resolve(
    event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey'> & { altKey?: boolean },
  ): KeyboardIntent | null {
    const key = event.key
    const ctrl = event.ctrlKey || event.metaKey
    const shift = event.shiftKey
    const alt = Boolean(event.altKey)
    const step = shift ? 10 : 1

    if (key === ' ' && !ctrl) {
      return { type: 'toolHand', pressed: true }
    }

    if (key === 'Shift') {
      return { type: 'keepRatio', pressed: true }
    }

    if (ctrl && shift && key.toLowerCase() === 'd') {
      return { type: 'toggleDiagnostics' }
    }

    if (ctrl && key.toLowerCase() === 'c') return { type: 'copy' }
    if (ctrl && key.toLowerCase() === 'x') return { type: 'cut' }
    if (ctrl && shift && key.toLowerCase() === 'v') return { type: 'flipVertical' }
    if (ctrl && key.toLowerCase() === 'v') return { type: 'paste' }
    if (ctrl && key.toLowerCase() === 'd') return { type: 'duplicate' }
    if (ctrl && key.toLowerCase() === 'z' && !shift) return { type: 'undo' }
    if (ctrl && (key.toLowerCase() === 'y' || (key.toLowerCase() === 'z' && shift))) {
      return { type: 'redo' }
    }
    if (ctrl && key.toLowerCase() === 'a') return { type: 'selectAll' }
    if (ctrl && (key === '=' || key === '+')) return { type: 'zoomIn' }
    if (ctrl && key === '-') return { type: 'zoomOut' }
    if (ctrl && key === '0') return { type: 'zoom100' }
    if (ctrl && key === '1') return { type: 'zoomFit' }
    if (ctrl && key === '2') return { type: 'zoomToSelection' }
    if (ctrl && shift && key.toLowerCase() === 'h') return { type: 'flipHorizontal' }

    // Align: Alt+Shift+arrows / Alt+Shift+H/V (discoverable, non-conflicting)
    if (alt && shift && key === 'ArrowLeft') return { type: 'align', mode: 'left' }
    if (alt && shift && key === 'ArrowRight') return { type: 'align', mode: 'right' }
    if (alt && shift && key === 'ArrowUp') return { type: 'align', mode: 'top' }
    if (alt && shift && key === 'ArrowDown') return { type: 'align', mode: 'bottom' }
    if (alt && shift && key.toLowerCase() === 'h') return { type: 'align', mode: 'centerHorizontal' }
    if (alt && shift && key.toLowerCase() === 'v') return { type: 'align', mode: 'centerVertical' }
    if (alt && shift && key.toLowerCase() === 'x') return { type: 'distribute', mode: 'horizontal' }
    if (alt && shift && key.toLowerCase() === 'y') return { type: 'distribute', mode: 'vertical' }

    if (key === 'Delete' || key === 'Backspace') return { type: 'delete' }
    if (key === 'Escape') return { type: 'escape' }
    if (key === 'Enter') return { type: 'enter' }
    if (key === 'Tab') return { type: 'cycle', direction: shift ? -1 : 1 }

    if (key === 'ArrowLeft') return { type: 'nudge', dx: -step, dy: 0 }
    if (key === 'ArrowRight') return { type: 'nudge', dx: step, dy: 0 }
    if (key === 'ArrowUp') return { type: 'nudge', dx: 0, dy: -step }
    if (key === 'ArrowDown') return { type: 'nudge', dx: 0, dy: step }

    return null
  }

  static resolveKeyUp(event: Pick<KeyboardEvent, 'key'>): KeyboardIntent | null {
    if (event.key === ' ') {
      return { type: 'toolHand', pressed: false }
    }
    if (event.key === 'Shift') {
      return { type: 'keepRatio', pressed: false }
    }
    return null
  }

  /** True when the event target is an editable field (shortcuts should be ignored). */
  static isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
  }
}
