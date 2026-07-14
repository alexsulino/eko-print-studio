import type { EkoElement } from '@/types/element'
import type { RenderContext } from '../RenderContext'
import type { OverlayItem, RenderItem } from '../types'

/** Mutable bag flowing through independent passes. */
export interface PassState {
  elements: EkoElement[]
  items: RenderItem[]
  overlays: OverlayItem[]
  context: RenderContext
}

/**
 * Single extensible pipeline stage.
 * New passes register without modifying existing ones.
 */
export interface RenderPass {
  readonly id: string
  execute(state: PassState): PassState
}
