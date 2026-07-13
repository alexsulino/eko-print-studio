import { useEffect, useState } from 'react'

const isDev = import.meta.env.DEV

/**
 * Dev-only toggle for the Eko Diagnostics panel (Ctrl+Shift+D).
 * No-op in production builds.
 */
export function useDiagnosticsMode(): {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
} {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isDev) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
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
