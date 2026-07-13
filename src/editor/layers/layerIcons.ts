import type { ElementType } from '@/types/element'

const LABELS: Partial<Record<ElementType, string>> = {
  text: 'T',
  image: 'Img',
  shape: 'Sh',
  group: 'Grp',
  svg: 'Svg',
  'qr-code': 'QR',
  barcode: 'Bar',
  variable: 'Var',
  mask: 'Msk',
  mockup: 'Mk',
}

/** Compact type glyph for LayerItem (no emoji). */
export function layerTypeGlyph(type: ElementType): string {
  return LABELS[type] ?? type.slice(0, 3).toUpperCase()
}

export function layerTypeLabel(type: ElementType): string {
  return type
}
