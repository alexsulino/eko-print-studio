import type { EkoDocument } from '@/types/document'
import type { EkoElement } from '@/types/element'
import type { EditorGuide } from '@/types/layout'
import { normalizeDocument } from '@/core/document/normalizeDocument'

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

function stripGuides(guides: EditorGuide[] | undefined, type: EkoDocument['type']): EditorGuide[] | undefined {
  // Guides are editing aids — never part of production documents.
  if (type === 'production' || !guides?.length) return undefined
  return guides.map((g) => ({ ...g }))
}

/**
 * Produce a clean EkoDocument JSON suitable for persistence / export.
 * Never includes Konva runtime state.
 * Normalizes layout fields for schema 1.1.0 while remaining backward compatible.
 */
export function serializeDocument(document: EkoDocument): EkoDocument {
  const normalized = normalizeDocument(document)
  const cloned = structuredClone(normalized) as EkoDocument

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
    pages: (cloned.pages ?? []).map((page) => ({
      ...page,
      elements: page.elements?.map(stripElement),
      surfaceIds: page.surfaceIds ? [...page.surfaceIds] : [],
      regionIds: page.regionIds ? [...page.regionIds] : [],
    })),
    surfaces: (cloned.surfaces ?? []).map((surface) => ({
      ...surface,
      elementIds: [...surface.elementIds],
      regionIds: surface.regionIds ? [...surface.regionIds] : [],
      rules: surface.rules ? { ...surface.rules } : undefined,
    })),
    regions: (cloned.regions ?? []).map((region) => ({ ...region })),
    ...(stripGuides(cloned.guides, cloned.type)
      ? { guides: stripGuides(cloned.guides, cloned.type) }
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
