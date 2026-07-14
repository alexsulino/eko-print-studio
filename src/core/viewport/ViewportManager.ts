import type { DocumentCanvas } from '@/types/document'
import type { ViewportState } from '@/types/viewport'
import { getDocumentPixelSize } from '@/core/document/units'

export type ViewportAnimationHandle = {
  cancel: () => void
}

/**
 * ViewportManager — zoom, pan, fit, and document↔screen mapping.
 * Viewport never mutates EkoDocument; it only controls visualization.
 */
export class ViewportManager {
  private state: ViewportState = {
    zoom: 1,
    panX: 0,
    panY: 0,
    stageWidth: 800,
    stageHeight: 600,
  }

  private animationFrame: number | null = null

  getState(): ViewportState {
    return { ...this.state }
  }

  setStageSize(width: number, height: number): void {
    this.state.stageWidth = width
    this.state.stageHeight = height
  }

  setZoom(zoom: number): void {
    this.state.zoom = Math.min(4, Math.max(0.1, zoom))
  }

  zoomBy(delta: number): void {
    this.setZoom(this.state.zoom + delta)
  }

  /** Zoom toward a screen-space point (e.g. cursor). */
  zoomAt(nextZoom: number, screenX: number, screenY: number): ViewportState {
    const prev = this.state.zoom
    const zoom = Math.min(4, Math.max(0.1, nextZoom))
    const docX = (screenX - this.state.panX) / prev
    const docY = (screenY - this.state.panY) / prev
    this.state.zoom = zoom
    this.state.panX = screenX - docX * zoom
    this.state.panY = screenY - docY * zoom
    return this.getState()
  }

  zoomIn(step = 0.1): ViewportState {
    const next = Math.min(4, Math.max(0.1, this.state.zoom + step))
    return this.zoomAt(next, this.state.stageWidth / 2, this.state.stageHeight / 2)
  }

  zoomOut(step = 0.1): ViewportState {
    const next = Math.min(4, Math.max(0.1, this.state.zoom - step))
    return this.zoomAt(next, this.state.stageWidth / 2, this.state.stageHeight / 2)
  }

  zoomTo100(canvas?: DocumentCanvas): ViewportState {
    this.setZoom(1)
    if (canvas) {
      const { widthPx, heightPx } = getDocumentPixelSize(canvas)
      this.state.panX = (this.state.stageWidth - widthPx) / 2
      this.state.panY = (this.state.stageHeight - heightPx) / 2
    }
    return this.getState()
  }

  setPan(x: number, y: number): void {
    this.state.panX = x
    this.state.panY = y
  }

  panBy(dx: number, dy: number): void {
    this.state.panX += dx
    this.state.panY += dy
  }

  /** Fit document into the stage with padding. */
  fitToStage(canvas: DocumentCanvas, padding = 48): ViewportState {
    const { widthPx, heightPx } = getDocumentPixelSize(canvas)
    return this.fitToPixels(widthPx, heightPx, padding)
  }

  /** Fit an explicit paper size (surface / layout) into the stage. */
  fitToPixels(widthPx: number, heightPx: number, padding = 48): ViewportState {
    const availableW = Math.max(this.state.stageWidth - padding * 2, 1)
    const availableH = Math.max(this.state.stageHeight - padding * 2, 1)
    const zoom = Math.min(availableW / Math.max(widthPx, 1), availableH / Math.max(heightPx, 1), 4)

    this.state.zoom = Math.max(0.1, zoom)
    this.state.panX = (this.state.stageWidth - widthPx * this.state.zoom) / 2
    this.state.panY = (this.state.stageHeight - heightPx * this.state.zoom) / 2

    return this.getState()
  }

  /**
   * Fit and center an arbitrary document-space rect (e.g. selection bounds).
   * Independent of EkoDocument — only uses stage size + the given rect.
   */
  fitToBounds(
    bounds: { x: number; y: number; width: number; height: number },
    padding = 48,
  ): ViewportState {
    const width = Math.max(bounds.width, 1)
    const height = Math.max(bounds.height, 1)
    const availableW = Math.max(this.state.stageWidth - padding * 2, 1)
    const availableH = Math.max(this.state.stageHeight - padding * 2, 1)
    const zoom = Math.min(availableW / width, availableH / height, 4)
    this.state.zoom = Math.max(0.1, zoom)
    const cx = bounds.x + width / 2
    const cy = bounds.y + height / 2
    this.state.panX = this.state.stageWidth / 2 - cx * this.state.zoom
    this.state.panY = this.state.stageHeight / 2 - cy * this.state.zoom
    return this.getState()
  }

