import type { CanvasAdapter, GraphicsAdapter, RendererBackend } from '@/core/render/adapters/GraphicsAdapter'
import type { RenderContext } from '@/core/render/RenderContext'
import type { RenderScene } from '@/core/render/types'

/**
 * KonvaAdapter — concrete graphics backend.
 *
 * Lives outside `src/core` so Core stays free of Konva.
 * Current phase records the last scene for hosts / tests; full Stage sync
 * continues to live in React CanvasEditor until a gradual migration.
 */
export class KonvaAdapter implements CanvasAdapter {
  readonly id = 'konva'

  private surfaceId: string | null = null
  private lastScene: RenderScene | null = null
  private size = { width: 0, height: 0, dpr: 1 }
  private destroyed = false

  mount(surfaceId: string): void {
    this.destroyed = false
    this.surfaceId = surfaceId
  }

  resize(width: number, height: number, devicePixelRatio = 1): void {
    this.size = { width, height, dpr: devicePixelRatio }
  }

  clear(): void {
    this.lastScene = null
  }

  render(scene: RenderScene, _context: RenderContext): void {
    if (this.destroyed) return
    this.lastScene = scene
  }

  destroy(): void {
    this.destroyed = true
    this.lastScene = null
    this.surfaceId = null
  }

  getSurfaceId(): string | null {
    return this.surfaceId
  }

  getLastScene(): RenderScene | null {
    return this.lastScene
  }

  getSize(): { width: number; height: number; dpr: number } {
    return { ...this.size }
  }
}

export type { CanvasAdapter, GraphicsAdapter, RendererBackend }
