import type { EkoElement } from '@/types/element'
import type { ObjectRendererKey } from '@/core/registry/ObjectRegistry'
import type { RenderContext } from './RenderContext'
import type { DrawablePrimitive } from './types'

/**
 * Object renderer contract — one implementation per rendererKey.
 * Adding a renderer never mutates existing ones (open/closed).
 */
export interface ObjectRenderer {
  readonly key: ObjectRendererKey
  render(element: EkoElement, context: RenderContext): DrawablePrimitive
}

/**
 * Registry of object renderers (domain descriptors only — no Konva).
 */
export class RendererRegistry {
  private renderers = new Map<ObjectRendererKey, ObjectRenderer>()

  register(renderer: ObjectRenderer): void {
    this.renderers.set(renderer.key, renderer)
  }

  get(key: ObjectRendererKey): ObjectRenderer | undefined {
    return this.renderers.get(key)
  }

  has(key: ObjectRendererKey): boolean {
    return this.renderers.has(key)
  }

  list(): ObjectRenderer[] {
    return [...this.renderers.values()]
  }

  render(element: EkoElement, key: ObjectRendererKey, context: RenderContext): DrawablePrimitive {
    const renderer = this.renderers.get(key) ?? this.renderers.get('stub') ?? this.renderers.get('none')
    if (!renderer) {
      return makeStubDrawable(element)
    }
    return renderer.render(element, context)
  }
}

export const rendererRegistry = new RendererRegistry()

function makeStubDrawable(element: EkoElement): DrawablePrimitive {
  return {
    kind: 'stub',
    id: element.id,
    transform: { ...element.transform },
    opacity: 1,
    visible: element.visible !== false,
    locked: Boolean(element.locked),
    meta: { type: element.type },
  }
}
