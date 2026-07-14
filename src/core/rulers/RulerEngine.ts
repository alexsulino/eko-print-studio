import { UnitsEngine } from '@/core/units'
import type { Unit } from '@/types/document'
import type { RulerModel, RulerOrientation, RulerTick } from '@/types/grid'

export interface RulerBuildOptions {
  orientation: RulerOrientation
  /** Length of the rule in document pixels. */
  lengthPx: number
  /** Display unit for labels. */
  unit: Unit
  dpi: number
  zoom: number
  /** Document-space start offset (e.g. scroll). */
  originPx?: number
}

/**
 * Ruler Engine — pure tick generation for horizontal/vertical rulers.
 * Adapts major step to zoom via UnitsEngine.niceStepPx (Canva-like density).
 * UI can consume `RulerModel` without owning conversion logic.
 */
export class RulerEngine {
  static build(options: RulerBuildOptions): RulerModel {
    const origin = options.originPx ?? 0
    const majorStep = UnitsEngine.niceStepPx(options.unit, options.dpi, options.zoom)
    const minorStep = majorStep / 2
    const ticks: RulerTick[] = []

    const start = Math.floor(origin / minorStep) * minorStep
    const end = origin + options.lengthPx

    for (let pos = start; pos <= end + 0.001; pos += minorStep) {
      const major = Math.abs(pos / majorStep - Math.round(pos / majorStep)) < 1e-6
      const label = major
        ? UnitsEngine.format(UnitsEngine.fromPixels(pos, options.unit, options.dpi), options.unit)
        : null
      ticks.push({ position: pos, label, major })
    }

    return {
      orientation: options.orientation,
      unit: options.unit,
      ticks,
      lengthPx: options.lengthPx,
    }
  }

  static horizontal(lengthPx: number, unit: Unit, dpi: number, zoom: number): RulerModel {
    return RulerEngine.build({
      orientation: 'horizontal',
      lengthPx,
      unit,
      dpi,
      zoom,
    })
  }

  static vertical(lengthPx: number, unit: Unit, dpi: number, zoom: number): RulerModel {
    return RulerEngine.build({
      orientation: 'vertical',
      lengthPx,
      unit,
      dpi,
      zoom,
    })
  }
}
