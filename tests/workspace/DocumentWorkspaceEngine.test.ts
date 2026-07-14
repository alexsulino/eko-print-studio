import { describe, expect, it } from 'vitest'
import { UnitsEngine } from '@/core/units'
import { CoordinateSystem } from '@/core/coordinates/CoordinateSystem'
import { WorkspaceEngine } from '@/core/workspace/WorkspaceEngine'
import { PageEngine } from '@/core/pages/PageEngine'
import { LayoutEngine } from '@/core/layout/LayoutEngine'
import { RulerEngine } from '@/core/rulers/RulerEngine'
import { GridEngine } from '@/core/grid/GridEngine'
import { GuidesEngine } from '@/core/guides/GuidesEngine'
import { DocumentEngine } from '@/core/document/DocumentEngine'
import { DocumentWorkspacePlatform } from '@/core/documentWorkspace'
import { applyCommand } from '@/core/editor/commands'
import { cloneToSession } from '@/core/document/cloneToSession'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { serializeDocument } from '@/core/document/serializeDocument'

function sessionDoc() {
  return normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
}

describe('UnitsEngine', () => {
  it('converts mm / in / pt at 300dpi', () => {
    expect(UnitsEngine.toPixels(1, 'in', 300)).toBe(300)
    expect(UnitsEngine.toPixels(72, 'pt', 300)).toBeCloseTo(300, 5)
    expect(UnitsEngine.convert(25.4, 'mm', 'in', 300)).toBeCloseTo(1, 5)
  })

  it('keeps legacy helpers compatible', () => {
    const size = UnitsEngine.getDocumentPixelSize({
      width: 100,
      height: 100,
      unit: 'mm',
      dpi: 300,
    })
    expect(size.widthPx).toBe(Math.round((100 / 25.4) * 300))
  })
})

describe('CoordinateSystem workspace bridge', () => {
  it('round-trips document ↔ workspace ↔ viewport', () => {
    const origin = { x: 200, y: 40 }
    const viewport = { zoom: 2, panX: 10, panY: 20 }
    const doc = { x: 50, y: 30 }
    const world = CoordinateSystem.documentToWorkspace(doc, origin)
    expect(world).toMatchObject({ space: 'workspace', x: 250, y: 70 })
    const view = CoordinateSystem.workspaceToViewport(world, viewport)
    const back = CoordinateSystem.viewportToDocument(view, viewport, origin)
    expect(back.x).toBeCloseTo(50, 5)
    expect(back.y).toBeCloseTo(30, 5)
  })

  it('preserves legacy origin 0 behavior', () => {
    const viewport = { zoom: 1, panX: 5, panY: 7 }
    const a = CoordinateSystem.documentToViewport({ x: 10, y: 20 }, viewport)
    const b = CoordinateSystem.documentToViewport({ x: 10, y: 20 }, viewport, { x: 0, y: 0 })
    expect(a).toEqual(b)
  })
})

describe('WorkspaceEngine', () => {
  it('places pages horizontally with gap and large pasteboard bounds', () => {
    let doc = sessionDoc()
    doc = PageEngine.add(doc, 'Two').document
    const workspace = WorkspaceEngine.layoutPages(doc)
    expect(workspace.placements.length).toBeGreaterThanOrEqual(2)
    expect(workspace.placements[1]!.x).toBeGreaterThan(workspace.placements[0]!.width)
    expect(workspace.bounds.width).toBeGreaterThan(workspace.placements[0]!.width)
    expect(workspace.config.background).toBeTruthy()
  })

  it('scales to many pages in O(n) layout', () => {
    let doc = sessionDoc()
    for (let i = 0; i < 20; i++) {
      doc = PageEngine.add(doc, `P${i}`).document
    }
    const workspace = WorkspaceEngine.layoutPages(doc)
    expect(workspace.placements).toHaveLength(doc.pages!.length)
    expect(workspace.placements.at(-1)!.x).toBeGreaterThan(0)
  })
})

