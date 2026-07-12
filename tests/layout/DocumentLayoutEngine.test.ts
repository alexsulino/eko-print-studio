import { describe, expect, it } from 'vitest'
import { createPage } from '@/core/pages/createPage'
import { createSurface } from '@/core/surfaces/createSurface'
import { createRegion, validateRegion, createDefaultRegionsFromProduction } from '@/core/regions/createRegion'
import { CoordinateSystem } from '@/core/coordinates/CoordinateSystem'
import { AnchorSystem } from '@/core/anchors/AnchorSystem'
import { GuidesEngine } from '@/core/guides/GuidesEngine'
import { EventBus, documentEvents } from '@/core/events/EventBus'
import { LayoutResolver, RendererAdapter } from '@/core/layout'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { serializeDocument, exportDocument, importDocument } from '@/core/document/serializeDocument'
import { validateDocument } from '@/core/document/validateDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { cloneToSession } from '@/core/document/cloneToSession'
import { CURRENT_SCHEMA_VERSION } from '@/types/document'
import { getDocumentPixelSize } from '@/core/document/units'

describe('pages & surfaces', () => {
  it('creates pages and surfaces with stable ids', () => {
    const page = createPage({ name: 'Capa', index: 0 })
    const surface = createSurface({
      name: 'Frente',
      slug: 'front',
      width: 1000,
      height: 1000,
      pageId: page.id,
      elementIds: ['a'],
    })
    expect(page.id.startsWith('page_')).toBe(true)
    expect(surface.id.startsWith('surface_')).toBe(true)
    expect(surface.slug).toBe('front')
    expect(surface.elementIds).toEqual(['a'])
  })
})

describe('regions', () => {
  it('validates region geometry', () => {
    const region = createRegion({
      name: 'Safe',
      kind: 'safe',
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    })
    expect(validateRegion(region)).toEqual([])
    expect(validateRegion({ ...region, width: -1 }).length).toBeGreaterThan(0)
  })

  it('builds default regions from production metadata', () => {
    const regions = createDefaultRegionsFromProduction({
      widthPx: 1181,
      heightPx: 1181,
      dpi: 300,
      bleedMm: 2,
      safeAreaMm: 5,
      marginMm: 5,
    })
    expect(regions.some((r) => r.kind === 'printable')).toBe(true)
    expect(regions.some((r) => r.kind === 'safe')).toBe(true)
    expect(regions.some((r) => r.kind === 'bleed')).toBe(true)
    expect(regions.some((r) => r.kind === 'margin')).toBe(true)
  })
})

describe('coordinates', () => {
  it('converts between document, viewport and region spaces', () => {
    const viewport = { zoom: 2, panX: 10, panY: 20 }
    const docPoint = { x: 50, y: 40 }
    const vp = CoordinateSystem.documentToViewport(docPoint, viewport)
    expect(vp).toEqual({ space: 'viewport', x: 110, y: 100 })
    expect(CoordinateSystem.viewportToDocument(vp, viewport)).toEqual({
      space: 'document',
      x: 50,
      y: 40,
    })

    const region = { id: 'r1', x: 10, y: 5, width: 100, height: 100 }
    const rel = CoordinateSystem.documentToRegion(docPoint, region)
    expect(rel).toEqual({ space: 'region', regionId: 'r1', x: 40, y: 35 })
    expect(CoordinateSystem.regionToDocument(rel, region)).toEqual({
      space: 'document',
      x: 50,
      y: 40,
    })
    expect(CoordinateSystem.isInsideRegion(docPoint, region)).toBe(true)
  })
})

