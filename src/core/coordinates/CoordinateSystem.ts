import type { DocumentRegion } from '@/types/layout'
import type { ViewportState } from '@/types/viewport'

export interface DocumentPoint {
  x: number
  y: number
  space: 'document'
}

export interface ViewportPoint {
  x: number
  y: number
  space: 'viewport'
}

export interface RegionPoint {
  x: number
  y: number
  space: 'region'
  regionId: string
}

/**
 * Coordinate System — isolates document / viewport / region spaces.
 * Never mixes Konva node coordinates into the domain model.
 */
export class CoordinateSystem {
  static documentToViewport(
    point: { x: number; y: number },
    viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
  ): ViewportPoint {
    return {
      space: 'viewport',
      x: point.x * viewport.zoom + viewport.panX,
      y: point.y * viewport.zoom + viewport.panY,
    }
  }

  static viewportToDocument(
    point: { x: number; y: number },
    viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
  ): DocumentPoint {
    return {
      space: 'document',
      x: (point.x - viewport.panX) / viewport.zoom,
      y: (point.y - viewport.panY) / viewport.zoom,
    }
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