describe('PageEngine delete / reorder', () => {
  it('deletes a non-last page and reorders', () => {
    let doc = sessionDoc()
    const firstId = doc.pages![0]!.id
    const second = PageEngine.add(doc, 'Second')
    doc = second.document
    const third = PageEngine.add(doc, 'Third')
    doc = third.document

    const ordered = doc.pages!.map((p) => p.id).reverse()
    doc = PageEngine.reorder(doc, ordered)!
    expect(doc.pages![0]!.id).toBe(ordered[0])

    doc = PageEngine.delete(doc, firstId)!
    expect(doc.pages!.some((p) => p.id === firstId)).toBe(false)
    expect(PageEngine.delete(doc, doc.pages![0]!.id)).not.toBeNull()
  })

  it('refuses to delete the last page', () => {
    const doc = sessionDoc()
    const only = doc.pages![0]!.id
    expect(PageEngine.delete(doc, only)).toBeNull()
  })

  it('DeletePage command mutates through applyCommand', () => {
    let doc = sessionDoc()
    doc = PageEngine.add(doc, 'Extra').document
    const victim = doc.pages![1]!.id
    const result = applyCommand(doc, {
      type: 'DeletePage',
      pageId: victim,
      timestamp: Date.now(),
    })
    expect(result.success).toBe(true)
    expect(result.document!.pages!.some((p) => p.id === victim)).toBe(false)
  })
})

describe('LayoutEngine bounds', () => {
  it('derives printable and safe/bleed from production meta', () => {
    const doc = sessionDoc()
    const bounds = LayoutEngine.bounds(doc)
    expect(bounds.crop.width).toBeGreaterThan(0)
    expect(bounds.printable.width).toBeGreaterThan(0)
    expect(bounds.safe).not.toBeNull()
    expect(bounds.bleed).not.toBeNull()
  })
})

describe('RulerEngine / GridEngine / GuidesEngine', () => {
  it('builds zoom-aware ruler ticks', () => {
    const ruler = RulerEngine.horizontal(1200, 'mm', 300, 1)
    expect(ruler.ticks.length).toBeGreaterThan(2)
    expect(ruler.ticks.some((t) => t.major && t.label)).toBe(true)
  })

  it('builds visible grid lines and snap step', () => {
    const model = GridEngine.build(100, 80, GridEngine.create({ visible: true, sizePx: 10, subdivisions: 2 }), 1)
    expect(model.lines.length).toBeGreaterThan(0)
    expect(model.snapStepPx).toBe(10)
    expect(GridEngine.snapValue(23, 10)).toBe(20)
  })

  it('supports lock, hide, and page-scoped snap targets', () => {
    const engine = new GuidesEngine()
    const g = engine.add('vertical', 40, { pageId: 'page-a' })
    engine.setLocked(g.id, true)
    expect(engine.move(g.id, 99)).toBe(false)
    engine.setGuideVisible(g.id, false)
    expect(engine.list()).toHaveLength(0)
    expect(engine.list({ includeHidden: true })).toHaveLength(1)
    engine.setGuideVisible(g.id, true)
    expect(engine.snapTargets('page-a').some((t) => t.id === g.id)).toBe(true)
  })
})

describe('DocumentEngine', () => {
  it('applies canvas and metadata config without touching elements', () => {
    const doc = sessionDoc()
    const next = DocumentEngine.applyConfig(doc, {
      name: 'Renamed',
      description: 'Workspace phase',
      dpi: 300,
    })
    expect(next.metadata.name).toBe('Renamed')
    expect(next.metadata.description).toBe('Workspace phase')
    expect(next.elements.length).toBe(doc.elements.length)
  })
})

describe('DocumentWorkspacePlatform facade', () => {
  it('composes document/page/layout/workspace/units/coords/guides/grid/rulers', () => {
    expect(DocumentWorkspacePlatform.document).toBe(DocumentEngine)
    expect(DocumentWorkspacePlatform.page).toBe(PageEngine)
    expect(DocumentWorkspacePlatform.workspace).toBe(WorkspaceEngine)
    expect(DocumentWorkspacePlatform.units).toBe(UnitsEngine)
    expect(DocumentWorkspacePlatform.rulers).toBe(RulerEngine)
    expect(DocumentWorkspacePlatform.grid).toBe(GridEngine)
  })
})
