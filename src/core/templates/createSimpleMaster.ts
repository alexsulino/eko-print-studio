import { createEmptyDocument } from '@/core/document/createDocument'
import type { EkoDocument } from '@/types/document'

export interface SimpleMasterSpec {
  id: string
  name: string
  productId: string
  width: number
  height: number
  unit?: 'mm' | 'px'
  backgroundColor?: string
  headline: string
}

/** Minimal published Template Master with one editable headline (for catalog demos). */
export function createSimpleMaster(spec: SimpleMasterSpec): EkoDocument {
  const textId = `${spec.id}__headline`
  const now = new Date().toISOString()

  return createEmptyDocument({
    id: spec.id,
    type: 'template',
    metadata: {
      name: spec.name,
      productId: spec.productId,
      createdAt: now,
      updatedAt: now,
      orientation: spec.width >= spec.height ? 'landscape' : 'portrait',
      production: {
        bleedMm: 2,
        safeAreaMm: 5,
        colorMode: 'rgb',
      },
    },
    canvas: {
      width: spec.width,
      height: spec.height,
      unit: spec.unit ?? 'mm',
      dpi: 300,
      backgroundColor: spec.backgroundColor ?? '#ffffff',
    },
    rules: {
      allowedFonts: ['Montserrat', 'Roboto'],
      allowedBackgrounds: [],
      allowAddElements: true,
      allowDeleteElements: false,
    },
    elements: [
      {
        id: textId,
        type: 'text',
        category: 'customer',
        name: 'Headline',
        slug: 'headline',
        locked: false,
        visible: true,
        editable: true,
        zIndex: 1,
        transform: {
          x: Math.round(spec.width * 0.1),
          y: Math.round(spec.height * 0.35),
          width: Math.round(spec.width * 0.8),
          height: Math.round(spec.height * 0.15),
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
        metadata: {},
        constraints: {
          selectable: true,
          move: true,
          resize: true,
          rotate: true,
          changeText: true,
          changeFont: true,
          changeColor: true,
          delete: false,
        },
        properties: {
          text: spec.headline,
          fontFamily: 'Montserrat',
          fontSize: 28,
          fontStyle: 'bold',
          fill: '#1a1a1a',
          align: 'center',
          verticalAlign: 'middle',
        },
      },
    ],
  })
}
