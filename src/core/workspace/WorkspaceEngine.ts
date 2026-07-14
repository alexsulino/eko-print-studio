import { LayoutResolver } from '@/core/layout/LayoutResolver'
import { PageEngine } from '@/core/pages/PageEngine'
import type { EkoDocument } from '@/types/document'
import type {
  PagePlacement,
  WorkspaceBounds,
  WorkspaceConfig,
  WorkspaceState,
} from '@/types/workspace'
import { DEFAULT_WORKSPACE_CONFIG, EMPTY_WORKSPACE_BOUNDS } from '@/types/workspace'

/**
 * Workspace Engine — infinite pasteboard that places pages in world space.
 *
 * Knows pages/surfaces geometry only — never document elements.
 * Viewport cameras over workspace; Document keeps content coordinates local.
 */
export class WorkspaceEngine {
  /**
   * Lay out all pages along the configured axis with gaps.
   * Scales to 1…N…100 pages without changing the algorithm (O(n)).
   */
  static layoutPages(
    document: EkoDocument,
    config: WorkspaceConfig = DEFAULT_WORKSPACE_CONFIG,
    activePageId?: string | null,
  ): WorkspaceState {
    const summaries = PageEngine.list(document)
    const placements: PagePlacement[] = []
    let cursor = 0

    for (const summary of summaries) {
      const page = document.pages?.find((p) => p.id === summary.id)
      const surface = page ? PageEngine.primarySurface(document, page) : null
      const resolved = LayoutResolver.resolve(document, {
        pageId: summary.id,
        surfaceId: surface?.id ?? null,
      })

      const width = resolved.paper.widthPx
      const height = resolved.paper.heightPx
      const x = config.axis === 'horizontal' ? cursor : 0
      const y = config.axis === 'vertical' ? cursor : 0

      placements.push({
        pageId: summary.id,
        surfaceId: surface?.id ?? null,
        index: summary.index,
        x,
        y,
        width,
        height,
      })

      cursor += (config.axis === 'horizontal' ? width : height) + config.pageGap
    }

    const bounds = WorkspaceEngine.computeBounds(placements, config.padding)
    const active =
      placements.find((p) => p.pageId === activePageId) ?? placements[0] ?? null

    return {
      config: { ...config },
      placements,
      bounds,
      activeOrigin: active ? { x: active.x, y: active.y } : { x: 0, y: 0 },
    }
  }

  static computeBounds(
    placements: PagePlacement[],
    padding = DEFAULT_WORKSPACE_CONFIG.padding,
  ): WorkspaceBounds {
    if (!placements.length) {
      return {
        x: -padding,
        y: -padding,
        width: padding * 2,
        height: padding * 2,
      }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of placements) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x + p.width)
      maxY = Math.max(maxY, p.y + p.height)
    }

    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    }
  }

  /** Center the active page in the stage (pan only; zoom unchanged). */
  static centerOnActive(
    workspace: WorkspaceState,
    stageWidth: number,
    stageHeight: number,
    zoom: number,
  ): { panX: number; panY: number } {
    const active =
      workspace.placements.find(
        (p) => p.x === workspace.activeOrigin.x && p.y === workspace.activeOrigin.y,
      ) ?? workspace.placements[0]

    if (!active) {
      return { panX: stageWidth / 2, panY: stageHeight / 2 }
    }

    const cx = active.x + active.width / 2
    const cy = active.y + active.height / 2
    return {
      panX: stageWidth / 2 - cx * zoom,
      panY: stageHeight / 2 - cy * zoom,
    }
  }

  /** Fit all pages into the stage (workspace-aware zoom). */
  static fitWorkspace(
    workspace: WorkspaceState,
    stageWidth: number,
    stageHeight: number,
    padding = 48,
  ): { zoom: number; panX: number; panY: number } {
    const content = WorkspaceEngine.computeBounds(workspace.placements, 0)
    if (content.width <= 0 || content.height <= 0) {
      return { zoom: 1, panX: 0, panY: 0 }
    }
    const availableW = Math.max(stageWidth - padding * 2, 1)
    const availableH = Math.max(stageHeight - padding * 2, 1)
    const zoom = Math.min(availableW / content.width, availableH / content.height, 4)
    const safeZoom = Math.max(0.1, zoom)
    const cx = content.x + content.width / 2
    const cy = content.y + content.height / 2
    return {
      zoom: safeZoom,
      panX: stageWidth / 2 - cx * safeZoom,
      panY: stageHeight / 2 - cy * safeZoom,
    }
  }

  static empty(): WorkspaceState {
    return {
      config: { ...DEFAULT_WORKSPACE_CONFIG },
      placements: [],
      bounds: { ...EMPTY_WORKSPACE_BOUNDS },
      activeOrigin: { x: 0, y: 0 },
    }
  }
}

export const workspaceEngine = {
  layoutPages: WorkspaceEngine.layoutPages.bind(WorkspaceEngine),
  fitWorkspace: WorkspaceEngine.fitWorkspace.bind(WorkspaceEngine),
  centerOnActive: WorkspaceEngine.centerOnActive.bind(WorkspaceEngine),
}
