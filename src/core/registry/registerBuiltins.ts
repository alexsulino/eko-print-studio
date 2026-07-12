import type { ImageElement, ShapeElement, TextElement } from '@/types/element'
import { createId } from '@/utils/id'
import { objectRegistry } from './ObjectRegistry'

function baseDefaults() {
  return {
    visible: true,
    locked: false,
    editable: true,
    zIndex: 0,
    metadata: {},
    constraints: {
      selectable: true,
      move: true,
      resize: true,
      rotate: true,
    },
    transform: {
      x: 40,
      y: 40,
      width: 200,
      height: 80,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
  }
}

export function registerBuiltins(): void {
  objectRegistry.register<TextElement>({
    type: 'text',
    label: 'Text',
    createDefault: (partial) => {
      const defaults = baseDefaults()
      return {
        ...defaults,
        ...partial,
        id: partial?.id ?? createId('el'),
        type: 'text',
        category: partial?.category ?? 'customer',
        name: partial?.name ?? 'Text',
        constraints: {
          selectable: true,
          move: true,
          resize: true,
          rotate: true,
          changeText: true,
          changeFont: true,
          changeColor: true,
          ...partial?.constraints,
        },
        transform: {
          ...defaults.transform,
          ...partial?.transform,
        },
        properties: {
          text: 'Seu Nome',
          fontFamily: 'Montserrat',
          fontSize: 48,
          fill: '#111111',
          align: 'center',
          ...partial?.properties,
        },
        metadata: partial?.metadata ?? {},
      }
    },
  })

  objectRegistry.register<ImageElement>({
    type: 'image',
    label: 'Image',
    createDefault: (partial) => {
      const defaults = baseDefaults()
      return {
        ...defaults,
        ...partial,
        id: partial?.id ?? createId('el'),
        type: 'image',
        category: partial?.category ?? 'customer',
        name: partial?.name ?? 'Image',
        constraints: {
          selectable: true,
          move: true,
          resize: true,
          rotate: true,
          replaceImage: true,
          crop: true,
          ...partial?.constraints,
        },
        transform: {
          ...defaults.transform,
          width: 320,
          height: 320,
          ...partial?.transform,
        },
        properties: {
          src: '/sample/demo-image.svg',
          opacity: 1,
          ...partial?.properties,
        },
        metadata: partial?.metadata ?? {},
      }
    },
  })

  objectRegistry.register<ShapeElement>({
    type: 'shape',
    label: 'Shape',
    createDefault: (partial) => {
      const defaults = baseDefaults()
      return {
        ...defaults,
        ...partial,
        id: partial?.id ?? createId('el'),
        type: 'shape',
        category: partial?.category ?? 'product',
        name: partial?.name ?? 'Shape',
        constraints: {
          selectable: true,
          move: true,
          resize: true,
          rotate: true,
          changeColor: true,
          ...partial?.constraints,
        },
        transform: {
          ...defaults.transform,
          width: 160,
          height: 160,
          ...partial?.transform,
        },
        properties: {
          shape: 'rect',
          fill: '#E8F1FF',
          stroke: '#2F6FED',
          strokeWidth: 2,
          cornerRadius: 8,
          ...partial?.properties,
        },
        metadata: partial?.metadata ?? {},
      }
    },
  })
}
