import { useEffect, useRef, useState } from 'react'
import { CanvasEditor } from '@/components/CanvasEditor/CanvasEditor'
import { AssetLibrary } from '@/editor/assets'
import { LayersPanel } from '@/editor/layers'
import { PropertiesPanel } from '@/editor/inspector'
import { ElementsQuickAdd } from '@/editor/elements'
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
import {
  EditorProvider,
  useEditor,
  useEditorSession,
  useEditorSnapshot,
  useThemeMode,
} from '@/sdk/react/EditorProvider'
import {
  ConfirmHost,
  ContextMenuHost,
  FloatingToolbar,
  ToastHost,
  themeEngine,
} from '@/ui'
import { bootWooCommerceFromUrl } from '@/adapters/woocommerce'
import type { WooCommerceAdapter } from '@/adapters/woocommerce'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'
import { LocalPersistenceProvider } from '@/providers/LocalPersistenceProvider'
import { LocalPersonalizationSessionStore } from '@/providers/LocalPersonalizationSessionStore'
import { EkoPrintStudio } from '@/sdk/EkoPrintStudio'
import '@/styles/editor.css'
import '@/ui/styles/ui.css'

function createCommerceEditor() {
  return new EkoPrintStudio({
    documentProvider: localDocumentProvider,
    providers: { persistence: new LocalPersistenceProvider() },
    sessionStore: new LocalPersonalizationSessionStore(),
  })
}

function CreatorApp() {
  const editor = useEditor()
  const session = useEditorSession()
  const snap = useEditorSnapshot()
  const bootstrappedRef = useRef(false)
  const commerceAdapterRef = useRef<WooCommerceAdapter | null>(null)
  const [commerceMode, setCommerceMode] = useState(false)
  const { open: diagnosticsOpen, setOpen: setDiagnosticsOpen } = useDiagnosticsMode()
  const { mode, setMode } = useThemeMode('canva')

  useEffect(() => {
    themeEngine.setTheme(mode)
  }, [mode])

  useEffect(() => {
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true
    const params = new URLSearchParams(window.location.search)
    const isCommerce = Boolean(params.get('templateId') || params.get('sessionId'))
    if (!isCommerce) {
      void editor.bootstrap()
      return
    }
    void bootWooCommerceFromUrl({ editor })
      .then((result) => {
        if (!result) {
          void editor.bootstrap()
          return
        }
        commerceAdapterRef.current = result.adapter
        setCommerceMode(true)
        const theme = params.get('theme') as 'canva' | 'light' | 'dark' | null
        if (theme) setMode(theme)
      })
      .catch(() => {
        void editor.bootstrap()
      })
  }, [editor, setMode])

  const document = snap.document
  const activePage =
    document?.pages?.find((p) => p.id === snap.activePageId) ?? document?.pages?.[0] ?? null

  const pageInfo = document
    ? `${activePage?.name ?? 'Page'} · ${document.pages?.length ?? 1} page(s) · ${document.elements.length} elements`
    : 'Page —'

  const saveHandler = document
    ? async () => {
        if (commerceMode && commerceAdapterRef.current) {
          await commerceAdapterRef.current.finalizeCustomization()
          commerceAdapterRef.current.notifyHostClose()
          return
        }
        session.saveLocalDownload()
      }
    : undefined

  return (
    <div className="editor-app">
      <EditorLayout
        toolbar={
          <TopToolbar
            documentTitle={snap.documentTitle}
            zoomPercent={snap.zoomPercent}
            canUndo={snap.canUndo}
            canRedo={snap.canRedo}
            gridVisible={snap.grid.visible}
            guidesVisible={snap.guidesVisible}
            themeMode={mode}
            onUndo={document ? () => session.undo() : undefined}
            onRedo={document ? () => session.redo() : undefined}
            onZoomIn={document ? () => session.zoomIn() : undefined}
            onZoomOut={document ? () => session.zoomOut() : undefined}
            onZoom100={document ? () => session.zoomTo100() : undefined}
            onFit={document ? () => session.fitViewport() : undefined}
            onFitWorkspace={document ? () => session.fitWorkspace() : undefined}
            onToggleGrid={document ? () => session.toggleGridVisible() : undefined}
            onToggleGuides={document ? () => session.toggleGuidesVisible() : undefined}
            onPreview={document ? () => void editor.generateProductionPreview().catch(() => session.preview()) : undefined}
            onOpen={
              document
                ? () =>
                    session.openFilePicker((json) => {
                      session.importJson(json)
                    })
                : undefined
            }
            onSave={saveHandler ? () => void saveHandler() : undefined}
            onThemeCycle={() => {
              const order = ['canva', 'light', 'dark'] as const
              const idx = order.indexOf(mode)
              setMode(order[(idx + 1) % order.length]!)
            }}
          />
        }
        left={
          <LeftSidebar
            layersContent={<LayersPanel />}
            assetsContent={<AssetLibrary />}
            textContent={<ElementsQuickAdd kind="text" />}
            shapesContent={<ElementsQuickAdd kind="shapes" />}
            imagesContent={<AssetLibrary />}
          />
        }
        canvas={
          snap.isLoading || !document ? (
            <div className="canvas-empty">
              {snap.lastError ? snap.lastError : commerceMode ? 'Abrindo personalização…' : 'Abrindo template…'}
            </div>
          ) : (
            <ErrorBoundary region="canvas">
              <CanvasEditor />
            </ErrorBoundary>
          )
        }
        canvasOverlay={<FloatingToolbar />}
        right={<RightInspector propertiesContent={<PropertiesPanel />} />}
        bottom={
          <>
            <PageNavigator />
            <BottomStatusBar pageInfo={pageInfo} zoomLabel={`Zoom ${snap.zoomPercent}%`} />
          </>
        }
      />
      <ToastHost />
      <ConfirmHost />
      <ContextMenuHost />
      {import.meta.env.DEV && diagnosticsOpen ? (
        <DiagnosticsPanel onClose={() => setDiagnosticsOpen(false)} />
      ) : null}
    </div>
  )
}

export default function App() {
  const editorRef = useRef<EkoPrintStudio | null>(null)
  if (!editorRef.current) {
    editorRef.current = createCommerceEditor()
  }
  return (
    <EditorProvider editor={editorRef.current}>
      <CreatorApp />
    </EditorProvider>
  )
}
