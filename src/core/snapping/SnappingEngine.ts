import type { EkoDocument } from '@/types/document'
import type { EkoElement } from '@/types/element'
import type { SnapConfig, SnapGuide } from '@/types/interaction'
import { DEFAULT_SNAP_CONFIG } from '@/types/interaction'
import { getDocumentPixelSize, toPixels } from '@/core/document/units'

export interface SnapTarget {
  orientation: 'vertical' | 'horizontal'
  position: number
  kind: SnapGuide['kind']
}

export interface SnapInputBox {
  id?: string
  x: number
  y: number
  width: number
  height: number
}

export interface SnapResult {
  x: number
  y: number
  guides: SnapGuide[]
}

/**
 * Snapping Engine — guides derived from EkoDocument (edges, center, objects, margin, safe, bleed).
 */
export class SnappingEngine {
  static collectTargets(
    document: EkoDocument,
    movingIds: string[],
    config: SnapConfig = DEFAULT_SNAP_CONFIG,
  ): SnapTarget[] {
    if (!config.enabled) return []

    const { widthPx, heightPx } = getDocumentPixelSize(document.canvas)
    const targets: SnapTarget[] = []
    const dpi = document.canvas.dpi

    if (config.documentEdges) {
      targets.push(
        { orientation: 'vertical', position: 0, kind: 'edge' },
        { orientation: 'vertical', position: widthPx, kind: 'edge' },
        { orientation: 'horizontal', position: 0, kind: 'edge' },
        { orientation: 'horizontal', position: heightPx, kind: 'edge' },
      )
    }

    if (config.documentCenter) {
      targets.push(
        { orientation: 'vertical', position: widthPx / 2, kind: 'center' },
        { orientation: 'horizontal', position: heightPx / 2, kind: 'center' },
      )
    }

    if (config.margins) {
      const margin = toPixels(config.marginMm, 'mm', dpi)
      targets.push(
        { orientation: 'vertical', position: margin, kind: 'margin' },
        { orientation: 'vertical', position: widthPx - margin, kind: 'margin' },
        { orientation: 'horizontal', position: margin, kind: 'margin' },
        { orientation: 'horizontal', position: heightPx - margin, kind: 'margin' },
      )
    }

    const production = document.metadata.production
    if (config.safeArea && production?.safeAreaMm != null) {
      const safe = toPixels(production.safeAreaMm, 'mm', dpi)
      targets.push(
        { orientation: 'vertical', position: safe, kind: 'safe' },
        { orientation: 'vertical', position: widthPx - safe, kind: 'safe' },
        { orientation: 'horizontal', position: safe, kind: 'safe' },
        { orientation: 'horizontal', position: heightPx - safe, kind: 'safe' },
      )
    }

    if (config.bleed && production?.bleedMm != null) {
      const bleed = toPixels(production.bleedMm, 'mm', dpi)
      targets.push(
        { orientation: 'vertical', position: -bleed, kind: 'bleed' },
        { orientation: 'vertical', position: widthPx + bleed, kind: 'bleed' },
        { orientation: 'horizontal', position: -bleed, kind: 'bleed' },
        { orientation: 'horizontal', position: heightPx + bleed, kind: 'bleed' },
      )
    }

    if (config.objectEdges || config.objectCenters) {
      for (const el of document.elements) {
        if (!el.visible || movingIds.includes(el.id)) continue
        const box = elementBox(el)
        if (config.objectEdges) {
          targets.push(
            { orientation: 'vertical', position: box.x, kind: 'object' },
            { orientation: 'vertical', position: box.x + box.width, kind: 'object' },
            { orientation: 'horizontal', position: box.y, kind: 'object' },
            { orientation: 'horizontal', position: box.y + box.height, kind: 'object' },
          )
        }
        if (config.objectCenters) {
          targets.push(
            { orientation: 'vertical', position: box.x + box.width / 2, kind: 'center' },
            { orientation: 'horizontal', position: box.y + box.height / 2, kind: 'center' },
          )
        }
      }
    }

    return targets
  }

  static snapBox(
    box: SnapInputBox,
    targets: SnapTarget[],
    config: SnapConfig = DEFAULT_SNAP_CONFIG,
  ): SnapResult {
    if (!config.enabled) {
      return { x: box.x, y: box.y, guides: [] }
    }

    const threshold = config.thresholdPx
    const pointsX = [box.x, box.x + box.width / 2, box.x + box.width]
    const pointsY = [box.y, box.y + box.height / 2, box.y + box.height]

    let bestDx: { delta: number; guide: SnapGuide } | null = null
    let bestDy: { delta: number; guide: SnapGuide } | null = null

    for (const target of targets) {
      if (target.orientation === 'vertical') {
        for (const px of pointsX) {
          const delta = target.position - px
          if (Math.abs(delta) <= threshold && (!bestDx || Math.abs(delta) < Math.abs(bestDx.delta))) {
            bestDx = {
              delta,
              guide: { orientation: 'vertical', position: target.position, kind: target.kind },
            }
          }
        }
      } else {
        for (const py of pointsY) {
          const delta = target.position - py
          if (Math.abs(delta) <= threshold && (!bestDy || Math.abs(delta) < Math.abs(bestDy.delta))) {
            bestDy = {
              delta,
              guide: { orientation: 'horizontal', position: target.position, kind: target.kind },
            }
          }
        }
      }
    }

    const guides: SnapGuide[] = []
    if (bestDx) guides.push(bestDx.guide)
    if (bestDy) guides.push(bestDy.guide)

    return {
      x: box.x + (bestDx?.delta ?? 0),
      y: box.y + (bestDy?.delta ?? 0),
      guides,
    }
  }
}

function elementBox(el: EkoElement): SnapInputBox {
  return {
    id: el.id,
    x: el.transform.x,
    y: el.transform.y,
    width: Math.abs(el.transform.width * el.transform.scaleX),
    height: Math.abs(el.transform.height * el.transform.scaleY),
  }
}
