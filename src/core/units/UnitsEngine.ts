import type { DocumentCanvas, Unit } from '@/types/document'
import type { DocumentPixelSize } from '@/types/viewport'

const MM_PER_INCH = 25.4
const CM_PER_INCH = 2.54
const PT_PER_INCH = 72

/**
 * Units Engine — single source of truth for length conversions.
 * All other modules must convert through this engine (no scattered DPI math).
 */
export class UnitsEngine {
  static readonly SUPPORTED: readonly Unit[] = ['mm', 'cm', 'px', 'in', 'pt']

  static isUnit(value: string): value is Unit {
    return (UnitsEngine.SUPPORTED as readonly string[]).includes(value)
  }

  /** Convert a physical length to pixels at the given DPI. */
  static toPixels(value: number, unit: Unit, dpi: number): number {
    switch (unit) {
      case 'px':
        return value
      case 'mm':
        return (value / MM_PER_INCH) * dpi
      case 'cm':
        return (value / CM_PER_INCH) * dpi
      case 'in':
        return value * dpi
      case 'pt':
        return (value / PT_PER_INCH) * dpi
      default: {
        const _exhaustive: never = unit
        return _exhaustive
      }
    }
  }

  /** Convert pixels back to a physical unit at the given DPI. */
  static fromPixels(px: number, unit: Unit, dpi: number): number {
    switch (unit) {
      case 'px':
        return px
      case 'mm':
        return (px / dpi) * MM_PER_INCH
      case 'cm':
        return (px / dpi) * CM_PER_INCH
      case 'in':
        return px / dpi
      case 'pt':
        return (px / dpi) * PT_PER_INCH
      default: {
        const _exhaustive: never = unit
        return _exhaustive
      }
    }
  }

  /** Convert between any two units at the given DPI. */
  static convert(value: number, from: Unit, to: Unit, dpi: number): number {
    if (from === to) return value
    return UnitsEngine.fromPixels(UnitsEngine.toPixels(value, from, dpi), to, dpi)
  }

  static getDocumentPixelSize(canvas: DocumentCanvas): DocumentPixelSize {
    return {
      widthPx: Math.round(UnitsEngine.toPixels(canvas.width, canvas.unit, canvas.dpi)),
      heightPx: Math.round(UnitsEngine.toPixels(canvas.height, canvas.unit, canvas.dpi)),
    }
  }

  /** Compact label for UI (rulers, status bar). */
  static format(value: number, unit: Unit, digits = 2): string {
    if (unit === 'px') return `${Math.round(value)}px`
    const rounded = Number(value.toFixed(digits))
    return `${rounded}${unit}`
  }

  /**
   * Nice step size in document px for a given zoom + display unit.
   * Used by RulerEngine — keeps tick density Canva-like.
   */
  static niceStepPx(displayUnit: Unit, dpi: number, zoom: number, targetScreenPx = 80): number {
    const docPxPerScreen = targetScreenPx / Math.max(zoom, 0.01)
    const physical = UnitsEngine.fromPixels(docPxPerScreen, displayUnit, dpi)
    const nice = niceNumber(physical)
    return Math.max(1, UnitsEngine.toPixels(nice, displayUnit, dpi))
  }
}

function niceNumber(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1
  const exp = Math.floor(Math.log10(value))
  const fraction = value / Math.pow(10, exp)
  let niceFraction: number
  if (fraction < 1.5) niceFraction = 1
  else if (fraction < 3) niceFraction = 2
  else if (fraction < 7) niceFraction = 5
  else niceFraction = 10
  return niceFraction * Math.pow(10, exp)
}

/** @deprecated Prefer UnitsEngine — kept for existing imports. */
export function toPixels(value: number, unit: Unit, dpi: number): number {
  return UnitsEngine.toPixels(value, unit, dpi)
}

/** @deprecated Prefer UnitsEngine — kept for existing imports. */
export function fromPixels(px: number, unit: Unit, dpi: number): number {
  return UnitsEngine.fromPixels(px, unit, dpi)
}

/** @deprecated Prefer UnitsEngine — kept for existing imports. */
export function getDocumentPixelSize(canvas: DocumentCanvas): DocumentPixelSize {
  return UnitsEngine.getDocumentPixelSize(canvas)
}
