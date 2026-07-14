import { Button, IconButton } from '@/ui'
import { Badge } from '@/ui'

export interface TopToolbarProps {
  documentTitle?: string
  zoomPercent?: number
  canUndo?: boolean
  canRedo?: boolean
  gridVisible?: boolean
  guidesVisible?: boolean
  themeMode?: 'light' | 'dark' | 'canva'
  onUndo?: () => void
  onRedo?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoom100?: () => void
  onFit?: () => void
  onFitWorkspace?: () => void
  onToggleGrid?: () => void
  onToggleGuides?: () => void
  onSave?: () => void
  onOpen?: () => void
  onPreview?: () => void
  onThemeCycle?: () => void
}

/**
 * Top chrome — Undo/Redo/Zoom/Fit/Grid/Guides/Preview/Open/Save.
 * Presentational only; App wires SDK session callbacks.
 */
export function TopToolbar({
  documentTitle = 'Sem documento',
  zoomPercent = 100,
  canUndo = false,
  canRedo = false,
  gridVisible = false,
  guidesVisible = true,
  themeMode = 'canva',
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoom100,
  onFit,
  onFitWorkspace,
  onToggleGrid,
  onToggleGuides,
  onSave,
  onOpen,
  onPreview,
  onThemeCycle,
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
        <Button onClick={onUndo} disabled={!onUndo || !canUndo} title="Desfazer (Ctrl+Z)">
          Undo
        </Button>
        <Button onClick={onRedo} disabled={!onRedo || !canRedo} title="Refazer (Ctrl+Y)">
          Redo
        </Button>
        <span className="eko-top-toolbar__divider" aria-hidden />
        <IconButton label="Diminuir zoom" onClick={onZoomOut} disabled={!onZoomOut}>
          −
        </IconButton>
        <Button onClick={onZoom100} disabled={!onZoom100} title="Zoom 100%">
          {zoomPercent}%
        </Button>
        <IconButton label="Aumentar zoom" onClick={onZoomIn} disabled={!onZoomIn}>
          +
        </IconButton>
        <Button onClick={onFit} disabled={!onFit} title="Ajustar à página">
          Fit
        </Button>
        <Button onClick={onFitWorkspace} disabled={!onFitWorkspace} title="Ajustar workspace">
          Workspace
        </Button>
        <span className="eko-top-toolbar__divider" aria-hidden />
        <Button
          variant={gridVisible ? 'primary' : 'default'}
          onClick={onToggleGrid}
          disabled={!onToggleGrid}
          title="Grade"
          aria-pressed={gridVisible}
        >
          Grid
        </Button>
        <Button
          variant={guidesVisible ? 'primary' : 'default'}
          onClick={onToggleGuides}
          disabled={!onToggleGuides}
          title="Guias"
          aria-pressed={guidesVisible}
        >
          Guides
        </Button>
        <span className="eko-top-toolbar__divider" aria-hidden />
        <Button onClick={onPreview} disabled={!onPreview} title="Preview">
          Preview
        </Button>
        <Button onClick={onOpen} disabled={!onOpen} title="Abrir JSON">
          Open
        </Button>
        <Button variant="primary" onClick={onSave} disabled={!onSave} title="Salvar">
          Save
        </Button>
        <Button onClick={onThemeCycle} disabled={!onThemeCycle} title="Alternar tema">
          <Badge>{themeMode}</Badge>
        </Button>
      </div>
    </header>
  )
}
