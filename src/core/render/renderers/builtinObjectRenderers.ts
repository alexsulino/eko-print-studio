import type { EkoElement, ImageElement, ShapeElement, TextElement, VariableElement } from '@/types/element'
import type { DrawablePrimitive } from '../types'
import type { ObjectRenderer } from '../RendererRegistry'

function baseDrawable(
  element: EkoElement,
  kind: DrawablePrimitive['kind'],
  extra: Partial<DrawablePrimitive> = {},
): DrawablePrimitive {
  return {
    kind,
    id: element.id,
    transform: { ...element.transform },
    opacity: element.appearance?.opacity ?? 1,
    visible: element.visible !== false,
    locked: Boolean(element.locked),
    fill: element.appearance?.fill,
    stroke: element.appearance?.stroke,
    strokeWidth: element.appearance?.strokeWidth,
    cornerRadius: element.appearance?.cornerRadius,
    ...extra,
  }
}

export const textRenderer: ObjectRenderer = {
  key: 'text',
  render(element) {
    if (element.type === 'text') {
      const el = element as TextElement
      return baseDrawable(el, 'text', {
        text: el.properties.text,
        fontSize: el.properties.fontSize,
        fontFamily: el.properties.fontFamily,
        fill: el.properties.fill,
      })
    }
    if (element.type === 'variable') {
      const el = element as VariableElement
      return baseDrawable(el, 'text', {
        text: el.properties.fallback ?? `{{${el.properties.key}}}`,
        fontSize: 16,
        fontFamily: 'Inter',
      })
    }
    return baseDrawable(element, 'text')
  },
}

export const imageRenderer: ObjectRenderer = {
  key: 'image',
  render(element) {
    if (element.type !== 'image') return baseDrawable(element, 'image')
    const el = element as ImageElement
    return baseDrawable(el, 'image', { imageSrc: el.properties.src })
  },
}

export const shapeRenderer: ObjectRenderer = {
  key: 'shape',
  render(element) {
    if (element.type !== 'shape') return baseDrawable(element, 'rect')
    const el = element as ShapeElement
    const kind = el.properties.shape === 'circle' ? 'ellipse' : 'rect'
    return baseDrawable(el, kind, {
      fill: el.properties.fill,
      stroke: el.properties.stroke,
      strokeWidth: el.properties.strokeWidth,
      cornerRadius: el.properties.cornerRadius,
    })
  },
}

export const groupRenderer: ObjectRenderer = {
  key: 'group',
  render(element) {
    return baseDrawable(element, 'group', { children: [] })
  },
}

export const frameRenderer: ObjectRenderer = {
  key: 'frame',
  render(element) {
    return baseDrawable(element, 'rect', {
      meta: { role: 'frame' },
      clip: {
        x: element.transform.x,
        y: element.transform.y,
        width: element.transform.width,
        height: element.transform.height,
      },
    })
  },
}

export const tableRenderer: ObjectRenderer = {
  key: 'table',
  render(element) {
    return baseDrawable(element, 'rect', { meta: { role: 'table' } })
  },
}

export const stubRenderer: ObjectRenderer = {
  key: 'stub',
  render(element) {
    return baseDrawable(element, 'stub', { meta: { type: element.type } })
  },
}

export const noneRenderer: ObjectRenderer = {
  key: 'none',
  render(element) {
    return baseDrawable(element, 'stub', { visible: false, meta: { skipped: true } })
  },
}

export function createBuiltinObjectRenderers(): ObjectRenderer[] {
  return [
    textRenderer,
    imageRenderer,
    shapeRenderer,
    groupRenderer,
    frameRenderer,
    tableRenderer,
    stubRenderer,
    noneRenderer,
  ]
}

/** Typed aliases documenting future dedicated keys (currently stub paint). */
export const svgRenderer = stubRenderer
export const qrCodeRenderer = stubRenderer
export const barcodeRenderer = stubRenderer
export const maskRenderer = stubRenderer
export const mockupRenderer = stubRenderer
