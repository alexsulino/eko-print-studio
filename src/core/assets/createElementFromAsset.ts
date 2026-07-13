import type { EkoElement, ImageElement, ShapeElement } from '@/types/element'
import { createId } from '@/utils/id'
import type { LibraryAssetKind } from './libraryAssets'

export interface CreateElementFromAssetInput {
  assetId: string
  libraryKind: LibraryAssetKind
  sourceUri: string
  name: string
  x: number
  y: number
  width: number
  height: number
  mimeType?: string
}

/**
 * Pure factory: Asset library payload → EkoElement.
 * Does not touch Konva, history, or repositories.
 */
export function createElementFromAsset(input: CreateElementFromAssetInput): EkoElement {
  const transform = {
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  }

  if (input.libraryKind === 'template') {
    const shape: ShapeElement = {
      id: createId('el'),
      type: 'shape',
      category: 'customer',
      name: input.name || 'Template',
      visible: true,
      locked: false,
      editable: true,
      zIndex: 0,
      transform,
      constraints: {
        selectable: true,
        move: true,
        resize: true,
        rotate: true,
        delete: true,
      },
      properties: {
        shape: 'rect',
        fill: '#e8eef5',
        stroke: '#64748b',
        strokeWidth: 2,
        cornerRadius: 4,
        opacity: 1,
      },
      metadata: {
        role: 'template-placeholder',
        assetId: input.assetId,
      },
    }
    return shape
  }

  const image: ImageElement = {
    id: createId('el'),
    type: 'image',
    category: 'customer',
    name: input.name || (input.libraryKind === 'svg' ? 'SVG' : 'Image'),
    visible: true,
    locked: false,
    editable: true,
    zIndex: 0,
    transform,
    constraints: {
      selectable: true,
      move: true,
      resize: true,
      rotate: true,
      replaceImage: true,
      crop: true,
      delete: true,
    },
    properties: {
      src: input.sourceUri,
      assetId: input.assetId,
      opacity: 1,
    },
    metadata: {
      ...(input.mimeType ? { mimeType: input.mimeType } : {}),
      ...(input.libraryKind === 'svg' ? { libraryKind: 'svg' } : {}),
    },
  }
  return image
}

export function defaultInsertSize(kind: LibraryAssetKind): { width: number; height: number } {
  if (kind === 'template') return { width: 240, height: 300 }
  return { width: 320, height: 320 }
}
