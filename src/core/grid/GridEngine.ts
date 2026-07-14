import type { GridConfig } from '@/types/grid'
import { DEFAULT_GRID_CONFIG } from '@/types/grid'

export interface GridLine {
  orientation: 'vertical' | 'horizontal'
  position: number
  major: boolean
}

export interface GridModel {
  config: GridConfig
  lines: GridLine[]
  /** Effective snap step in document px (accounts for subdivisions when snap is on). */
  snapStepPx: number
}

/**
 * Grid Engine — overlay lines + snap step for the document paper.
 * Adapts visual density to zoom (skips subdivision lines when zoomed out).
 * Does not own SnappingEngine — callers feed snapStep into snap config.
 */
export class GridEngine {
  static create(partial?: Partial<GridConfig>): GridConfig {
    return { ...DEFAULT_GRID_CONFIG, ...partial }
  }

  /**
   * Build grid lines covering [0, width] × [0, height] in document pixels.
   */
  static build(
    widthPx: number,
    heightPx: number,
    config: GridConfig = DEFAULT_GRID_CONFIG,
    zoom = 1,
  ): GridModel {
    const size = Math.max(1, config.sizePx)
    const subdivisions = Math.max(1, Math.floor(config.subdivisions))
    const minor = size / subdivisions
    const showSub = zoom >= 0.5 && subdivisions > 1
    const lines: GridLine[] = []

    if (!config.enabled || (!config.visible && !config.snap)) {
      return {
        config: { ...config },
        lines: [],
        snapStepPx: config.snap ? minor : size,
      }
    }

    if (config.visible) {
      for (let x = 0; x <= widthPx + 0.001; x += showSub ? minor : size) {
        const major = Math.abs(x / size - Math.round(x / size)) < 1e-6
        if (!major && !showSub) continue
        lines.push({ orientation: 'vertical', position: x, major })
      }
      for (let y = 0; y <= heightPx + 0.001; y += showSub ? minor : size) {
        const major = Math.abs(y / size - Math.round(y / size)) < 1e-6
        if (!major && !showSub) continue
        lines.push({ orientation: 'horizontal', position: y, major })
      }
    }

    return {
      config: { ...config },
      lines,
      snapStepPx: config.snap ? minor : size,
    }
  }

  static snapValue(value: number, stepPx: number): number {
    if (stepPx <= 0) return value
    return Math.round(value / stepPx) * stepPx
  }
}

export const gridEngine = {
  create: GridEngine.create.bind(GridEngine),
  build: GridEngine.build.bind(GridEngine),
  snapValue: GridEngine.snapValue.bind(GridEngine),
}
