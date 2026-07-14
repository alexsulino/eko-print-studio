/**
 * Workspace domain types — infinite pasteboard around document pages.
 * Transient UI state; never persisted inside EkoDocument.
 */

export interface WorkspaceBounds {
  x: number
  y: number
  width: number
  height: number
}

/** Page rectangle placed in workspace (world) space. */
export interface PagePlacement {
  pageId: string
  surfaceId: string | null
  index: number
  x: number
  y: number
  width: number
  height: number
}

export interface WorkspaceConfig {
  /** Gap between consecutive pages in workspace px. */
  pageGap: number
  /** Extra empty space around the union of pages (infinite feel). */
  padding: number
  /** Pasteboard / infinite canvas background. */
  background: string
  /** Arrange pages along an axis. */
  axis: 'horizontal' | 'vertical'
}

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  pageGap: 80,
  padding: 2400,
  background: '#e8eaed',
  axis: 'horizontal',
}

export interface WorkspaceState {
  config: WorkspaceConfig
  placements: PagePlacement[]
  bounds: WorkspaceBounds
  /** Active page origin in workspace — used for coordinate bridges. */
  activeOrigin: { x: number; y: number }
}

export const EMPTY_WORKSPACE_BOUNDS: WorkspaceBounds = {
  x: -2400,
  y: -2400,
  width: 4800,
  height: 4800,
}

export const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  config: { ...DEFAULT_WORKSPACE_CONFIG },
  placements: [],
  bounds: { ...EMPTY_WORKSPACE_BOUNDS },
  activeOrigin: { x: 0, y: 0 },
}
