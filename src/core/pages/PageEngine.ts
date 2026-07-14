import type { EkoDocument } from '@/types/document'
import type { DocumentPage, DocumentSurface } from '@/types/layout'
import {
  addBlankPage,
  duplicateDocumentPage,
  reconcileActiveLayout,
  type PageMutationResult,
} from './pageMutations'

export interface PageSummary {
  id: string
  name: string
  index: number
  surfaceIds: string[]
  width: number
  height: number
}

/**
 * Page Engine — multi-page domain operations (add / duplicate / delete / reorder / navigate).
 * Does not know about elements interaction — only document page graph.
 */
export class PageEngine {
  static list(document: EkoDocument): PageSummary[] {
    const pages = [...(document.pages ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    return pages.map((page, i) => ({
      id: page.id,
      name: page.name,
      index: page.index ?? i,
      surfaceIds: page.surfaceIds ?? [],
      width: page.width ?? 0,
      height: page.height ?? 0,
    }))
  }

  static getActive(document: EkoDocument, pageId: string | null): DocumentPage | null {
    if (!pageId) return document.pages?.[0] ?? null
    return document.pages?.find((p) => p.id === pageId) ?? null
  }

  static primarySurface(document: EkoDocument, page: DocumentPage): DocumentSurface | null {
    const surfaces = document.surfaces ?? []
    if (page.surfaceIds?.length) {
      for (const id of page.surfaceIds) {
        const found = surfaces.find((s) => s.id === id)
        if (found) return found
      }
    }
    return surfaces.find((s) => s.pageId === page.id) ?? null
  }

  static add(document: EkoDocument, name?: string): PageMutationResult {
    return addBlankPage(document, name)
  }

  static duplicate(document: EkoDocument, pageId: string): PageMutationResult | null {
    return duplicateDocumentPage(document, pageId)
  }

  /**
   * Remove a page, its surfaces, related regions, and owned elements.
   * Refuses to delete the last remaining page.
   */
  static delete(document: EkoDocument, pageId: string): EkoDocument | null {
    const pages = document.pages ?? []
    if (pages.length <= 1) return null
    const page = pages.find((p) => p.id === pageId)
    if (!page) return null

    const surfaceIds = new Set(
      (page.surfaceIds ?? []).concat(
        (document.surfaces ?? []).filter((s) => s.pageId === pageId).map((s) => s.id),
      ),
    )

    const elementIds = new Set<string>()
    for (const surface of document.surfaces ?? []) {
      if (!surfaceIds.has(surface.id)) continue
      for (const id of surface.elementIds) elementIds.add(id)
    }

    const nextPages = pages
      .filter((p) => p.id !== pageId)
      .map((p, index) => ({ ...p, index }))
    const nextSurfaces = (document.surfaces ?? []).filter((s) => !surfaceIds.has(s.id))
    const nextRegions = (document.regions ?? []).filter(
      (r) => r.pageId !== pageId && (!r.surfaceId || !surfaceIds.has(r.surfaceId)),
    )
    const nextElements = document.elements.filter((el) => !elementIds.has(el.id))

    return {
      ...document,
      pages: nextPages,
      surfaces: nextSurfaces,
      regions: nextRegions,
      elements: nextElements,
      metadata: {
        ...document.metadata,
        updatedAt: new Date().toISOString(),
      },
    }
  }

  /** Reorder pages to match `orderedIds` (must be a permutation of existing ids). */
  static reorder(document: EkoDocument, orderedIds: string[]): EkoDocument | null {
    const pages = document.pages ?? []
    if (orderedIds.length !== pages.length) return null
    const byId = new Map(pages.map((p) => [p.id, p]))
    if (orderedIds.some((id) => !byId.has(id))) return null

    const nextPages = orderedIds.map((id, index) => ({
      ...byId.get(id)!,
      index,
    }))

    return {
      ...document,
      pages: nextPages,
      metadata: {
        ...document.metadata,
        updatedAt: new Date().toISOString(),
      },
    }
  }

  static reconcile(
    document: EkoDocument,
    pageId: string | null,
    surfaceId: string | null,
  ): { activePageId: string | null; activeSurfaceId: string | null } {
    return reconcileActiveLayout(document, pageId, surfaceId)
  }

  static next(document: EkoDocument, currentPageId: string | null): string | null {
    const list = PageEngine.list(document)
    if (!list.length) return null
    const idx = list.findIndex((p) => p.id === currentPageId)
    if (idx < 0) return list[0]!.id
    return list[Math.min(list.length - 1, idx + 1)]!.id
  }

  static previous(document: EkoDocument, currentPageId: string | null): string | null {
    const list = PageEngine.list(document)
    if (!list.length) return null
    const idx = list.findIndex((p) => p.id === currentPageId)
    if (idx < 0) return list[0]!.id
    return list[Math.max(0, idx - 1)]!.id
  }
}
