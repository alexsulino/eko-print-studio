import type { EkoDocument } from '@/types/document'
import type { EkoElement } from '@/types/element'
import type { EditorGuide } from '@/types/layout'
import type { SnapConfig, SnapGuide, SnapGuideKind, SnapPriority } from '@/types/interaction'
import { DEFAULT_SNAP_CONFIG, DEFAULT_SNAP_PRIORITIES } from '@/types/interaction'
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

export interface SnapCollectOptions {
  persistentGuides?: EditorGuide[]
}

/**
 * Snapping Engine — guides derived from EkoDocument (edges, center, objects,
 * margin, safe, bleed, grid, persistent guides) with configurable priority.
 */
export class SnappingEngine {
  static collectTargets(
    document: EkoDocument,
    movingIds: string[],
    config: SnapConfig = DEFAULT_SNAP_CONFIG,
    options: SnapCollectOptions = {},
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

    if (config.grid && config.gridSizePx > 0) {
      const step = config.gridSizePx
      for (let x = 0; x <= widthPx; x += step) {
        targets.push({ orientation: 'vertical', position: x, kind: 'grid' })
      }
      for (let y = 0; y <= heightPx; y += step) {
        targets.push({ orientation: 'horizontal', position: y, kind: 'grid' })
      }
    }

    if (config.persistentGuides && options.persistentGuides?.length) {
      for (const guide of options.persistentGuides) {
        targets.push({
          orientation: guide.orientation,
          position: guide.position,
          kind: 'guide',
        })
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
    const priorities = config.priorities?.length ? config.priorities : DEFAULT_SNAP_PRIORITIES
    const pointsX = [box.x, box.x + box.width / 2, box.x + box.width]
    const pointsY = [box.y, box.y + box.height / 2, box.y + box.height]

    let bestDx: { delta: number; guide: SnapGuide; priority: number } | null = null
    let bestDy: { delta: number; guide: SnapGuide; priority: number } | null = null

    for (const target of targets) {
      const priority = priorityIndex(priorities, target.kind)
      if (target.orientation === 'vertical') {
        for (const px of pointsX) {
          const delta = target.position - px
          const abs = Math.abs(delta)
          if (abs > threshold) continue
          if (
            !bestDx ||
            abs < Math.abs(bestDx.delta) - 0.01 ||
            (nearlyEqual(abs, Math.abs(bestDx.delta)) && priority < bestDx.priority)
          ) {
            bestDx = {
              delta,
              priority,
              guide: { orientation: 'vertical', position: target.position, kind: target.kind },
            }
          }
        }
      } else {
        for (const py of pointsY) {
          const delta = target.position - py
          const abs = Math.abs(delta)
          if (abs > threshold) continue
          if (
            !bestDy ||
            abs < Math.abs(bestDy.delta) - 0.01 ||
            (nearlyEqual(abs, Math.abs(bestDy.delta)) && priority < bestDy.priority)
          ) {
            bestDy = {
              delta,
              priority,
              guide: { orientation: 'horizontal', position: target.position, kind: target.kind },
            }
          }
        }
      }
    }

    const x = box.x + (bestDx?.delta ?? 0)
    const y = box.y + (bestDy?.delta ?? 0)

    const guides: SnapGuide[] = []
    if (bestDx) guides.push(bestDx.guide)
    if (bestDy) guides.push(bestDy.guide)

    return { x, y, guides }
  }

  /**
   * Equal-gap spacing guides vs neighboring objects (Canva-style).
   * Pure detection — does not mutate position.
   */
  static detectSpacingGuides(
    box: SnapInputBox,
    others: SnapInputBox[],
    thresholdPx = 6,
  ): SnapGuide[] {
    const guides: SnapGuide[] = []
    const gapsX: Array<{ gap: number; edge: number }> = []
    const gapsY: Array<{ gap: number; edge: number }> = []

    for (const other of others) {
      const gapRight = other.x - (box.x + box.width)
      if (gapRight > 0) gapsX.push({ gap: gapRight, edge: box.x + box.width })
      const gapLeft = box.x - (other.x + other.width)
      if (gapLeft > 0) gapsX.push({ gap: gapLeft, edge: other.x + other.width })

      const gapBelow = other.y - (box.y + box.height)
      if (gapBelow > 0) gapsY.push({ gap: gapBelow, edge: box.y + box.height })
      const gapAbove = box.y - (other.y + other.height)
      if (gapAbove > 0) gapsY.push({ gap: gapAbove, edge: other.y + other.height })
    }

    const matchX = findEqualGapPair(gapsX, thresholdPx)
    if (matchX) {
      guides.push({
        orientation: 'vertical',
        position: matchX.edge + matchX.gap / 2,
        kind: 'spacing',
        spacing: matchX.gap,
      })
    }
    const matchY = findEqualGapPair(gapsY, thresholdPx)
    if (matchY) {
      guides.push({
        orientation: 'horizontal',
        position: matchY.edge + matchY.gap / 2,
        kind: 'spacing',
        spacing: matchY.gap,
      })
    }

    return guides
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

function priorityIndex(priorities: SnapPriority[], kind: SnapGuideKind): number {
  const idx = priorities.indexOf(kind)
  return idx === -1 ? priorities.length : idx
}

function nearlyEqual(a: number, b: number, eps = 0.5): boolean {
  return Math.abs(a - b) <= eps
}

function findEqualGapPair(
  gaps: Array<{ gap: number; edge: number }>,
  thresholdPx: number,
): { gap: number; edge: number } | null {
  if (gaps.length < 2) return null
  for (let i = 0; i < gaps.length; i++) {
    for (let j = i + 1; j < gaps.length; j++) {
      const a = gaps[i]!
      const b = gaps[j]!
      if (Math.abs(a.gap - b.gap) <= thresholdPx && a.gap > 1) {
        return a
      }
    }
  }
  return null
}
