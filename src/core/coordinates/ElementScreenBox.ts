import type { ElementTransform } from '@/types/element'
import type { ViewportState } from '@/types/viewport'
import { CoordinateSystem } from './CoordinateSystem'

/**
 * Screen-space AABB origin + visual transform for HTML overlays
 * (text edit, future crop handles, path points).
 *
 * Matches Konva Layer mapping: screen = doc * zoom + pan,
 * then element rotation/scale about top-left (same as default Konva node).
 */
export interface ElementScreenBox {
  left: number
  top: number
  /** Unscaled element width in screen px (width * zoom). */
  width: number
  /** Unscaled element height in screen px (height * zoom). */
  height: number
  rotationDeg: number
  scaleX: number
  scaleY: number
  zoom: number
}

export function computeElementScreenBox(
  transform: Pick<
    ElementTransform,
    'x' | 'y' | 'width' | 'height' | 'rotation' | 'scaleX' | 'scaleY'
  >,
  viewport: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
): ElementScreenBox {
  const origin = CoordinateSystem.documentToViewport(
    { x: transform.x, y: transform.y },
    viewport,
  )
  return {
    left: origin.x,
    top: origin.y,
    width: transform.width * viewport.zoom,
    height: transform.height * viewport.zoom,
    rotationDeg: transform.rotation,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
    zoom: viewport.zoom,
  }
}

/** CSS transform string aligned with Konva node order (rotate + scale, origin top-left). */
export function elementScreenBoxCssTransform(box: ElementScreenBox): string {
  return `rotate(${box.rotationDeg}deg) scale(${box.scaleX}, ${box.scaleY})`
}
