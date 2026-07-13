/**
 * Top chrome — visual placeholders for future command wiring.
 * Receives optional callbacks so App can connect store later without layout knowing Zustand.
 */
export interface TopToolbarProps {
  documentTitle?: string
  onUndo?: () => void
  onRedo?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onSave?: () => void
}

export function TopToolbar({
  documentTitle = 'Sem documento',
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onSave,
}: TopToolbarProps) {
  return (
    <header className="eko-top-toolbar" data-testid="top-toolbar">
      <div className="eko-top-toolbar__brand">
        <span className="eko-top-toolbar__mark" aria-hidden>
          EKO
        </span>
        <div className="eko-top-toolbar__titles">
          <strong>Print Studio</strong>
          <span className="eko-top-toolbar__subtitle">{documentTitle}</span>
        </div>
      </div>

      <div className="eko-top-toolbar__actions" role="toolbar" aria-label="Editor actions">
        <button type="button" onClick={onUndo} disabled={!onUndo} title="Undo">
          Undo
        </button>
        <button type="button" onClick={onRedo} disabled={!onRedo} title="Redo">
          Redo
        </button>
        <span className="eko-top-toolbar__divider" aria-hidden />
        <button type="button" onClick={onZoomOut} disabled={!onZoomOut} title="Zoom out">
          −
        </button>
        <button type="button" onClick={onZoomIn} disabled={!onZoomIn} title="Zoom in">
          +
        </button>
        <span className="eko-top-toolbar__divider" aria-hidden />
        <button type="button" onClick={onSave} disabled={!onSave} title="Save">
          Save
        </button>
      </div>
    </header>
  )
}
