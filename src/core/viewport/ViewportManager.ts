import type { DocumentCanvas } from '@/types/document'
import type { ViewportState } from '@/types/viewport'
import { getDocumentPixelSize } from '@/core/document/units'

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
    this.zoomBy(step)
    return this.getState()
  }

  zoomOut(step = 0.1): ViewportState {
    this.zoomBy(-step)
    return this.getState()
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

export const viewportManager = new ViewportManager()
