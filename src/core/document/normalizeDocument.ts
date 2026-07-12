import {
  CURRENT_SCHEMA_VERSION,
  type EkoDocument,
} from '@/types/document'
import { getDocumentPixelSize } from '@/core/document/units'
import { createPage } from '@/core/pages/createPage'
import { createSurface } from '@/core/surfaces/createSurface'
import { createDefaultRegionsFromProduction } from '@/core/regions/createRegion'

/**
 * Normalize any supported schema (1.0.0+) into a layout-ready EkoDocument (1.1.0).
 * Additive and backward compatible — never drops root elements.
 */
export function normalizeDocument(document: EkoDocument): EkoDocument {
  const { widthPx, heightPx } = getDocumentPixelSize(document.canvas)
  const next: EkoDocument = {
    ...document,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    elements: [...document.elements],
    pages: document.pages ? [...document.pages] : undefined,
    surfaces: document.surfaces ? [...document.surfaces] : undefined,
    regions: document.regions ? [...document.regions] : undefined,
    guides: document.guides ? [...document.guides] : undefined,
  }

  if (!next.surfaces || next.surfaces.length === 0) {
    const page = next.pages?.[0]
    const surface = createSurface({
      name: 'Default Surface',
      slug: 'default',
      width: widthPx,
      height: heightPx,
      unit: 'px',
      pageId: page?.id,
      elementIds: next.elements.map((el) => el.id),
      backgroundColor: next.canvas.backgroundColor,
    })

    if (!next.pages || next.pages.length === 0) {
      const createdPage = createPage({
        name: 'Page 1',
        index: 0,
        width: widthPx,
        height: heightPx,
        surfaceIds: [surface.id],
      })
      surface.pageId = createdPage.id
      next.pages = [createdPage]
    } else {
      next.pages = next.pages.map((p, index) =>
        index === 0
          ? {
              ...p,
              surfaceIds: p.surfaceIds?.length ? p.surfaceIds : [surface.id],
            }
          : p,
      )
      surface.pageId = next.pages[0]!.id
    }

    next.surfaces = [surface]
  }

  if (!next.regions || next.regions.length === 0) {
    const surface = next.surfaces[0]!
    const production = next.metadata.production
    next.regions = createDefaultRegionsFromProduction({
      widthPx: surface.width,
      heightPx: surface.height,
      dpi: next.canvas.dpi,
      bleedMm: production?.bleedMm,
      safeAreaMm: production?.safeAreaMm,
      marginMm: 5,
      surfaceId: surface.id,
      pageId: surface.pageId,
    })
    next.surfaces = next.surfaces.map((s, i) =>
      i === 0
        ? { ...s, regionIds: next.regions!.map((r) => r.id) }
        : s,
    )
  }

  // Drop invalid elementIds; refill empty membership on single-surface docs.
  const elementIdSet = new Set(next.elements.map((el) => el.id))
  next.surfaces = next.surfaces.map((surface) => {
    const validIds = surface.elementIds.filter((id) => elementIdSet.has(id))
    if (validIds.length > 0) {
      return validIds.length === surface.elementIds.length
        ? surface
        : { ...surface, elementIds: validIds }
    }
    if (next.surfaces!.length === 1) {
      return { ...surface, elementIds: next.elements.map((el) => el.id) }
    }
    return { ...surface, elementIds: validIds }
  })

  // Orphan root elements (e.g. after paste / AddElements) attach to the first surface.
  // Group children keep parentId and are owned via the group membership, not as orphans.
  const claimed = new Set(next.surfaces.flatMap((s) => s.elementIds))
  const orphans = next.elements
    .filter((el) => !claimed.has(el.id) && (!el.parentId || !elementIdSet.has(el.parentId)))
    .map((el) => el.id)
  if (orphans.length > 0 && next.surfaces[0]) {
    next.surfaces = next.surfaces.map((surface, index) =>
      index === 0 ? { ...surface, elementIds: [...surface.elementIds, ...orphans] } : surface,
    )
  }

  return next
}

/** Documents at or above 1.0.0 can be normalized. */
export function isSupportedSchemaVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version)
}
