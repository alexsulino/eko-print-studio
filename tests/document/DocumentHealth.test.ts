import { describe, expect, it } from 'vitest'
import { DocumentHealth } from '@/core/document/DocumentHealth'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { cloneToSession } from '@/core/document/cloneToSession'
import { serializeDocument } from '@/core/document/serializeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { GroupEngine } from '@/core/groups/GroupEngine'
import type { EkoDocument } from '@/types/document'

function validSession(): EkoDocument {
  return normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
}

describe('DocumentHealth', () => {
  it('reports a valid normalized session document', () => {
    const doc = validSession()
    const report = DocumentHealth.check(doc)
    expect(report.valid).toBe(true)
    expect(report.errors).toEqual([])
  })

  it('does not mutate the document', () => {
    const doc = validSession()
    const before = structuredClone(doc)
    DocumentHealth.check(doc)
    expect(doc).toEqual(before)
  })

  it('detects orphan elements not claimed by any surface', () => {
    const doc = validSession()
    const orphanId = 'el_orphan_test'
    const broken: EkoDocument = {
      ...doc,
      elements: [
        ...doc.elements,
        {
          ...doc.elements[0]!,
          id: orphanId,
          slug: 'orphan',
          parentId: null,
        },
      ],
    }
    const report = DocumentHealth.check(broken)
    expect(report.warnings.some((w) => w.code === 'orphan')).toBe(true)
  })

  it('detects invalid group child references', () => {
    const doc = validSession()
    const grouped = GroupEngine.createGroup(doc, [doc.elements[0]!.id, doc.elements[1]!.id])
    const group = grouped.elements.find((el) => el.type === 'group')!
    const broken = {
      ...grouped,
      elements: grouped.elements.map((el) =>
        el.id === group.id && el.type === 'group'
          ? { ...el, properties: { childIds: ['missing-child'] } }
          : el,
      ),
    }
    const report = DocumentHealth.check(broken)
    expect(report.errors.some((e) => e.code === 'group_missing_child')).toBe(true)
  })

  it('detects invalid surface elementIds', () => {
    const doc = validSession()
    const broken = {
      ...doc,
      surfaces: doc.surfaces!.map((surface, index) =>
        index === 0 ? { ...surface, elementIds: ['ghost-element'] } : surface,
      ),
    }
    const report = DocumentHealth.check(broken)
    expect(report.errors.some((e) => e.code === 'surface_invalid_element_id')).toBe(true)
  })

  it('detects missing pages and surfaces', () => {
    const doc = validSession()
    const broken = { ...doc, pages: [], surfaces: [] }
    const report = DocumentHealth.check(broken)
    expect(report.errors.some((e) => e.code === 'missing_pages')).toBe(true)
    expect(report.errors.some((e) => e.code === 'missing_surfaces')).toBe(true)
    expect(report.valid).toBe(false)
  })

  it('detects duplicate element ids', () => {
    const doc = validSession()
    const duplicate = doc.elements[0]!
    const broken = {
      ...doc,
      elements: [...doc.elements, { ...duplicate }],
    }
    const report = DocumentHealth.check(broken)
    expect(report.errors.some((e) => e.code === 'duplicate_element_id')).toBe(true)
  })
})
