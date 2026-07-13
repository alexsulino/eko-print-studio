import { useEffect, useRef } from 'react'
import { CanvasEditor } from '@/components/CanvasEditor/CanvasEditor'
import { AssetLibrary } from '@/editor/assets'
import { LayersPanel } from '@/editor/layers'
import { PropertiesPanel } from '@/editor/inspector'
import { PageNavigator } from '@/editor/pages'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DiagnosticsPanel } from '@/components/Diagnostics/DiagnosticsPanel'
import {
  BottomStatusBar,
  EditorLayout,
  LeftSidebar,
  RightInspector,
  TopToolbar,
} from '@/editor/layout'
import { useDiagnosticsMode } from '@/hooks/useDiagnosticsMode'
import { downloadDocumentJson } from '@/services/documentService'
import { useEditorStore } from '@/store/editorStore'
import '@/styles/editor.css'

export default function App() {
  const bootstrapSession = useEditorStore((s) => s.bootstrapSession)
  const isLoading = useEditorStore((s) => s.isLoading)
  const document = useEditorStore((s) => s.document)
  const lastError = useEditorStore((s) => s.lastError)
  const activePageId = useEditorStore((s) => s.activePageId)
  const viewport = useEditorStore((s) => s.viewport)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const zoomIn = useEditorStore((s) => s.zoomIn)
  const zoomOut = useEditorStore((s) => s.zoomOut)
  const bootstrappedRef = useRef(false)
  const appRenderCountRef = useRef(0)
  const { open: diagnosticsOpen, setOpen: setDiagnosticsOpen } = useDiagnosticsMode()

  if (import.meta.env.DEV) {
    appRenderCountRef.current += 1
    if (appRenderCountRef.current === 20 || appRenderCountRef.current % 50 === 0) {
      // eslint-disable-next-line no-console
      console.warn('[Eko DEV] App render count', appRenderCountRef.current)
    }
  }

  useEffect(() => {
    // StrictMode remounts; store-level lock + this guard keep a single logical bootstrap.
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true
    void bootstrapSession()
  }, [bootstrapSession])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    return useEditorStore.subscribe((state, prev) => {
      if (state.document === prev.document) return
      // eslint-disable-next-line no-console
      console.debug('[Eko DEV] Zustand document changed', {
        id: state.document?.id,
        elements: state.document?.elements.length,
      })
    })
  }, [])

  const documentTitle = document
    ? `${document.metadata.name} · ${document.type} · schema ${document.schemaVersion}`
    : 'Sem documento'

  const activePage =
    document?.pages?.find((p) => p.id === activePageId) ?? document?.pages?.[0] ?? null

  const pageInfo = document
    ? `${activePage?.name ?? 'Page'} · ${document.pages?.length ?? 1} page(s) · ${document.elements.length} elements`
    : 'Page —'

  const zoomLabel = `Zoom ${Math.round(viewport.zoom * 100)}%`

  return (
    <div className="editor-app">
      <EditorLayout
        toolbar={
          <TopToolbar
            documentTitle={documentTitle}
            onUndo={document ? () => undo() : undefined}
            onRedo={document ? () => redo() : undefined}
            onZoomIn={document ? () => zoomIn() : undefined}
            onZoomOut={document ? () => zoomOut() : undefined}
            onSave={
              document
                ? () => {
                    downloadDocumentJson(document)
                  }
                : undefined
            }
          />
        }
        left={<LeftSidebar layersContent={<LayersPanel />} assetsContent={<AssetLibrary />} />}
        canvas={
          isLoading || !document ? (
            <div className="canvas-empty">
              {lastError ? lastError : 'Criando session a partir do master…'}
            </div>
          ) : (
            <ErrorBoundary region="canvas">
              <CanvasEditor />
            </ErrorBoundary>
          )
        }
        right={<RightInspector propertiesContent={<PropertiesPanel />} />}
        bottom={
          <>
            <PageNavigator />
            <BottomStatusBar pageInfo={pageInfo} zoomLabel={zoomLabel} />
          </>
        }
      />
      {import.meta.env.DEV && diagnosticsOpen ? (
        <DiagnosticsPanel onClose={() => setDiagnosticsOpen(false)} />
      ) : null}
    </div>
  )
}
