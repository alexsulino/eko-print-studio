import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { EkoPrintStudio } from '@/sdk/EkoPrintStudio'
import { editorSession, type EditorSnapshot } from '@/sdk/session/EditorSession'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'

const EditorContext = createContext<EkoPrintStudio | null>(null)

export interface EditorProviderProps {
  children: ReactNode
  /** Optional pre-built instance; otherwise a default session host is created. */
  editor?: EkoPrintStudio
}

/**
 * Hosts one EkoPrintStudio instance for the Creator UI tree.
 * Panels consume `useEditor()` / `useEditorSnapshot()` — never `@/core`.
 */
export function EditorProvider({ children, editor: injected }: EditorProviderProps) {
  const editor = useMemo(
    () =>
      injected ??
      new EkoPrintStudio({
        documentProvider: localDocumentProvider,
      }),
    [injected],
  )

  useEffect(() => {
    return () => {
      // Do not destroy shared singleton session on HMR remounts in DEV.
      if (injected) return
    }
  }, [injected, editor])

  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
}

export function useEditor(): EkoPrintStudio {
  const editor = useContext(EditorContext)
  if (!editor) {
    throw new Error('useEditor must be used within EditorProvider')
  }
  return editor
}

function subscribeSession(onStoreChange: () => void): () => void {
  return editorSession.subscribe(() => {
    invalidateEditorSnapshot()
    onStoreChange()
  })
}

let cachedSnapshot: EditorSnapshot | null = null

function invalidateEditorSnapshot(): void {
  cachedSnapshot = null
}

function getSessionSnapshot(): EditorSnapshot {
  if (!cachedSnapshot) {
    cachedSnapshot = editorSession.getSnapshot()
  }
  return cachedSnapshot
}

/** Reactive snapshot from the bound editor session. */
export function useEditorSnapshot(): EditorSnapshot {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionSnapshot)
}

/** Session actions (same instance the SDK binds). */
export function useEditorSession() {
  useEditor() // ensure provider present
  return editorSession
}

/** Local UI theme preference (CSS data-theme). */
export function useThemeMode(defaultMode: 'light' | 'dark' | 'canva' = 'canva') {
  const [mode, setMode] = useState<'light' | 'dark' | 'canva'>(() => {
    if (typeof document === 'undefined') return defaultMode
    return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | 'canva') || defaultMode
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  return { mode, setMode }
}