describe('anchors & guides & events', () => {
  it('resolves surface anchors and keeps guides out of production domain helpers', () => {
    const surface = createSurface({ name: 'Front', width: 200, height: 100, elementIds: [] })
    const anchors = AnchorSystem.forSurface(surface, ['center', 'top-left'])
    expect(anchors[0]).toMatchObject({ preset: 'center', x: 100, y: 50 })
    expect(GuidesEngine.deriveDocumentGuides(200, 100).some((g) => g.label === 'center-x')).toBe(true)
  })

  it('notifies listeners without mutating state', () => {
    const bus = new EventBus()
    const seen: string[] = []
    bus.on(documentEvents.DOCUMENT_CHANGED, () => seen.push('changed'))
    bus.emit(documentEvents.DOCUMENT_CHANGED, {})
    expect(seen).toEqual(['changed'])
  })
})

describe('layout resolver & compatibility', () => {
  it('normalizes 1.0-style documents into pages/surfaces/regions', () => {
    const legacy = {
      ...sampleMasterTemplate,
      schemaVersion: '1.0.0',
      pages: undefined,
      surfaces: undefined,
      regions: undefined,
    }
    const normalized = normalizeDocument(legacy)
    expect(normalized.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(normalized.pages?.length).toBe(1)
    expect(normalized.surfaces?.length).toBe(1)
    expect(normalized.regions?.length).toBeGreaterThan(0)
    expect(normalized.surfaces![0]!.elementIds).toEqual(
      sampleMasterTemplate.elements.map((el) => el.id),
    )
  })

  it('resolves layout and renderer frame from document', () => {
    const session = cloneToSession(sampleMasterTemplate)
    const layout = LayoutResolver.resolve(session)
    const frame = RendererAdapter.toFrame(layout)
    const px = getDocumentPixelSize(session.canvas)
    expect(frame.paper.widthPx).toBe(px.widthPx)
    expect(frame.elements.length).toBe(session.elements.length)
    expect(frame.regions.length).toBeGreaterThan(0)
  })

  it('serializes layout fields and strips guides on production', () => {
    const session = cloneToSession(sampleMasterTemplate)
    const withGuides = {
      ...normalizeDocument(session),
      guides: [{ id: 'g1', orientation: 'vertical' as const, position: 10 }],
    }
    const serialized = serializeDocument(withGuides)
    expect(serialized.pages?.length).toBe(1)
    expect(serialized.surfaces?.length).toBe(1)
    expect(serialized.regions?.length).toBeGreaterThan(0)
    expect(serialized.guides?.length).toBe(1)

    const production = serializeDocument({ ...withGuides, type: 'production' })
    expect(production.guides).toBeUndefined()
    expect(validateDocument(production).valid).toBe(true)

    const roundTrip = importDocument(exportDocument(session))
    expect(roundTrip.surfaces?.length).toBe(1)
    expect(validateDocument(roundTrip).valid).toBe(true)
  })

  it('supports a front/back card layout model', () => {
    const front = createSurface({
      name: 'Frente',
      slug: 'front',
      width: 500,
      height: 300,
      elementIds: ['el_a'],
    })
    const back = createSurface({
      name: 'Verso',
      slug: 'back',
      width: 500,
      height: 300,
      elementIds: ['el_b'],
    })
    const page = createPage({
      name: 'Cartão',
      surfaceIds: [front.id, back.id],
    })
    front.pageId = page.id
    back.pageId = page.id

    const doc = normalizeDocument({
      ...sampleMasterTemplate,
      elements: [
        {
          ...sampleMasterTemplate.elements[2]!,
          id: 'el_a',
        },
        {
          ...sampleMasterTemplate.elements[2]!,
          id: 'el_b',
        },
      ],
      pages: [page],
      surfaces: [front, back],
      regions: [
        createRegion({
          name: 'Front printable',
          kind: 'printable',
          x: 0,
          y: 0,
          width: 500,
          height: 300,
          surfaceId: front.id,
        }),
      ],
    })

    const frontLayout = LayoutResolver.resolve(doc, { surfaceId: front.id })
    expect(frontLayout.elements.map((el) => el.id)).toEqual(['el_a'])
    const backLayout = LayoutResolver.resolve(doc, { surfaceId: back.id })
    expect(backLayout.elements.map((el) => el.id)).toEqual(['el_b'])
  })
})
