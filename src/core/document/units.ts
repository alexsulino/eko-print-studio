import type { DocumentCanvas, Unit } from '@/types/document'
import type { DocumentPixelSize } from '@/types/viewport'

const MM_PER_INCH = 25.4
const CM_PER_INCH = 2.54

/** Convert a physical length to pixels at the given DPI. */
export function toPixels(value: number, unit: Unit, dpi: number): number {
  switch (unit) {
    case 'px':
      return value
    case 'mm':
      return (value / MM_PER_INCH) * dpi
    case 'cm':
      return (value / CM_PER_INCH) * dpi
    default: {
      const _exhaustive: never = unit
      return _exhaustive
    }
  }
}

/** Convert pixels back to a physical unit at the given DPI. */
export function fromPixels(px: number, unit: Unit, dpi: number): number {
  switch (unit) {
    case 'px':
      return px
    case 'mm':
      return (px / dpi) * MM_PER_INCH
    case 'cm':
      return (px / dpi) * CM_PER_INCH
    default: {
      const _exhaustive: never = unit
      return _exhaustive
    }
  }
}

export function getDocumentPixelSize(canvas: DocumentCanvas): DocumentPixelSize {
  return {
    widthPx: Math.round(toPixels(canvas.width, canvas.unit, canvas.dpi)),
    heightPx: Math.round(toPixels(canvas.height, canvas.unit, canvas.dpi)),
  }
}
