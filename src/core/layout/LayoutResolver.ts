import type { EkoDocument } from '@/types/document'
import type { DocumentPage, DocumentRegion, DocumentSurface } from '@/types/layout'
import type { EkoElement } from '@/types/element'
import { getDocumentPixelSize } from '@/core/document/units'
import { normalizeDocument } from '@/core/document/normalizeDocument'

export interface ResolvedLayout {
  document: EkoDocument
  page: DocumentPage | null
  surface: DocumentSurface | null
  regions: DocumentRegion[]
  elements: EkoElement[]
  paper: { widthPx: number; heightPx: number; backgroundColor?: string }
}

export interface LayoutResolveOptions {
  pageId?: string | null
  surfaceId?: string | null
}

/**
 * Layout Resolver — projects EkoDocument into the active page/surface view.
 * Output is pure domain data for the Renderer Adapter (never Konva).
 */
export class LayoutResolver {
  static resolve(document: EkoDocument, options: LayoutResolveOptions = {}): ResolvedLayout {
    const normalized = normalizeDocument(document)
    const page =
      (options.pageId
        ? normalized.pages?.find((p) => p.id === options.pageId)
        : normalized.pages?.[0]) ?? null

    // Prefer an existing surface id; stale ids fall back to the page's first surface
    // (then document surfaces[0]) so the renderer never resolves against a missing surface.
    const requestedSurface = options.surfaceId
      ? normalized.surfaces?.find((s) => s.id === options.surfaceId)
      : undefined
    const surface =
      requestedSurface ??
      (page?.surfaceIds?.[0]
        ? normalized.surfaces?.find((s) => s.id === page.surfaceIds![0])
        : undefined) ??
      normalized.surfaces?.[0] ??
      null

    const elements = resolveRenderableElements(normalized, surface)

    const regions = (normalized.regions ?? []).filter((region) => {
      if (!surface) return true
      if (region.surfaceId && region.surfaceId !== surface.id) return false
      if (region.pageId && page && region.pageId !== page.id) return false
      return true
    })

    const paper = surface
      ? {
          widthPx: surface.width,
          heightPx: surface.height,
          backgroundColor: surface.backgroundColor ?? normalized.canvas.backgroundColor,
        }
      : {
          ...getDocumentPixelSize(normalized.canvas),
          backgroundColor: normalized.canvas.backgroundColor,
        }

    return {
      document: normalized,
      page,
      surface,
      regions,
      elements,
      paper,
    }
  }
}

/**
 * Resolve surface → renderable elements with backward compatibility:
 * - root `document.elements` when surface has no valid membership (single-surface / legacy)
 * - expand group children (surface may list only the group id)
 * - drop invalid elementIds that no longer exist
 */
function resolveRenderableElements(
  document: EkoDocument,
  surface: DocumentSurface | null,
): EkoElement[] {
  const byId = new Map(document.elements.map((el) => [el.id, el]))
  const surfaceCount = document.surfaces?.length ?? 0

  const membership = surface
    ? surface.elementIds.filter((id) => byId.has(id))
    : document.elements.map((el) => el.id)

  let seedIds = membership

  if (seedIds.length === 0) {
    if (!surface || surfaceCount <= 1) {
      // Legacy / single-surface: document.elements is the source of truth.
      seedIds = document.elements.map((el) => el.id)
    } else {
      // Multi-surface empty face: only attach true orphans (not claimed by any surface).
      const claimed = new Set(
        (document.surfaces ?? []).flatMap((s) => s.elementIds.filter((id) => byId.has(id))),
      )
      seedIds = document.elements.filter((el) => !claimed.has(el.id)).map((el) => el.id)
    }
  }

  const ids = new Set<string>()
  const visit = (id: string) => {
    if (ids.has(id)) return
    const el = byId.get(id)
    if (!el) return
    ids.add(id)
    if (el.type === 'group') {
      for (const childId of el.properties.childIds ?? []) visit(childId)
    }
  }
  for (const id of seedIds) visit(id)

  if (ids.size === 0 && document.elements.length > 0 && surfaceCount <= 1) {
    for (const el of document.elements) ids.add(el.id)
  }

  return document.elements.filter((el) => ids.has(el.id))
}
