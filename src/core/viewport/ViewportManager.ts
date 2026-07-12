import type { DocumentCanvas } from '@/types/document'
import type { ViewportState } from '@/types/viewport'
import { getDocumentPixelSize } from '@/core/document/units'

/**
 * ViewportManager — zoom, pan, fit, and document↔screen mapping.
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
    const availableW = Math.max(this.state.stageWidth - padding * 2, 1)
    const availableH = Math.max(this.state.stageHeight - padding * 2, 1)
    const zoom = Math.min(availableW / widthPx, availableH / heightPx, 1)

    this.state.zoom = zoom
    this.state.panX = (this.state.stageWidth - widthPx * zoom) / 2
    this.state.panY = (this.state.stageHeight - heightPx * zoom) / 2

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
