import type { EkoDocument } from '@/types/document'
import type { EkoElement } from '@/types/element'

const INTERNAL_KEYS = new Set(['__konvaNode', '__transient', '__ui'])

function stripElement(element: EkoElement): EkoElement {
  const cleaned = { ...element } as EkoElement & Record<string, unknown>
  for (const key of Object.keys(cleaned)) {
    if (key.startsWith('__') || INTERNAL_KEYS.has(key)) {
      delete cleaned[key]
    }
  }
  return cleaned as EkoElement
}

/**
 * Produce a clean EkoDocument JSON suitable for persistence / export.
 * Never includes Konva runtime state.
 */
export function serializeDocument(document: EkoDocument): EkoDocument {
  const cloned = structuredClone(document) as EkoDocument

  return {
    id: cloned.id,
    type: cloned.type,
    schemaVersion: cloned.schemaVersion,
    metadata: {
      ...cloned.metadata,
      updatedAt: new Date().toISOString(),
    },
    canvas: { ...cloned.canvas },
    rules: {
      ...cloned.rules,
      allowedFonts: [...cloned.rules.allowedFonts],
      allowedBackgrounds: [...cloned.rules.allowedBackgrounds],
    },
    assets: {
      fonts: [...cloned.assets.fonts],
      images: [...cloned.assets.images],
      backgrounds: [...cloned.assets.backgrounds],
    },
    permissions: { ...cloned.permissions },
    variables: {
      definitions: [...cloned.variables.definitions],
      values: { ...cloned.variables.values },
    },
    elements: cloned.elements.map(stripElement),
    ...(cloned.pages
      ? {
          pages: cloned.pages.map((page) => ({
            ...page,
            elements: page.elements.map(stripElement),
          })),
        }
      : {}),
  }
}

export function exportDocument(document: EkoDocument): string {
  return JSON.stringify(serializeDocument(document), null, 2)
}

export function importDocument(json: string): EkoDocument {
  const parsed = JSON.parse(json) as EkoDocument
  return serializeDocument(parsed)
}
