import type { ViewportState } from '@/types/viewport'
import type { InteractionMode } from '@/types/interaction'
import type { EditorGuide } from '@/types/layout'
import type { GridConfig } from '@/types/grid'
import type { WorkspaceState } from '@/types/workspace'
import type { DirtyRegion, FrameBudget } from './types'

export interface RenderTheme {
  selectionStroke: string
  hoverStroke: string
  guideStroke: string
  gridStroke: string
  paperShadow?: string
}

export const DEFAULT_RENDER_THEME: RenderTheme = {
  selectionStroke: 'rgba(37,99,235,0.95)',
  hoverStroke: 'rgba(37,99,235,0.45)',
  guideStroke: 'rgba(255,59,48,0.85)',
  gridStroke: 'rgba(20,32,51,0.08)',
}

/**
 * Shared render context — renderers never pull from the store.
 * Hosts assemble this snapshot before each pipeline run.
 */
export interface RenderContext {
  viewport: ViewportState
  workspace: WorkspaceState | null
  zoom: number
  selectionIds: string[]
  hoverId: string | null
  theme: RenderTheme
  interactionMode: InteractionMode | null
  grid: GridConfig | null
  guides: EditorGuide[]
  dpi: number
  devicePixelRatio: number
  editingElementId: string | null
  dirtyRegions: DirtyRegion[]
  frameBudget: FrameBudget
}

export function createRenderContext(
  partial: Partial<RenderContext> & Pick<RenderContext, 'viewport'>,
): RenderContext {
  const base: RenderContext = {
    viewport: partial.viewport,
    workspace: null,
    zoom: partial.viewport.zoom,
    selectionIds: [],
    hoverId: null,
    theme: DEFAULT_RENDER_THEME,
    interactionMode: null,
    grid: null,
    guides: [],
    dpi: 96,
    devicePixelRatio: 1,
    editingElementId: null,
    dirtyRegions: [],
    frameBudget: { maxMs: 16.6, preferPartial: false },
  }
  return {
    ...base,
    ...partial,
    zoom: partial.zoom ?? partial.viewport.zoom,
    viewport: partial.viewport,
  }
}
