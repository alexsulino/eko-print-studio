import type { EkoElement, ElementTransform } from '@/types/element'
import type { ObjectRendererKey } from '@/core/registry/ObjectRegistry'

/**
 * Framework-agnostic drawable produced by object renderers.
 * Adapters (Konva / Pixi / Canvas2D / …) consume this — Core never paints.
 */
export interface DrawablePrimitive {
  kind: 'rect' | 'ellipse' | 'text' | 'image' | 'path' | 'group' | 'stub'
  id: string
  transform: ElementTransform
  opacity: number
  visible: boolean
  locked: boolean
  clip?: { x: number; y: number; width: number; height: number }
  fill?: string
  stroke?: string
  strokeWidth?: number
  cornerRadius?: number
  text?: string
  fontSize?: number
  fontFamily?: string
  imageSrc?: string
  pathData?: string
  children?: DrawablePrimitive[]
  meta?: Record<string, unknown>
}

/** One element after pipeline passes — ready for graphics adapter. */
export interface RenderItem {
  elementId: string
  elementType: EkoElement['type']
  rendererKey: ObjectRendererKey
  drawable: DrawablePrimitive
  /** Pass metadata (effects, clip, etc.). */
  flags: {
    visible: boolean
    locked: boolean
    opacity: number
    clipped: boolean
  }
}

export type OverlayKind =
  | 'selection'
  | 'hover'
  | 'snap'
  | 'guides'
  | 'grid'
  | 'bounds'
  | 'diagnostics'
  | 'cursor'
  | 'regions'

/** Overlay contribution — never mixed into object content. */
export interface OverlayItem {
  kind: OverlayKind
  id: string
  drawable: DrawablePrimitive
  zIndex: number
}

export type RenderLayerId =
  | 'pasteboard'
  | 'paper'
  | 'content'
  | 'effects'
  | 'overlay'
  | 'diagnostics'

export interface RenderLayer {
  id: RenderLayerId
  items: RenderItem[] | OverlayItem[]
  visible: boolean
}

/** Full scene graph produced by RenderPipeline. */
export interface RenderScene {
  paper: {
    widthPx: number
    heightPx: number
    backgroundColor: string
  }
  surfaceId: string | null
  pageId: string | null
  content: RenderItem[]
  overlays: OverlayItem[]
  layers: RenderLayer[]
  dirtyRegions: DirtyRegion[]
}

export interface DirtyRegion {
  x: number
  y: number
  width: number
  height: number
  reason?: string
}

export interface FrameBudget {
  /** Target max ms per frame (e.g. 16.6 for 60fps). */
  maxMs: number
  /** Hint for partial / lazy render. */
  preferPartial: boolean
}