  /**
   * Animate toward a target viewport (smooth zoom / fit).
   * Calls `onFrame` each rAF with the interpolated state.
   */
  animateTo(
    target: Pick<ViewportState, 'zoom' | 'panX' | 'panY'>,
    onFrame: (state: ViewportState) => void,
    durationMs = 180,
  ): ViewportAnimationHandle {
    this.cancelAnimation()
    const from = { zoom: this.state.zoom, panX: this.state.panX, panY: this.state.panY }
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = easeOutCubic(t)
      this.state.zoom = from.zoom + (target.zoom - from.zoom) * eased
      this.state.panX = from.panX + (target.panX - from.panX) * eased
      this.state.panY = from.panY + (target.panY - from.panY) * eased
      onFrame(this.getState())
      if (t < 1) {
        this.animationFrame = requestAnimationFrame(tick)
      } else {
        this.animationFrame = null
      }
    }

    this.animationFrame = requestAnimationFrame(tick)
    return {
      cancel: () => this.cancelAnimation(),
    }
  }

  /** Compute fitToBounds target without mutating — for smooth animation. */
  computeFitToBounds(
    bounds: { x: number; y: number; width: number; height: number },
    padding = 48,
  ): Pick<ViewportState, 'zoom' | 'panX' | 'panY'> {
    const snapshot = this.getState()
    const width = Math.max(bounds.width, 1)
    const height = Math.max(bounds.height, 1)
    const availableW = Math.max(snapshot.stageWidth - padding * 2, 1)
    const availableH = Math.max(snapshot.stageHeight - padding * 2, 1)
    const zoom = Math.max(0.1, Math.min(availableW / width, availableH / height, 4))
    const cx = bounds.x + width / 2
    const cy = bounds.y + height / 2
    return {
      zoom,
      panX: snapshot.stageWidth / 2 - cx * zoom,
      panY: snapshot.stageHeight / 2 - cy * zoom,
    }
  }

  computeFitToPixels(
    widthPx: number,
    heightPx: number,
    padding = 48,
  ): Pick<ViewportState, 'zoom' | 'panX' | 'panY'> {
    const snapshot = this.getState()
    const availableW = Math.max(snapshot.stageWidth - padding * 2, 1)
    const availableH = Math.max(snapshot.stageHeight - padding * 2, 1)
    const zoom = Math.max(
      0.1,
      Math.min(availableW / Math.max(widthPx, 1), availableH / Math.max(heightPx, 1), 4),
    )
    return {
      zoom,
      panX: (snapshot.stageWidth - widthPx * zoom) / 2,
      panY: (snapshot.stageHeight - heightPx * zoom) / 2,
    }
  }

  /** Double-click zoom target at cursor (does not mutate — pair with animateTo). */
  computeZoomAtToggle(
    screenX: number,
    screenY: number,
    closeZoom = 1.5,
  ): Pick<ViewportState, 'zoom' | 'panX' | 'panY'> {
    const next = this.state.zoom < closeZoom * 0.9 ? closeZoom : Math.max(0.25, this.state.zoom * 0.5)
    const prev = this.state.zoom
    const zoom = Math.min(4, Math.max(0.1, next))
    const docX = (screenX - this.state.panX) / prev
    const docY = (screenY - this.state.panY) / prev
    return {
      zoom,
      panX: screenX - docX * zoom,
      panY: screenY - docY * zoom,
    }
  }

  /** Immediate double-click zoom (no animation). */
  zoomAtToggle(screenX: number, screenY: number, closeZoom = 1.5): ViewportState {
    const target = this.computeZoomAtToggle(screenX, screenY, closeZoom)
    this.state.zoom = target.zoom
    this.state.panX = target.panX
    this.state.panY = target.panY
    return this.getState()
  }

  cancelAnimation(): void {
    if (this.animationFrame != null) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  /** Screen point → document pixel space. */
  screenToDocument(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.state.panX) / this.state.zoom,
      y: (screenY - this.state.panY) / this.state.zoom,
    }
  }

  /** Document pixel → screen space. */
  documentToScreen(docX: number, docY: number): { x: number; y: number } {
    return {
      x: docX * this.state.zoom + this.state.panX,
      y: docY * this.state.zoom + this.state.panY,
    }
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export const viewportManager = new ViewportManager()
