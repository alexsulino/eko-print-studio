import type { DocumentRegion } from '@/types/layout'
import type { ViewportState } from '@/types/viewport'

export interface DocumentPoint {
  x: number
  y: number
  space: 'document'
}

export interface WorkspacePoint {
  x: number
  y: number
  space: 'workspace'
}

export interface ViewportPoint {
  x: number
  y: number
  space: 'viewport'
}

export interface ScreenPoint {
  x: number
  y: number
  space: 'screen'
}

export interface RegionPoint {
  x: number
  y: number
  space: 'region'
  regionId: string
}

export type CoordinatePoint =
  | DocumentPoint
  | WorkspacePoint
  | ViewportPoint
  | ScreenPoint
  | RegionPoint

/**
 * Page (or surface) origin inside workspace world space.
 * When origin is (0,0), document ↔ workspace are identical (single-page compat).
 */
export interface WorkspaceOrigin {
  x: number
  y: number
}

/**
 * Coordinate System — single conversion hub for document / workspace / viewport / screen / region.
 * ViewportManager and engines must call this instead of duplicating zoom/pan math.
 *
 * Spaces:
 * - document — local page/surface content (elements live here)
 * - workspace — infinite pasteboard; pages placed with origins
 * - viewport — stage-local after zoom/pan (same as screen for full-bleed stage)
 * - screen — alias of viewport when stage fills the canvas shell
 * - region — local to a DocumentRegion
 */
export class CoordinateSystem {
  static documentToWorkspace(
    point: { x: number; y: number },
    origin: WorkspaceOrigin = { x: 0, y: 0 },
  ): WorkspacePoint {
    return {
      space: 'workspace',
      x: point.x + origin.x,
      y: point.y + origin.y,
    }
  }

  static workspaceToDocument(
    point: { x: number; y: number },
    origin: WorkspaceOrigin = { x: 0, y: 0 },
  ): DocumentPoint {
    return {
      space: 'document',
      x: point.x - origin.x,
      y: point.y - origin.y,
    }
  }

  static workspaceToViewport(
    point: { x: number; y: number },
    viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
  ): ViewportPoint {
    return {
      space: 'viewport',
      x: point.x * viewport.zoom + viewport.panX,
      y: point.y * viewport.zoom + viewport.panY,
    }
  }

  static viewportToWorkspace(
    point: { x: number; y: number },
    viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
  ): WorkspacePoint {
    return {
      space: 'workspace',
      x: (point.x - viewport.panX) / viewport.zoom,
      y: (point.y - viewport.panY) / viewport.zoom,
    }
  }

  /** Document → viewport via workspace origin (compat: origin 0,0 = legacy path). */
  static documentToViewport(
    point: { x: number; y: number },
    viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
    origin: WorkspaceOrigin = { x: 0, y: 0 },
  ): ViewportPoint {
    const world = CoordinateSystem.documentToWorkspace(point, origin)
    return CoordinateSystem.workspaceToViewport(world, viewport)
  }

  static viewportToDocument(
    point: { x: number; y: number },
    viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
    origin: WorkspaceOrigin = { x: 0, y: 0 },
  ): DocumentPoint {
    const world = CoordinateSystem.viewportToWorkspace(point, viewport)
    return CoordinateSystem.workspaceToDocument(world, origin)
  }

  /** Screen space equals viewport for the full-bleed Konva stage. */
  static viewportToScreen(point: { x: number; y: number }): ScreenPoint {
    return { space: 'screen', x: point.x, y: point.y }
  }

  static screenToViewport(point: { x: number; y: number }): ViewportPoint {
    return { space: 'viewport', x: point.x, y: point.y }
  }

  static documentToScreen(
    point: { x: number; y: number },
    viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
    origin: WorkspaceOrigin = { x: 0, y: 0 },
  ): ScreenPoint {
    return CoordinateSystem.viewportToScreen(
      CoordinateSystem.documentToViewport(point, viewport, origin),
    )
  }

  static screenToDocument(
    point: { x: number; y: number },
    viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
    origin: WorkspaceOrigin = { x: 0, y: 0 },
  ): DocumentPoint {
    return CoordinateSystem.viewportToDocument(
      CoordinateSystem.screenToViewport(point),
      viewport,
      origin,
    )
  }

  static documentToRegion(
    point: { x: number; y: number },
    region: Pick<DocumentRegion, 'id' | 'x' | 'y'>,
  ): RegionPoint {
    return {
      space: 'region',
      regionId: region.id,
      x: point.x - region.x,
      y: point.y - region.y,
    }
  }

  static regionToDocument(
    point: { x: number; y: number },
    region: Pick<DocumentRegion, 'x' | 'y'>,
  ): DocumentPoint {
    return {
      space: 'document',
      x: point.x + region.x,
      y: point.y + region.y,
    }
  }

  static isInsideRegion(
    point: { x: number; y: number },
    region: Pick<DocumentRegion, 'x' | 'y' | 'width' | 'height'>,
  ): boolean {
    return (
      point.x >= region.x &&
      point.y >= region.y &&
      point.x <= region.x + region.width &&
      point.y <= region.y + region.height
    )
  }
}
