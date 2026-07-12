import { describe, expect, it } from 'vitest'
import { DocumentGraph } from '@/core/documentGraph'
import { LayerEngine } from '@/core/layers/LayerEngine'
import { GroupEngine } from '@/core/groups/GroupEngine'
import { applyCommand } from '@/core/editor/commands'
import { cloneToSession } from '@/core/document/cloneToSession'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { LayoutResolver } from '@/core/layout'

describe('DocumentGraph', () => {
  it('builds a tree and finds parents without orphans on normalized docs', () => {
    const session = normalizeDocument(cloneToSession(sampleMasterTemplate))
    const graph = DocumentGraph.build(session)
    expect(graph.roots).toEqual([session.id])
    expect(graph.issues.filter((i) => i.code === 'orphan')).toEqual([])
    const photo = session.elements.find((el) => el.slug === 'customer-photo')!
    const parent = DocumentGraph.getParent(session, photo.id)
    expect(parent?.kind).toBe('surface')
  })

  it('detects missing parent references', () => {
    const session = normalizeDocument(cloneToSession(sampleMasterTemplate))
    const broken = {
      ...session,
      elements: session.elements.map((el, i) =>
        i === 0 ? { ...el, parentId: 'missing-parent' } : el,
      ),
    }
    const issues = DocumentGraph.validate(broken)
    expect(issues.some((i) => i.code === 'missing_ref')).toBe(true)
  })
})

describe('LayerEngine & GroupEngine', () => {
  it('reorders z-index with bring/send commands', () => {
    const session = normalizeDocument(cloneToSession(sampleMasterTemplate))
    const photo = session.elements.find((el) => el.slug === 'customer-photo')!
    const before = photo.zIndex
    const forward = applyCommand(session, {
      type: 'BringToFront',
      elementId: photo.id,
      timestamp: Date.now(),
    })
    expect(forward.success).toBe(true)
    const after = forward.document.elements.find((el) => el.id === photo.id)!
    expect(after.zIndex).toBeGreaterThanOrEqual(before)

    const list = LayerEngine.listForSurface(forward.document)
    expect(list[0]?.id).toBe(photo.id)
  })

  it('groups and ungroups elements', () => {
    const session = normalizeDocument(cloneToSession(sampleMasterTemplate))
    const photo = session.elements.find((el) => el.slug === 'customer-photo')!
    const name = session.elements.find((el) => el.slug === 'customer-name')!
    // allow move on name for grouping test by using GroupEngine directly
    const grouped = GroupEngine.createGroup(session, [photo.id, name.id], 'Customer')
    const group = grouped.elements.find((el) => el.type === 'group')!
    expect(group.properties.childIds).toEqual(expect.arrayContaining([photo.id, name.id]))
    expect(grouped.elements.find((el) => el.id === photo.id)?.parentId).toBe(group.id)

    const ungrouped = GroupEngine.ungroup(grouped, group.id)
    expect(ungrouped.elements.some((el) => el.id === group.id)).toBe(false)
    expect(ungrouped.elements.find((el) => el.id === photo.id)?.parentId).toBeNull()
  })

  it('propagates lock/visibility through hierarchy', () => {
    const session = normalizeDocument(cloneToSession(sampleMasterTemplate))
    const photo = session.elements.find((el) => el.slug === 'customer-photo')!
    const name = session.elements.find((el) => el.slug === 'customer-name')!
    const grouped = GroupEngine.createGroup(session, [photo.id, name.id])
    const group = grouped.elements.find((el) => el.type === 'group')!
    const lockedDoc = {
      ...grouped,
      elements: grouped.elements.map((el) =>
        el.id === group.id ? { ...el, locked: true, visible: false } : el,
      ),
    }
    const byId = new Map(lockedDoc.elements.map((el) => [el.id, el]))
    const child = lockedDoc.elements.find((el) => el.id === photo.id)!
    const flags = LayerEngine.effectiveFlags(child, byId)
    expect(flags.locked).toBe(true)
    expect(flags.visible).toBe(false)
  })
})

describe('regression layout + interaction commands', () => {
  it('keeps layout resolver working after layer reorder', () => {
    const session = normalizeDocument(cloneToSession(sampleMasterTemplate))
    const photo = session.elements.find((el) => el.slug === 'customer-photo')!
    const next = applyCommand(session, {
      type: 'SendToBack',
      elementId: photo.id,
      timestamp: Date.now(),
    })
    const layout = LayoutResolver.resolve(next.document)
    expect(layout.elements.length).toBe(session.elements.length)
  })
})
