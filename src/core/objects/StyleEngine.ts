import type { EkoElement, ElementAppearance } from '@/types/element'

/**
 * Style Engine — read/write appearance without touching geometry.
 * Bridges shared `appearance` with legacy type-specific property fields.
 */
export class StyleEngine {
  static getAppearance(element: EkoElement): ElementAppearance {
    if (element.appearance) {
      return { ...element.appearance }
    }
    return StyleEngine.fromProperties(element)
  }

  static fromProperties(element: EkoElement): ElementAppearance {
    if (element.type === 'text') {
      return {
        fill: element.properties.fill,
        opacity: 1,
      }
    }
    if (element.type === 'shape') {
      return {
        fill: element.properties.fill,
        stroke: element.properties.stroke,
        strokeWidth: element.properties.strokeWidth,
        cornerRadius: element.properties.cornerRadius,
        opacity: element.properties.opacity ?? 1,
      }
    }
    if (element.type === 'image') {
      return {
        opacity: element.properties.opacity ?? 1,
      }
    }
    return { opacity: 1 }
  }

  /** Merge appearance patch; mirrors fill/stroke into type properties when present. */
  static applyAppearance(element: EkoElement, patch: Partial<ElementAppearance>): EkoElement {
    const nextAppearance: ElementAppearance = {
      ...StyleEngine.getAppearance(element),
      ...patch,
    }
    const updated: EkoElement = {
      ...element,
      appearance: nextAppearance,
      updatedAt: new Date().toISOString(),
      metadata: {
        ...element.metadata,
        updatedAt: new Date().toISOString(),
      },
    }

    if (updated.type === 'text' && patch.fill !== undefined) {
      return {
        ...updated,
        type: 'text',
        properties: { ...updated.properties, fill: patch.fill },
      }
    }
    if (updated.type === 'shape') {
      return {
        ...updated,
        type: 'shape',
        properties: {
          ...updated.properties,
          ...(patch.fill !== undefined ? { fill: patch.fill } : {}),
          ...(patch.stroke !== undefined ? { stroke: patch.stroke } : {}),
          ...(patch.strokeWidth !== undefined ? { strokeWidth: patch.strokeWidth } : {}),
          ...(patch.cornerRadius !== undefined ? { cornerRadius: patch.cornerRadius } : {}),
          ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {}),
        },
      }
    }
    if (updated.type === 'image' && patch.opacity !== undefined) {
      return {
        ...updated,
        type: 'image',
        properties: { ...updated.properties, opacity: patch.opacity },
      }
    }
    return updated
  }
}
