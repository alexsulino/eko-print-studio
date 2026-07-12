import type { ElementTransform } from '@/types/element'
import type { TransformUpdate } from '@/types/interaction'

/**
 * Transformer Engine — document-space transform helpers.
 * Konva only reflects results; mutations always go to EkoDocument.
 */
export class TransformerEngine {
  static bakeScale(transform: ElementTransform): ElementTransform {
    const width = Math.max(8, Math.abs(transform.width * transform.scaleX))
    const height = Math.max(8, Math.abs(transform.height * transform.scaleY))
    const flipX = transform.scaleX < 0 ? -1 : 1
    const flipY = transform.scaleY < 0 ? -1 : 1
    return {
      ...transform,
      width,
      height,
      scaleX: flipX,
      scaleY: flipY,
    }
  }

  static proportionalResize(
    transform: ElementTransform,
    nextWidth: number,
    lockAspect = true,
  ): ElementTransform {
    const width = Math.max(8, nextWidth)
    if (!lockAspect) {
      return { ...transform, width }
    }
    const ratio = transform.height / Math.max(transform.width, 1)
    return {
      ...transform,
      width,
      height: Math.max(8, width * ratio),
    }
  }

  static freeResize(
    transform: ElementTransform,
    width: number,
    height: number,
  ): ElementTransform {
    return {
      ...transform,
      width: Math.max(8, width),
      height: Math.max(8, height),
    }
  }

  static rotate(transform: ElementTransform, rotation: number): ElementTransform {
    return { ...transform, rotation }
  }

  static flipHorizontal(transform: ElementTransform): ElementTransform {
    return { ...transform, scaleX: transform.scaleX * -1 }
  }

  static flipVertical(transform: ElementTransform): ElementTransform {
    return { ...transform, scaleY: transform.scaleY * -1 }
  }

  static applyPatch(transform: ElementTransform, patch: TransformUpdate): ElementTransform {
    return {
      x: patch.x ?? transform.x,
      y: patch.y ?? transform.y,
      width: patch.width ?? transform.width,
      height: patch.height ?? transform.height,
      rotation: patch.rotation ?? transform.rotation,
      scaleX: patch.scaleX ?? transform.scaleX,
      scaleY: patch.scaleY ?? transform.scaleY,
    }
  }

  static nudge(transform: ElementTransform, dx: number, dy: number): ElementTransform {
    return {
      ...transform,
      x: transform.x + dx,
      y: transform.y + dy,
    }
  }

  /** Future clamp hooks (bleed/safe/canvas). */
  static clampToBounds(
    transform: ElementTransform,
    bounds: { width: number; height: number },
  ): ElementTransform {
    const width = Math.min(transform.width, bounds.width)
    const height = Math.min(transform.height, bounds.height)
    const x = Math.min(Math.max(0, transform.x), Math.max(0, bounds.width - width))
    const y = Math.min(Math.max(0, transform.y), Math.max(0, bounds.height - height))
    return { ...transform, x, y, width, height }
  }
}
