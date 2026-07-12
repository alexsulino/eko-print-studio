import type { AnchorPoint, AnchorPreset, DocumentSurface } from '@/types/layout'

/**
 * Anchor System — prepared presets for alignment / responsive templates.
 * Does not mutate documents; computes reference points only.
 */
export class AnchorSystem {
  static resolvePreset(
    preset: AnchorPreset,
    bounds: { x: number; y: number; width: number; height: number },
  ): { x: number; y: number } {
    const { x, y, width, height } = bounds
    switch (preset) {
      case 'top-left':
        return { x, y }
      case 'top-center':
        return { x: x + width / 2, y }
      case 'top-right':
        return { x: x + width, y }
      case 'middle-left':
        return { x, y: y + height / 2 }
      case 'center':
      case 'surface-center':
        return { x: x + width / 2, y: y + height / 2 }
      case 'middle-right':
        return { x: x + width, y: y + height / 2 }
      case 'bottom-left':
        return { x, y: y + height }
      case 'bottom-center':
        return { x: x + width / 2, y: y + height }
      case 'bottom-right':
        return { x: x + width, y: y + height }
      default: {
        const _exhaustive: never = preset
        return _exhaustive
      }
    }
  }

  static forSurface(surface: DocumentSurface, presets: AnchorPreset[] = ['center', 'top-left']): AnchorPoint[] {
    const bounds = {
      x: surface.offsetX ?? 0,
      y: surface.offsetY ?? 0,
      width: surface.width,
      height: surface.height,
    }
    return presets.map((preset) => {
      const point = AnchorSystem.resolvePreset(preset, bounds)
      return {
        id: `anchor_${surface.id}_${preset}`,
        preset,
        x: point.x,
        y: point.y,
        surfaceId: surface.id,
        pageId: surface.pageId,
      }
    })
  }
}
