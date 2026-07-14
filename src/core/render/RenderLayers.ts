import type { OverlayItem, RenderItem, RenderLayer, RenderLayerId } from './types'

/**
 * Named render layers — content never shares a bucket with overlays.
 */
export class RenderLayers {
  static build(content: RenderItem[], overlays: OverlayItem[]): RenderLayer[] {
    const sortedOverlays = [...overlays].sort((a, b) => a.zIndex - b.zIndex)
    return [
      { id: 'pasteboard', items: [], visible: true },
      { id: 'paper', items: [], visible: true },
      { id: 'content', items: content, visible: true },
      { id: 'effects', items: [], visible: true },
      { id: 'overlay', items: sortedOverlays, visible: true },
      { id: 'diagnostics', items: [], visible: false },
    ]
  }

  static get(layers: RenderLayer[], id: RenderLayerId): RenderLayer | undefined {
    return layers.find((layer) => layer.id === id)
  }
}
