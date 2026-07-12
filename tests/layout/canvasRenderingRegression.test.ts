import { describe, expect, it } from 'vitest'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { cloneToSession } from '@/core/document/cloneToSession'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { serializeDocument } from '@/core/document/serializeDocument'
import { LayoutResolver, RendererAdapter } from '@/core/layout'
import { GroupEngine } from '@/core/groups/GroupEngine'
import { createSurface } from '@/core/surfaces/createSurface'
import { createPage } from '@/core/pages/createPage'

describe('canvas rendering regression', () => {
  it('keeps master → session → layout → frame elements drawable', () => {
    const master = serializeDocument(sampleMasterTemplate)
    expect(master.elements.length).toBeGreaterThan(0)
    expect(master.surfaces?.[0]?.elementIds.length).toBe(master.elements.length)

    const session = normalizeDocument(cloneToSession(master))
    expect(session.type).toBe('session')
    expect(session.elements.length).toBe(master.elements.length)

    const layout = LayoutResolver.resolve(session, {
      pageId: session.pages?.[0]?.id,
      surfaceId: session.surfaces?.[0]?.id,
    })
    const frame = RendererAdapter.toFrame(layout)

    expect(layout.elements.length).toBe(session.elements.length)
    expect(frame.elements.filter((el) => el.type !== 'group').length).toBeGreaterThan(0)
    expect(frame.elements.some((el) => el.type === 'text')).toBe(true)
    expect(frame.elements.some((el) => el.type === 'image')).toBe(true)
    expect(frame.elements.some((el) => el.type === 'shape')).toBe(true)
  })

  it('falls back to document.elements when surface membership is empty (single surface)', () => {
    const session = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    const broken = structuredClone(session)
    broken.surfaces![0]!.elementIds = []
    // Bypass normalize refill by resolving a doc that already has empty ids after a forced map:
    // resolve() normalizes first — single-surface empty is refilled. Assert via multi-invalid path:
    broken.surfaces![0]!.elementIds = ['missing-a', 'missing-b']
    const layout = LayoutResolver.resolve(broken, { surfaceId: broken.surfaces![0]!.id })
    expect(layout.elements.length).toBe(session.elements.length)
  })

  it('expands group children into the renderable layout frame', () => {
    const session = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    const photo = session.elements.find((el) => el.slug === 'customer-photo')!
    const name = session.elements.find((el) => el.slug === 'customer-name')!
    const grouped = GroupEngine.createGroup(session, [photo.id, name.id], 'Customer')
    const group = grouped.elements.find((el) => el.type === 'group')!
    expect(grouped.surfaces![0]!.elementIds).toContain(group.id)
    expect(grouped.surfaces![0]!.elementIds).not.toContain(photo.id)

    const layout = LayoutResolver.resolve(grouped, { surfaceId: grouped.surfaces![0]!.id })
    const ids = layout.elements.map((el) => el.id)
    expect(ids).toContain(group.id)
    expect(ids).toContain(photo.id)
    expect(ids).toContain(name.id)

    const drawable = layout.elements.filter((el) => el.type !== 'group')
    expect(drawable.some((el) => el.id === photo.id)).toBe(true)
    expect(drawable.some((el) => el.id === name.id)).toBe(true)
  })

  it('does not blank the frame when activeSurfaceId is stale', () => {
    const session = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    const layout = LayoutResolver.resolve(session, { surfaceId: 'surface_does_not_exist' })
    expect(layout.surface?.id).toBe(session.surfaces![0]!.id)
    expect(layout.elements.length).toBe(session.elements.length)
  })

  it('keeps front/back surfaces isolated when membership is valid', () => {
    const base = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    const ids = base.elements.map((el) => el.id)
    const page = createPage({
      name: 'Card',
      index: 0,
      width: 1000,
      height: 600,
      surfaceIds: [],
    })
    const front = createSurface({
      name: 'Front',
      width: 1000,
      height: 600,
      pageId: page.id,
      elementIds: ids.slice(0, 3),
    })
    const back = createSurface({
      name: 'Back',
      width: 1000,
      height: 600,
      pageId: page.id,
      elementIds: ids.slice(3),
    })
    page.surfaceIds = [front.id, back.id]
    const doc = normalizeDocument({
      ...base,
      pages: [page],
      surfaces: [front, back],
      regions: [],
    })
    const frontLayout = LayoutResolver.resolve(doc, { surfaceId: front.id })
    const backLayout = LayoutResolver.resolve(doc, { surfaceId: back.id })
    expect(frontLayout.elements.map((el) => el.id).sort()).toEqual([...ids.slice(0, 3)].sort())
    expect(backLayout.elements.map((el) => el.id).sort()).toEqual([...ids.slice(3)].sort())
  })
})
