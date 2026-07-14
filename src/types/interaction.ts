import type { ElementTransform } from './element'

/** Transient UI interaction — never persisted in EkoDocument. */
export type InteractionTool = 'select' | 'hand' | 'text'

export type InteractionMode =
  | 'idle'
  | 'hover'
  | 'marquee'
  | 'dragging'
  | 'transforming'
  | 'resizing'
  | 'rotating'
  | 'panning'
  | 'editing'

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

export type SnapGuideKind =
  | 'edge'
  | 'center'
  | 'margin'
  | 'safe'
  | 'bleed'
  | 'object'
  | 'grid'
  | 'guide'
  | 'spacing'

export interface SnapGuide {
  orientation: 'vertical' | 'horizontal'
  position: number
  kind: SnapGuideKind
  /** Equal-gap length for spacing guides (document px). */
  spacing?: number
}

export type SnapPriority = SnapGuideKind

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
  /** Snap to a document-space grid. */
  grid: boolean
  gridSizePx: number
  /** Include persistent editor guides (GuidesEngine) as snap targets. */
  persistentGuides: boolean
  /**
   * Higher index = lower priority when deltas are within threshold.
   * First match among equally close candidates wins by priority order.
   */
  priorities: SnapPriority[]
}

export const DEFAULT_SNAP_PRIORITIES: SnapPriority[] = [
  'object',
  'center',
  'edge',
  'guide',
  'margin',
  'safe',
  'bleed',
  'grid',
  'spacing',
]

/** Full snap feature matrix (engine / tests / professional UX). */
export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: true,
  thresholdPx: 6,
  documentEdges: true,
  documentCenter: true,
  objectEdges: true,
  objectCenters: true,
  margins: true,
  safeArea: true,
  bleed: true,
  marginMm: 5,
  grid: false,
  gridSizePx: 8,
  persistentGuides: true,
  priorities: [...DEFAULT_SNAP_PRIORITIES],
}

/**
 * Canvas Interaction Foundation (Phase 7.3) — page edges + center only.
 * Kept for regression tests; runtime uses DEFAULT_SNAP_CONFIG.
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
  grid: false,
  gridSizePx: 8,
  persistentGuides: false,
  priorities: [...DEFAULT_SNAP_PRIORITIES],
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
  /** Ephemeral hover target — never part of selection or document. */
  hoveredId: string | null
  /** Shift held — lock aspect ratio during resize (keyboard-driven). */
  keepRatio: boolean
}

export const DEFAULT_INTERACTION_STATE: InteractionState = {
  tool: 'select',
  mode: 'idle',
  session: { ...IDLE_INTERACTION_SESSION },
  marquee: null,
  guides: [],
  snap: { ...DEFAULT_SNAP_CONFIG },
  spacePressed: false,
  hoveredId: null,
  keepRatio: false,
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
  originX?: number
  originY?: number
}

export type ElementTransformPatch = Partial<ElementTransform>

export type AlignMode =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'centerHorizontal'
  | 'centerVertical'

export type DistributeMode = 'horizontal' | 'vertical'
