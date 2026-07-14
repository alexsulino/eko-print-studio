import { UnitsEngine } from '@/core/units'
import type { EkoDocument } from '@/types/document'
import type { LayoutBounds } from '@/types/layout'
import { LayoutResolver, type LayoutResolveOptions, type ResolvedLayout } from './LayoutResolver'
import { RendererAdapter, type RendererFrame } from './RendererAdapter'

/**
 * Layout Engine — print geometry (bleed / safe / margin / crop / printable)
 * independent of Konva rendering. Delegates active view resolve to LayoutResolver.
 */
export class LayoutEngine {
  static resolve(document: EkoDocument, options: LayoutResolveOptions = {}): ResolvedLayout {
    return LayoutResolver.resolve(document, options)
  }

  static toFrame(layout: ResolvedLayout): RendererFrame {
    return RendererAdapter.toFrame(layout)
  }

  /**
   * Derive layout bounds in document pixels from canvas + production meta.
   * Region list from the document is preferred when present.
   */
  static bounds(
    document: EkoDocument,
    options: LayoutResolveOptions = {},
  ): LayoutBounds {
    const layout = LayoutResolver.resolve(document, options)
    const { widthPx, heightPx } = layout.paper
    const dpi = document.canvas.dpi
    const production = document.metadata.production

    const crop = { x: 0, y: 0, width: widthPx, height: heightPx }

    const fromRegions = layout.regions
    const printableRegion = fromRegions.find((r) => r.kind === 'printable')
    const safeRegion = fromRegions.find((r) => r.kind === 'safe')
    const bleedRegion = fromRegions.find((r) => r.kind === 'bleed')
    const marginRegion = fromRegions.find((r) => r.kind === 'margin')

    const safeInset =
      production?.safeAreaMm != null
        ? Math.round(UnitsEngine.toPixels(production.safeAreaMm, 'mm', dpi))
        : null
    const bleedInset =
      production?.bleedMm != null
        ? Math.round(UnitsEngine.toPixels(production.bleedMm, 'mm', dpi))
        : null

    const printable = printableRegion
      ? {
          x: printableRegion.x,
          y: printableRegion.y,
          width: printableRegion.width,
          height: printableRegion.height,
        }
      : crop

    const safe = safeRegion
      ? {
          x: safeRegion.x,
          y: safeRegion.y,
          width: safeRegion.width,
          height: safeRegion.height,
        }
      : safeInset != null
        ? {
            x: safeInset,
            y: safeInset,
            width: Math.max(1, widthPx - safeInset * 2),
            height: Math.max(1, heightPx - safeInset * 2),
          }
        : null

    const bleed = bleedRegion
      ? {
          x: bleedRegion.x,
          y: bleedRegion.y,
          width: bleedRegion.width,
          height: bleedRegion.height,
        }
      : bleedInset != null
        ? {
            x: -bleedInset,
            y: -bleedInset,
            width: widthPx + bleedInset * 2,
            height: heightPx + bleedInset * 2,
          }
        : null

    const margin = marginRegion
      ? {
          x: marginRegion.x,
          y: marginRegion.y,
          width: marginRegion.width,
          height: marginRegion.height,
        }
      : null

    return { printable, safe, bleed, margin, crop }
  }
}
