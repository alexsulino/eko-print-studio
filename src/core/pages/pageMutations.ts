import { createPage } from '@/core/pages/createPage'
import { createSurface } from '@/core/surfaces/createSurface'
import { getDocumentPixelSize } from '@/core/document/units'
import { createId } from '@/utils/id'
import type { EkoDocument } from '@/types/document'
import type { DocumentPage, DocumentSurface, DocumentRegion } from '@/types/layout'
import type { EkoElement } from '@/types/element'

export interface PageMutationResult {
  document: EkoDocument
  pageId: string
  surfaceId: string
}

function touch(document: EkoDocument): EkoDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      updatedAt: new Date().toISOString(),
    },
  }
}

function nextPageIndex(document: EkoDocument): number {
  const pages = document.pages ?? []
  if (!pages.length) return 0
  return Math.max(...pages.map((p) => p.index ?? 0)) + 1
}

function primarySurfaceForPage(
  document: EkoDocument,
  page: DocumentPage,
): DocumentSurface | undefined {
  const surfaces = document.surfaces ?? []
  if (page.surfaceIds?.length) {
    for (const id of page.surfaceIds) {
      const found = surfaces.find((s) => s.id === id)
      if (found) return found
    }
  }
  return surfaces.find((s) => s.pageId === page.id)
}

/** Adds a blank page with an empty surface (same canvas pixel size). */
export function addBlankPage(document: EkoDocument, name?: string): PageMutationResult {
  const { widthPx, heightPx } = getDocumentPixelSize(document.canvas)
  const index = nextPageIndex(document)
  const pageName = name?.trim() || `Page ${index + 1}`

  const surface = createSurface({
    name: `${pageName} Surface`,
    slug: `page-${index + 1}`,
    width: widthPx,
    height: heightPx,
    unit: 'px',
    backgroundColor: document.canvas.backgroundColor,
    elementIds: [],
  })

  const page = createPage({
    name: pageName,
    index,
    width: widthPx,
    height: heightPx,
    surfaceIds: [surface.id],
  })
  surface.pageId = page.id

  const pages = [...(document.pages ?? []), page]
  const surfaces = [...(document.surfaces ?? []), surface]

  return {
    document: touch({
      ...document,
      pages,
      surfaces,
    }),
    pageId: page.id,
    surfaceId: surface.id,
  }
}

/**
 * Duplicates a page, its primary surface, and elements owned by that surface.
 * Regions tied to the source surface are cloned when present.
 */
export function duplicateDocumentPage(
  document: EkoDocument,
  pageId: string,
): PageMutationResult | null {
  const sourcePage = document.pages?.find((p) => p.id === pageId)
  if (!sourcePage) return null

  const sourceSurface = primarySurfaceForPage(document, sourcePage)
  if (!sourceSurface) return null

  const index = nextPageIndex(document)
  const elementIdMap = new Map<string, string>()
  const clonedElements: EkoElement[] = []

  for (const elementId of sourceSurface.elementIds) {
    const el = document.elements.find((item) => item.id === elementId)
    if (!el) continue
    const newId = createId(el.type === 'group' ? 'group' : 'el')
    elementIdMap.set(el.id, newId)
    clonedElements.push({
      ...structuredClone(el),
      id: newId,
      name: el.name ? `${el.name} copy` : el.name,
      parentId: el.parentId ? (elementIdMap.get(el.parentId) ?? null) : el.parentId,
    })
  }

  // Second pass: remap group childIds / parentId after all ids exist.
  for (const el of clonedElements) {
    if (el.parentId && elementIdMap.has(el.parentId)) {
      el.parentId = elementIdMap.get(el.parentId)!
    }
    if (el.type === 'group' && el.properties.childIds) {
      el.properties = {
        ...el.properties,
        childIds: el.properties.childIds.map((id) => elementIdMap.get(id) ?? id),
      }
    }
  }

  const newSurfaceId = createId('surface')
  const newPageId = createId('page')

  const regionIdMap = new Map<string, string>()
  const clonedRegions: DocumentRegion[] = []
  for (const region of document.regions ?? []) {
    if (region.surfaceId !== sourceSurface.id && region.pageId !== sourcePage.id) continue
    const newRegionId = createId('region')
    regionIdMap.set(region.id, newRegionId)
    clonedRegions.push({
      ...structuredClone(region),
      id: newRegionId,
      pageId: newPageId,
      surfaceId: newSurfaceId,
    })
  }

  const newSurface: DocumentSurface = {
    ...structuredClone(sourceSurface),
    id: newSurfaceId,
    name: `${sourceSurface.name} copy`,
    slug: sourceSurface.slug ? `${sourceSurface.slug}-copy` : undefined,
    pageId: newPageId,
    elementIds: sourceSurface.elementIds
      .map((id) => elementIdMap.get(id))
      .filter((id): id is string => Boolean(id)),
    regionIds: (sourceSurface.regionIds ?? [])
      .map((id) => regionIdMap.get(id))
      .filter((id): id is string => Boolean(id)),
  }

  const newPage: DocumentPage = {
    ...structuredClone(sourcePage),
    id: newPageId,
    name: `${sourcePage.name} copy`,
    index,
    surfaceIds: [newSurfaceId],
    regionIds: (sourcePage.regionIds ?? [])
      .map((id) => regionIdMap.get(id))
      .filter((id): id is string => Boolean(id)),
    elements: [],
  }

  return {
    document: touch({
      ...document,
      pages: [...(document.pages ?? []), newPage],
      surfaces: [...(document.surfaces ?? []), newSurface],
      regions: [...(document.regions ?? []), ...clonedRegions],
      elements: [...document.elements, ...clonedElements],
    }),
    pageId: newPageId,
    surfaceId: newSurfaceId,
  }
}

/** Keeps active page/surface valid after document mutations (undo/redo, delete page). */
export function reconcileActiveLayout(
  document: EkoDocument,
  currentPageId: string | null,
  currentSurfaceId: string | null,
): { activePageId: string | null; activeSurfaceId: string | null } {
  const pages = document.pages ?? []
  const surfaces = document.surfaces ?? []

  const activePageId =
    currentPageId && pages.some((p) => p.id === currentPageId)
      ? currentPageId
      : (pages[0]?.id ?? null)

  const page = pages.find((p) => p.id === activePageId)
  const preferredSurfaceIds = page?.surfaceIds ?? []

  if (
    currentSurfaceId &&
    surfaces.some(
      (s) =>
        s.id === currentSurfaceId &&
        (s.pageId === activePageId || preferredSurfaceIds.includes(s.id)),
    )
  ) {
    return { activePageId, activeSurfaceId: currentSurfaceId }
  }

  const surfaceId =
    preferredSurfaceIds.find((id) => surfaces.some((s) => s.id === id)) ??
    surfaces.find((s) => s.pageId === activePageId)?.id ??
    surfaces[0]?.id ??
    null

  return { activePageId, activeSurfaceId: surfaceId }
}
