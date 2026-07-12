import { useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { downloadDocumentJson } from '@/services/documentService'
import { getDocumentPixelSize } from '@/core/document/units'

export function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const document = useEditorStore((s) => s.document)
  const viewport = useEditorStore((s) => s.viewport)
  const exportJson = useEditorStore((s) => s.exportJson)
  const importJson = useEditorStore((s) => s.importJson)
  const bootstrapSession = useEditorStore((s) => s.bootstrapSession)
  const fitViewport = useEditorStore((s) => s.fitViewport)
  const setViewport = useEditorStore((s) => s.setViewport)
  const lastError = useEditorStore((s) => s.lastError)
  const clearError = useEditorStore((s) => s.clearError)

  const pixelSize = document ? getDocumentPixelSize(document.canvas) : null

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="toolbar-mark">EKO</span>
        <div>
          <strong>Print Studio</strong>
          <p>
            {document
              ? `${document.metadata.name} · ${document.type} · schema ${document.schemaVersion}`
              : 'Sem documento'}
          </p>
        </div>
      </div>

      <div className="toolbar-actions">
        <button type="button" onClick={() => void bootstrapSession()}>
          Nova session
        </button>
        <button
          type="button"
          onClick={() => {
            const json = exportJson()
            if (!json || !document) return
            downloadDocumentJson(document)
          }}
          disabled={!document}
        >
          Exportar JSON
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={!document}>
          Importar JSON
        </button>
        <button type="button" onClick={fitViewport} disabled={!document}>
          Fit
        </button>
        <button
          type="button"
          onClick={() =>
            setViewport({
              ...viewport,
              zoom: Math.min(4, viewport.zoom + 0.1),
            })
          }
          disabled={!document}
        >
          Zoom +
        </button>
        <button
          type="button"
          onClick={() =>
            setViewport({
              ...viewport,
              zoom: Math.max(0.1, viewport.zoom - 0.1),
            })
          }
          disabled={!document}
        >
          Zoom −
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            const text = await file.text()
            importJson(text)
            event.target.value = ''
          }}
        />
      </div>

      <div className="toolbar-meta">
        {pixelSize && document && (
          <span>
            {document.canvas.width}
            {document.canvas.unit} × {document.canvas.height}
            {document.canvas.unit} @ {document.canvas.dpi} DPI → {pixelSize.widthPx}×{pixelSize.heightPx}px
          </span>
        )}
        {lastError && (
          <button type="button" className="toolbar-error" onClick={clearError}>
            {lastError}
          </button>
        )}
      </div>
    </header>
  )
}
