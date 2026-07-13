import {
  FOUNDATION_SNAP_CONFIG,
  type SnapConfig,
} from '@/types/interaction'

/** @deprecated Prefer FOUNDATION_SNAP_CONFIG from types — alias for editor imports. */
export const CANVAS_FOUNDATION_SNAP: SnapConfig = { ...FOUNDATION_SNAP_CONFIG }

/** Future-facing snap feature flags (not active in 7.3). */
export interface SnapRoadmapFlags {
  grid: boolean
  guides: boolean
  smartAlignment: boolean
}

export const SNAP_ROADMAP_DEFAULTS: SnapRoadmapFlags = {
  grid: false,
  guides: false,
  smartAlignment: false,
}
