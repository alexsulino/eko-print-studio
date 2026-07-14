import type { PassState, RenderPass } from './RenderPass'
import type { OverlayItem, RenderItem } from '../types'

export class VisibilityPass implements RenderPass {
  readonly id = 'visibility'

  execute(state: PassState): PassState {
    const elements = state.elements.filter((el) => el.visible !== false)
    const items = state.items.filter((item) => item.flags.visible && item.drawable.visible)
    return { ...state, elements, items }
  }
}

export class LockPass implements RenderPass {
  readonly id = 'lock'

  execute(state: PassState): PassState {
    const items = state.items.map((item) => {
      const el = state.elements.find((e) => e.id === item.elementId)
      const locked = Boolean(el?.locked) || item.flags.locked
      return {
        ...item,
        flags: { ...item.flags, locked },
        drawable: { ...item.drawable, locked },
      }
    })
    return { ...state, items }
  }
}

export class TransformPass implements RenderPass {
  readonly id = 'transform'

  execute(state: PassState): PassState {
    // Domain transforms already reside on elements/drawables.
    // Pass keeps the hook for constraint bake / origin pivots later.
    return state
  }
}

export class ClipPass implements RenderPass {
  readonly id = 'clip'

  execute(state: PassState): PassState {
    const items = state.items.map((item) => {
      const el = state.elements.find((e) => e.id === item.elementId)
      if (!el || (el.type !== 'frame' && el.type !== 'mask')) {
        return item
      }
      const { x, y, width, height } = el.transform
      return {
        ...item,
        flags: { ...item.flags, clipped: true },
        drawable: {
          ...item.drawable,
          clip: { x, y, width, height },
        },
      }
    })
    return { ...state, items }
  }
}

export class OpacityPass implements RenderPass {
  readonly id = 'opacity'

  execute(state: PassState): PassState {
    const items = state.items.map((item) => {
      const el = state.elements.find((e) => e.id === item.elementId)
      const opacity = el?.appearance?.opacity ?? item.flags.opacity
      return {
        ...item,
        flags: { ...item.flags, opacity },
        drawable: { ...item.drawable, opacity },
      }
    })
    return { ...state, items }
  }
}

export class EffectsPass implements RenderPass {
  readonly id = 'effects'

  execute(state: PassState): PassState {
    const items = state.items.map((item) => {
      const el = state.elements.find((e) => e.id === item.elementId)
      const shadow = el?.appearance?.shadow
      if (!shadow) return item
      return {
        ...item,
        drawable: {
          ...item.drawable,
          meta: { ...item.drawable.meta, shadow, blur: el?.appearance?.blur },
        },
      }
    })
    return { ...state, items }
  }
}

/** Maps elements → RenderItems via ObjectRenderer registry (called before content polish passes). */
export class ContentRenderPass implements RenderPass {
  readonly id = 'render'

  constructor(
    private readonly buildItems: (state: PassState) => RenderItem[],
  ) {}

  execute(state: PassState): PassState {
    return { ...state, items: this.buildItems(state) }
  }
}

export class OverlayPass implements RenderPass {
  readonly id = 'overlay'

  constructor(
    private readonly collect: (state: PassState) => OverlayItem[],
  ) {}

  execute(state: PassState): PassState {
    return { ...state, overlays: this.collect(state) }
  }
}
