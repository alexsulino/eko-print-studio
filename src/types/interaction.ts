import type { ElementTransform } from './element'

/** Transient UI interaction — never persisted in EkoDocument. */
export type InteractionTool = 'select' | 'hand'

export type InteractionMode = 'idle' | 'marquee' | 'dragging' | 'transforming' | 'panning'

/**
 * Modal editor session — single entity for text edit, crop, path edit, etc.
 * Avoids proliferating boolean flags on InteractionState.
 */
export type InteractionSessionKind = 'none' | 'textEdit' | 'crop' | 'pathEdit'

export interface InteractionSession {
  kind: InteractionSessionKind
  /** Target element while a session is active; null when kind === 'none'. */
  elementId: string | null
  /**
   * Opaque coordination bag per kind.
   * Never store draft text, caret, selection range, or overlay layout here.
   */
  meta?: Record<string, unknown>
}

export const IDLE_INTERACTION_SESSION: InteractionSession = {
  kind: 'none',
  elementId: null,
}

export function isInteractionSession(
  session: InteractionSession,
  kind: Exclude<InteractionSessionKind, 'none'>,
): boolean {
  return session.kind === kind && Boolean(session.elementId)
}
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

/** Full snap feature matrix (engine / tests). */
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

/**
 * Canvas Interaction Foundation (Phase 7.3) — page edges + center only.
 * Object/margin/safe/bleed remain available via SnapConfig for later phases.
 */
export const FOUNDATION_SNAP_CONFIG: SnapConfig = {
  enabled: true,
  thresholdPx: 8,
  documentEdges: true,
  documentCenter: true,
  objectEdges: false,
  objectCenters: false,
  margins: false,
  safeArea: false,
  bleed: false,
  marginMm: 5,
}

export interface InteractionState {
  tool: InteractionTool
  mode: InteractionMode
  /** Modal tool session (text edit, crop, …) — not pointer gesture mode. */
  session: InteractionSession
  marquee: MarqueeRect | null
  guides: SnapGuide[]
  snap: SnapConfig
  spacePressed: boolean
}

export const DEFAULT_INTERACTION_STATE: InteractionState = {
  tool: 'select',
  mode: 'idle',
  session: { ...IDLE_INTERACTION_SESSION },
  marquee: null,
  guides: [],
  snap: { ...FOUNDATION_SNAP_CONFIG },
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
