import type { EkoElement, ElementType } from '@/types/element'

/**
 * Naming Engine — automatic non-colliding display names (Rectangle 1, Text 2, …).
 */
export class NamingEngine {
  static nextName(existing: EkoElement[], baseLabel: string): string {
    const escaped = baseLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`^${escaped}(?:\\s+(\\d+))?$`, 'i')
    let max = 0
    for (const el of existing) {
      const name = el.name?.trim()
      if (!name) continue
      const match = name.match(pattern)
      if (!match) continue
      const n = match[1] ? Number(match[1]) : 1
      if (Number.isFinite(n)) max = Math.max(max, n)
    }
    return `${baseLabel} ${max + 1}`
  }

  static labelForType(type: ElementType): string {
    switch (type) {
      case 'text':
        return 'Text'
      case 'image':
        return 'Image'
      case 'shape':
        return 'Rectangle'
      case 'group':
        return 'Group'
      case 'frame':
        return 'Frame'
      case 'table':
        return 'Table'
      case 'svg':
        return 'SVG'
      case 'qr-code':
        return 'QR Code'
      case 'barcode':
        return 'Barcode'
      case 'variable':
        return 'Variable'
      case 'mask':
        return 'Mask'
      case 'mockup':
        return 'Mockup'
      default:
        return 'Object'
    }
  }

  static renameUnique(existing: EkoElement[], elementId: string, desired: string): string {
    const trimmed = desired.trim() || 'Object'
    const collision = existing.some(
      (el) => el.id !== elementId && el.name?.trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (!collision) return trimmed
    return NamingEngine.nextName(
      existing.filter((el) => el.id !== elementId),
      trimmed,
    )
  }
}
