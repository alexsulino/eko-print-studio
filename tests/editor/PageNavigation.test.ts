import { describe, expect, it } from 'vitest'
import { applyCommand } from '@/core/editor/commands'
import {
  addBlankPage,
  duplicateDocumentPage,
  reconcileActiveLayout,
} from '@/core/pages/pageMutations'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { cloneToSession } from '@/core/document/cloneToSession'
import { serializeDocument } from '@/core/document/serializeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'

function sessionDoc() {
  return normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
}

describe('page mutations', () => {
  it('adds a blank page with an empty surface', () => {
    const doc = sessionDoc()
    const beforePages = doc.pages!.length
    const beforeElements = doc.elements.length
    const result = addBlankPage(doc, 'Page Extra')

    expect(result.document.pages!.length).toBe(beforePages + 1)
    expect(result.document.elements.length).toBe(beforeElements)
    const page = result.document.pages!.find((p) => p.id === result.pageId)!
    expect(page.name).toBe('Page Extra')
    const surface = result.document.surfaces!.find((s) => s.id === result.surfaceId)!
    expect(surface.elementIds).toEqual([])
    expect(surface.pageId).toBe(page.id)
  })

  it('duplicates a page including surface elements', () => {
    const doc = sessionDoc()
    const source = doc.pages![0]!
    const sourceSurface = doc.surfaces!.find((s) => s.pageId === source.id)!
    const result = duplicateDocumentPage(doc, source.id)!

    expect(result.document.pages!.length).toBe(doc.pages!.length + 1)
    expect(result.pageId).not.toBe(source.id)
    expect(result.surfaceId).not.toBe(sourceSurface.id)

    const newSurface = result.document.surfaces!.find((s) => s.id === result.surfaceId)!
    expect(newSurface.elementIds.length).toBe(sourceSurface.elementIds.length)
    for (const id of newSurface.elementIds) {
      expect(sourceSurface.elementIds.includes(id)).toBe(false)
      expect(result.document.elements.some((el) => el.id === id)).toBe(true)
    }
  })

  it('reconciles active layout when page disappears', () => {
    const doc = sessionDoc()
    const pageId = doc.pages![0]!.id
    const surfaceId = doc.surfaces![0]!.id
    const layout = reconcileActiveLayout(doc, 'missing-page', 'missing-surface')
    expect(layout.activePageId).toBe(pageId)
    expect(layout.activeSurfaceId).toBe(surfaceId)
  })
})

describe('AddPage / DuplicatePage commands', () => {
  it('AddPage goes through applyCommand and clears selection in result', () => {
    const doc = sessionDoc()
    const result = applyCommand(doc, { type: 'AddPage', name: 'Nova', timestamp: Date.now() })
    expect(result.success).toBe(true)
    expect(result.selectedIds).toEqual([])
    expect(result.document.pages!.length).toBe(doc.pages!.length + 1)
  })

  it('DuplicatePage clones via command', () => {
    const doc = sessionDoc()
    const pageId = doc.pages![0]!.id
    const result = applyCommand(doc, {
      type: 'DuplicatePage',
      pageId,
      timestamp: Date.now(),
    })
    expect(result.success).toBe(true)
    expect(result.document.pages!.length).toBe(doc.pages!.length + 1)
  })
})
