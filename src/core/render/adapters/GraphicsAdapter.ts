import type { RenderScene } from '../types'
import type { RenderContext } from '../RenderContext'

/**
 * Graphics backend contract — Core never imports Konva / Pixi / DOM canvas.
 *
 * Naming (platform readiness):
 * - RendererBackend — paint a RenderScene
 * - CanvasAdapter — optional host surface hooks
 * - KonvaAdapter (src/adapters/konva) — concrete implementation outside Core
 *
 * Future: PixiAdapter, WebGLAdapter, SVGAdapter, Canvas2DAdapter.
 */
export interface RendererBackend {
  readonly id: string
  /** Mount / bind to a host surface identifier (opaque to Core). */
  mount(surfaceId: string): void
  /** Project a scene onto the backend. */
  render(scene: RenderScene, context: RenderContext): void
  /** Tear down resources. */
  destroy(): void
}

/**
 * Canvas-oriented adapter surface (Stage size, DPR, resize).
 * Implementations live outside Core.
 */
export interface CanvasAdapter extends RendererBackend {
  resize(width: number, height: number, devicePixelRatio?: number): void
  clear(): void
}

/**
 * Alias retained for SDK docs — same as RendererBackend.
 * Note: `layout/RendererAdapter` remains the domain frame projector (unchanged).
 */
export type GraphicsAdapter = CanvasAdapter
