import type { DocumentRegion } from '@/types/layout'
import type { EkoElement } from '@/types/element'
import type { ResolvedLayout } from '@/core/layout/LayoutResolver'

/**
 * Renderer projection model — still domain-shaped.
 * Consumed by RenderPipeline / GraphicsAdapters; React/Konva never write back into EkoDocument.
 */
export interface RendererFrame {
  paper: {
    widthPx: number
    heightPx: number
    backgroundColor: string
  }
  elements: EkoElement[]
  regions: Array<DocumentRegion & { stroke: string; dash?: number[] }>
  surfaceId: string | null
  pageId: string | null
}

/**
 * Domain frame adapter — EkoDocument layout → renderer frame (no paint library).
 *
 * EkoDocument → Layout Resolver → Renderer Adapter → Render Pipeline → GraphicsAdapter
 */
export class RendererAdapter {
  static toFrame(layout: ResolvedLayout): RendererFrame {
    return {
      paper: {
        widthPx: layout.paper.widthPx,
        heightPx: layout.paper.heightPx,
        backgroundColor: layout.paper.backgroundColor ?? '#ffffff',
      },
      elements: layout.elements,
      regions: layout.regions
        .filter((r) => r.visible)
        .map((region) => ({
          ...region,
          stroke: regionStroke(region.kind),
          dash: region.kind === 'bleed' || region.kind === 'safe' ? [6, 4] : undefined,
        })),
      surfaceId: layout.surface?.id ?? null,
      pageId: layout.page?.id ?? null,
    }
  }
}

function regionStroke(kind: DocumentRegion['kind']): string {
  switch (kind) {
    case 'printable':
      return 'rgba(20,32,51,0.15)'
    case 'safe':
      return 'rgba(15,107,76,0.55)'
    case 'bleed':
      return 'rgba(155,28,28,0.55)'
    case 'margin':
      return 'rgba(11,87,164,0.45)'
    default:
      return 'rgba(37,99,235,0.45)'
  }
}
