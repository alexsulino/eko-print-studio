import { useEffect, useRef } from 'react'
import { CanvasEditor } from '@/components/CanvasEditor/CanvasEditor'
import { PropertiesPanel } from '@/components/PropertiesPanel/PropertiesPanel'
import { Toolbar } from '@/components/Toolbar/Toolbar'
import { LayersPanel } from '@/components/LayersPanel/LayersPanel'
import { useEditorStore } from '@/store/editorStore'
import '@/styles/editor.css'

export default function App() {
  const bootstrapSession = useEditorStore((s) => s.bootstrapSession)
  const isLoading = useEditorStore((s) => s.isLoading)
  const document = useEditorStore((s) => s.document)
  const lastError = useEditorStore((s) => s.lastError)
  const bootstrappedRef = useRef(false)

  useEffect(() => {
    // StrictMode remounts; store-level lock + this guard keep a single logical bootstrap.
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true
    void bootstrapSession()
  }, [bootstrapSession])

  return (
    <div className="editor-app">
      <Toolbar />
      <main className="editor-main">
        <LayersPanel />
        <section className="editor-canvas-area">
          {isLoading || !document ? (
            <div className="canvas-empty">
              {lastError ? lastError : 'Criando session a partir do master…'}
            </div>
          ) : (
            <CanvasEditor />
          )}
        </section>
        <PropertiesPanel />
      </main>
    </div>
  )
}
