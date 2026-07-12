import type { ElementTransform } from './element'

/** Transient UI interaction — never persisted in EkoDocument. */
export type InteractionTool = 'select' | 'hand'

export type InteractionMode = 'idle' | 'marquee' | 'dragging' | 'transforming' | 'panning'

export interface MarqueeRect {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type SnapGuideKind = 'edge' | 'center' | 'margin' | 'safe' | 'bleed' | 'object'

export interface SnapGuide {
  orientation: 'vertical' | 'horizontal'
  position: number
  kind: SnapGuideKind
}

export interface SnapConfig {
  enabled: boolean
  thresholdPx: number
  documentEdges: boolean
  documentCenter: boolean
  objectEdges: boolean
  objectCenters: boolean
  margins: boolean
  safeArea: boolean
  bleed: boolean
  marginMm: number
}

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: true,
  thresholdPx: 8,
  documentEdges: true,
  documentCenter: true,
  objectEdges: true,
  objectCenters: true,
  margins: true,
  safeArea: true,
  bleed: true,
  marginMm: 5,
}

export interface InteractionState {
  tool: InteractionTool
  mode: InteractionMode
  marquee: MarqueeRect | null
  guides: SnapGuide[]
  snap: SnapConfig
  spacePressed: boolean
}

export const DEFAULT_INTERACTION_STATE: InteractionState = {
  tool: 'select',
  mode: 'idle',
  marquee: null,
  guides: [],
  snap: { ...DEFAULT_SNAP_CONFIG },
  spacePressed: false,
}

export interface ClipboardPayload {
  elements: import('./element').EkoElement[]
  copiedAt: number
}

export interface TransformUpdate {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
}

export type ElementTransformPatch = Partial<ElementTransform>
