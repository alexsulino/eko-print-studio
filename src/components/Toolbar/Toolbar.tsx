import { useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { downloadDocumentJson } from '@/services/documentService'
import { getDocumentPixelSize } from '@/core/document/units'

export function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null)
  const document = useEditorStore((s) => s.document)
  const viewport = useEditorStore((s) => s.viewport)
  const selectedIds = useEditorStore((s) => s.selectedIds)
  const interaction = useEditorStore((s) => s.interaction)
  const exportJson = useEditorStore((s) => s.exportJson)
  const importJson = useEditorStore((s) => s.importJson)
  const bootstrapSession = useEditorStore((s) => s.bootstrapSession)
  const fitViewport = useEditorStore((s) => s.fitViewport)
  const zoomIn = useEditorStore((s) => s.zoomIn)
  const zoomOut = useEditorStore((s) => s.zoomOut)
  const zoomTo100 = useEditorStore((s) => s.zoomTo100)
  const setInteraction = useEditorStore((s) => s.setInteraction)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected)
  const flipElement = useEditorStore((s) => s.flipElement)
  const selectedId = useEditorStore((s) => s.selectedId)
  const lastError = useEditorStore((s) => s.lastError)
  const clearError = useEditorStore((s) => s.clearError)

  const pixelSize = document ? getDocumentPixelSize(document.canvas) : null
  const zoomPct = Math.round(viewport.zoom * 100)

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
        <button type="button" onClick={() => undo()} disabled={!document}>
          Undo
        </button>
        <button type="button" onClick={() => redo()} disabled={!document}>
          Redo
        </button>
        <button type="button" onClick={() => duplicateSelected()} disabled={!selectedIds.length}>
          Duplicar
        </button>
        <button
          type="button"
          onClick={() => selectedId && flipElement(selectedId, 'horizontal')}
          disabled={!selectedId}
        >
          Flip H
        </button>
        <button
          type="button"
          onClick={() => selectedId && flipElement(selectedId, 'vertical')}
          disabled={!selectedId}
        >
          Flip V
        </button>
        <button
          type="button"
          className={interaction.tool === 'hand' ? 'is-active' : undefined}
          onClick={() =>
            setInteraction({
              tool: interaction.tool === 'hand' ? 'select' : 'hand',
            })
          }
          disabled={!document}
        >
          Hand
        </button>
        <button type="button" onClick={() => fitViewport()} disabled={!document}>
          Fit
        </button>
        <button type="button" onClick={zoomTo100} disabled={!document}>
          100%
        </button>
        <button type="button" onClick={zoomIn} disabled={!document}>
          Zoom +
        </button>
        <button type="button" onClick={zoomOut} disabled={!document}>
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
        {document && (
          <span>
            Zoom {zoomPct}% · Sel {selectedIds.length}
          </span>
        )}
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
