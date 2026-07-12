import { useEffect } from 'react'
import { CanvasEditor } from '@/components/CanvasEditor/CanvasEditor'
import { PropertiesPanel } from '@/components/PropertiesPanel/PropertiesPanel'
import { Toolbar } from '@/components/Toolbar/Toolbar'
import { useEditorStore } from '@/store/editorStore'
import '@/styles/editor.css'

export default function App() {
  const bootstrapSession = useEditorStore((s) => s.bootstrapSession)
  const isLoading = useEditorStore((s) => s.isLoading)

  useEffect(() => {
    void bootstrapSession()
  }, [bootstrapSession])

  return (
    <div className="editor-app">
      <Toolbar />
      <main className="editor-main">
        <section className="editor-canvas-area">
          {isLoading ? <div className="canvas-empty">Criando session a partir do master…</div> : <CanvasEditor />}
        </section>
        <PropertiesPanel />
      </main>
    </div>
  )
}
