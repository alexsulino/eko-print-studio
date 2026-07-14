import { useEffect, useState } from 'react'
import { registerDiagnosticsToggle } from '@/hooks/useKeyboardEngine'

const isDev = import.meta.env.DEV

/**
 * Dev-only toggle for the Eko Diagnostics panel (Ctrl+Shift+D).
 * Shortcut is owned by KeyboardEngine; this hook only holds panel state.
 */
export function useDiagnosticsMode(): {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
} {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isDev) return
    const toggle = () => setOpen((prev) => !prev)
    registerDiagnosticsToggle(toggle)
    return () => registerDiagnosticsToggle(null)
  }, [])

  if (!isDev) {
    return { open: false, setOpen: () => undefined, toggle: () => undefined }
  }

  return {
    open,
    setOpen,
    toggle: () => setOpen((prev) => !prev),
  }
}
