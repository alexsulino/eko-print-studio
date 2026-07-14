/**
 * Grid domain — overlay + snap configuration (independent of SnappingEngine consumption).
 */

export interface GridConfig {
  enabled: boolean
  visible: boolean
  snap: boolean
  /** Major cell size in document pixels. */
  sizePx: number
  /** Subdivisions between major lines (1 = no subgrid). */
  subdivisions: number
  color: string
  subdivisionColor: string
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
  enabled: true,
  visible: false,
  snap: false,
  sizePx: 8,
  subdivisions: 2,
  color: 'rgba(59, 130, 246, 0.35)',
  subdivisionColor: 'rgba(148, 163, 184, 0.25)',
}

/**
 * Ruler domain — tick generation inputs/outputs (pure; UI may render later).
 */
export type RulerOrientation = 'horizontal' | 'vertical'

export interface RulerTick {
  /** Position in document (or workspace-local) pixels. */
  position: number
  /** Label in display units, or null for minor ticks. */
  label: string | null
  major: boolean
}

export interface RulerModel {
  orientation: RulerOrientation
  unit: import('./document').Unit
  ticks: RulerTick[]
  /** Length of the measurable rule segment in document px. */
  lengthPx: number
}
