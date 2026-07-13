import { describe, expect, it } from 'vitest'
import { ViewportManager } from '@/core/viewport/ViewportManager'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { cloneToSession } from '@/core/document/cloneToSession'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { serializeDocument } from '@/core/document/serializeDocument'

describe('ViewportManager zoomIn/Out center stability', () => {
  it('zoomIn adjusts pan so stage center maps to the same document point', () => {
    const vp = new ViewportManager()
    vp.setStageSize(800, 600)
    // Simulate fit-like placement
    vp.setZoom(0.5)
    vp.setPan(100, 80)

    const before = vp.getState()
    const cx = before.stageWidth / 2
    const cy = before.stageHeight / 2
    const docBefore = {
      x: (cx - before.panX) / before.zoom,
      y: (cy - before.panY) / before.zoom,
    }

    const after = vp.zoomIn(0.1)
    const docAfter = {
      x: (cx - after.panX) / after.zoom,
      y: (cy - after.panY) / after.zoom,
    }

    expect(after.zoom).toBeCloseTo(0.6, 5)
    expect(docAfter.x).toBeCloseTo(docBefore.x, 5)
    expect(docAfter.y).toBeCloseTo(docBefore.y, 5)
  })

  it('zoomIn and zoomAt(center) share the same focal algorithm', () => {
    const a = new ViewportManager()
    a.setStageSize(800, 600)
    a.setZoom(1)
    a.setPan(50, 40)
    const viaIn = a.zoomIn(0.1)

    const b = new ViewportManager()
    b.setStageSize(800, 600)
    b.setZoom(1)
    b.setPan(50, 40)
    const viaAt = b.zoomAt(1.1, 400, 300)

    expect(viaIn.zoom).toBeCloseTo(viaAt.zoom, 5)
    expect(viaIn.panX).toBeCloseTo(viaAt.panX, 5)
    expect(viaIn.panY).toBeCloseTo(viaAt.panY, 5)
  })
})

describe('Hit graph — non-selectable guides must not listen', () => {
  it('system guide cannot be selected; customer photo and text can', () => {
    const doc = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    const guide = doc.elements.find((el) => el.id === 'el_system_guide')!
    const photo = doc.elements.find((el) => el.id === 'el_customer_photo')!
    const text = doc.elements.find((el) => el.type === 'text')!

    expect(templateRulesEngine.can(guide, 'select', doc).allowed).toBe(false)
    expect(templateRulesEngine.can(photo, 'select', doc).allowed).toBe(true)
    expect(templateRulesEngine.can(text, 'select', doc).allowed).toBe(true)
    expect(templateRulesEngine.can(photo, 'move', doc).allowed).toBe(true)
    // ObjectLayer maps: listening && canSelect → guide false; photo/text true
    const guideListening = true && templateRulesEngine.can(guide, 'select', doc).allowed
    const photoListening = true && templateRulesEngine.can(photo, 'select', doc).allowed
    expect(guideListening).toBe(false)
    expect(photoListening).toBe(true)
  })
})
