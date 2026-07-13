/**
 * Dev-only editor diagnostics metrics (not persisted, not shipped to production UI).
 */

export interface EditorDiagnosticsSnapshot {
  initialRenderMs: number | null
  lastRenderElementCount: number
  lastResolvedElements: number
  lastRenderNodes: number
  lastStageWidth: number
  lastStageHeight: number
  lastZoom: number
}

const state: EditorDiagnosticsSnapshot = {
  initialRenderMs: null,
  lastRenderElementCount: 0,
  lastResolvedElements: 0,
  lastRenderNodes: 0,
  lastStageWidth: 0,
  lastStageHeight: 0,
  lastZoom: 0,
}

let renderStartedAt: number | null = null

export function markRenderStart(): void {
  if (!import.meta.env.DEV) return
  if (renderStartedAt === null) renderStartedAt = performance.now()
}

export function recordRendererMetrics(payload: {
  elementCount: number
  resolvedElements: number
  renderNodes: number
  stageWidth: number
  stageHeight: number
  zoom: number
}): void {
  if (!import.meta.env.DEV) return
  if (state.initialRenderMs === null && renderStartedAt !== null) {
    state.initialRenderMs = Math.round(performance.now() - renderStartedAt)
  }
  state.lastRenderElementCount = payload.elementCount
  state.lastResolvedElements = payload.resolvedElements
  state.lastRenderNodes = payload.renderNodes
  state.lastStageWidth = payload.stageWidth
  state.lastStageHeight = payload.stageHeight
  state.lastZoom = payload.zoom
}

export function getEditorDiagnosticsSnapshot(): EditorDiagnosticsSnapshot {
  return { ...state }
}

/** Test helper — reset metrics between tests. */
export function resetEditorDiagnosticsForTests(): void {
  state.initialRenderMs = null
  state.lastRenderElementCount = 0
  state.lastResolvedElements = 0
  state.lastRenderNodes = 0
  state.lastStageWidth = 0
  state.lastStageHeight = 0
  state.lastZoom = 0
  renderStartedAt = null
}
