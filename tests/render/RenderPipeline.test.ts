import { describe, expect, it, beforeEach } from 'vitest'
import { createEmptyDocument } from '@/core/document/createDocument'
import { LayoutResolver } from '@/core/layout/LayoutResolver'
import { RendererAdapter } from '@/core/layout/RendererAdapter'
import { registerBuiltins } from '@/core/registry/registerBuiltins'
import { ObjectFactory } from '@/core/objects/ObjectFactory'
import { RendererRegistry } from '@/core/render/RendererRegistry'
import { RenderPipeline } from '@/core/render/RenderPipeline'
import { createRenderContext } from '@/core/render/RenderContext'
import { OverlaySystem } from '@/core/render/OverlaySystem'
import { RenderCache } from '@/core/render/RenderCache'
import { createBuiltinObjectRenderers } from '@/core/render/renderers/builtinObjectRenderers'
import { KonvaAdapter } from '@/adapters/konva/KonvaAdapter'

describe('RenderPipeline & platform render contracts', () => {
  beforeEach(() => {
    registerBuiltins()
  })

  it('projects layout frame into content items via registry renderers', () => {
    const doc = createEmptyDocument()
    doc.metadata.name = 'Render test'
    const surfaceId = doc.surfaces?.[0]?.id
    const text = ObjectFactory.create(doc, 'text', {
      properties: { text: 'Hello', fontFamily: 'Inter', fontSize: 24, fill: '#111' },
      surfaceId,
    })!
    const shape = ObjectFactory.create(doc, 'shape', {
      properties: { shape: 'rect', fill: '#eee' },
      surfaceId,
    })!
    doc.elements = [text, shape]

    const layout = LayoutResolver.resolve(doc)
    const frame = RendererAdapter.toFrame(layout)
    const registry = new RendererRegistry()
    for (const r of createBuiltinObjectRenderers()) registry.register(r)

    const overlays = new OverlaySystem()
    overlays.register({
      kind: 'selection',
      contribute: (ctx) =>
        ctx.selectionIds.map((id, i) => ({
          kind: 'selection' as const,
          id: `sel-${id}`,
          zIndex: i,
          drawable: {
            kind: 'rect' as const,
            id: `sel-${id}`,
            transform: { x: 0, y: 0, width: 10, height: 10, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1,
            visible: true,
            locked: false,
          },
        })),
    })

    const pipeline = new RenderPipeline({ registry, overlays, cache: new RenderCache() })
    const context = createRenderContext({
      viewport: { zoom: 1, panX: 0, panY: 0, stageWidth: 800, stageHeight: 600 },
      selectionIds: [text.id],
      dpi: 96,
      devicePixelRatio: 1,
    })

    const scene = pipeline.run(frame, context)
    expect(scene.content.length).toBeGreaterThanOrEqual(2)
    expect(scene.content.some((i) => i.rendererKey === 'text')).toBe(true)
    expect(scene.content.some((i) => i.rendererKey === 'shape')).toBe(true)
    expect(scene.overlays.some((o) => o.kind === 'selection')).toBe(true)
    expect(scene.layers.find((l) => l.id === 'content')?.items.length).toBe(scene.content.length)
    expect(scene.layers.find((l) => l.id === 'overlay')?.items.length).toBe(scene.overlays.length)
  })

  it('KonvaAdapter stores last scene without Core importing Konva', () => {
    const adapter = new KonvaAdapter()
    adapter.mount('stage-1')
    adapter.resize(100, 80, 2)
    const emptyScene = {
      paper: { widthPx: 100, heightPx: 80, backgroundColor: '#fff' },
      surfaceId: null,
      pageId: null,
      content: [],
      overlays: [],
      layers: [],
      dirtyRegions: [],
    }
    const context = createRenderContext({
      viewport: { zoom: 1, panX: 0, panY: 0, stageWidth: 100, stageHeight: 80 },
    })
    adapter.render(emptyScene, context)
    expect(adapter.getLastScene()).toEqual(emptyScene)
    expect(adapter.getSize().dpr).toBe(2)
    adapter.destroy()
    expect(adapter.getLastScene()).toBeNull()
  })

  it('RenderCache supports dirty regions + typed entries', () => {
    const cache = new RenderCache()
    cache.set('text', 'el-1', 'glyph-run', 1)
    expect(cache.get('text', 'el-1')?.payload).toBe('glyph-run')
    cache.markDirty({ x: 0, y: 0, width: 10, height: 10, reason: 'edit' })
    expect(cache.consumeDirtyRegions()).toHaveLength(1)
    expect(cache.consumeDirtyRegions()).toHaveLength(0)
  })
})
