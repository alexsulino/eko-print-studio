import type { RendererFrame } from '@/core/layout/RendererAdapter'
import { objectRegistry } from '@/core/registry/ObjectRegistry'
import type { RenderContext } from './RenderContext'
import { RendererRegistry, rendererRegistry } from './RendererRegistry'
import { OverlaySystem, overlaySystem } from './OverlaySystem'
import { RenderLayers } from './RenderLayers'
import { RenderCache, renderCache } from './RenderCache'
import type { RenderPass, PassState } from './passes/RenderPass'
import {
  VisibilityPass,
  LockPass,
  TransformPass,
  ClipPass,
  OpacityPass,
  EffectsPass,
  ContentRenderPass,
  OverlayPass,
} from './passes/builtinPasses'
import { createBuiltinObjectRenderers } from './renderers/builtinObjectRenderers'
import type { RenderItem, RenderScene } from './types'

export interface RenderPipelineOptions {
  registry?: RendererRegistry
  overlays?: OverlaySystem
  cache?: RenderCache
  passes?: RenderPass[]
}

/**
 * Modular render pipeline:
 * Visibility → Lock → Transform → Clip → Opacity → Effects → Render → Overlay
 *
 * Produces a framework-agnostic RenderScene for GraphicsAdapters.
 */
export class RenderPipeline {
  private readonly registry: RendererRegistry
  private readonly overlays: OverlaySystem
  private readonly cache: RenderCache
  private readonly passes: RenderPass[]

  constructor(options: RenderPipelineOptions = {}) {
    this.registry = options.registry ?? rendererRegistry
    this.overlays = options.overlays ?? overlaySystem
    this.cache = options.cache ?? renderCache

    if (options.passes) {
      this.passes = options.passes
    } else {
      this.passes = [
        new VisibilityPass(),
        new ContentRenderPass((state) => this.buildItems(state)),
        new LockPass(),
        new TransformPass(),
        new ClipPass(),
        new OpacityPass(),
        new EffectsPass(),
        new OverlayPass((state) => this.overlays.collect(state.context)),
      ]
    }
  }

  /** Ensure builtin object renderers are registered once. */
  ensureBuiltins(): void {
    if (this.registry.list().length > 0) return
    for (const renderer of createBuiltinObjectRenderers()) {
      this.registry.register(renderer)
    }
  }

  registerPass(pass: RenderPass, index?: number): void {
    if (index == null || index < 0 || index > this.passes.length) {
      this.passes.push(pass)
      return
    }
    this.passes.splice(index, 0, pass)
  }

  /**
   * Project a layout frame + context into a RenderScene.
   * Does not paint — adapters consume the scene.
   */
  run(frame: RendererFrame, context: RenderContext): RenderScene {
    this.ensureBuiltins()
    let state: PassState = {
      elements: frame.elements,
      items: [],
      overlays: [],
      context,
    }

    for (const pass of this.passes) {
      state = pass.execute(state)
    }

    const dirtyRegions = [
      ...context.dirtyRegions,
      ...this.cache.consumeDirtyRegions(),
    ]

    const layers = RenderLayers.build(state.items, state.overlays)

    return {
      paper: { ...frame.paper },
      surfaceId: frame.surfaceId,
      pageId: frame.pageId,
      content: state.items,
      overlays: state.overlays,
      layers,
      dirtyRegions,
    }
  }

  private buildItems(state: PassState): RenderItem[] {
    const items: RenderItem[] = []
    for (const element of state.elements) {
      if (element.type === 'group') continue
      const key = objectRegistry.rendererKey(element.type)
      if (key === 'none') continue
      const drawable = this.registry.render(element, key, state.context)
      if (state.context.editingElementId === element.id) {
        drawable.visible = false
      }
      items.push({
        elementId: element.id,
        elementType: element.type,
        rendererKey: key,
        drawable,
        flags: {
          visible: drawable.visible,
          locked: drawable.locked,
          opacity: drawable.opacity,
          clipped: Boolean(drawable.clip),
        },
      })
    }
    return items
  }
}

export const renderPipeline = new RenderPipeline()
