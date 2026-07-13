import { describe, expect, it } from 'vitest'
import { applyCommand } from '@/core/editor/commands'
import { cloneToSession } from '@/core/document/cloneToSession'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { serializeDocument } from '@/core/document/serializeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'

function sessionDoc() {
  return normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
}

describe('TransformElement independent constraints', () => {
  it('allows resize when move is denied (strips x/y only)', () => {
    const doc = sessionDoc()
    const brand = doc.elements.find((el) => el.slug === 'brand-logo')!
    expect(templateRulesEngine.can(brand, 'move', doc).allowed).toBe(false)
    expect(templateRulesEngine.can(brand, 'resize', doc).allowed).toBe(false)

    // Use customer name with move denied artificially
    const lockedMove = {
      ...doc,
      elements: doc.elements.map((el) =>
        el.slug === 'demo-title'
          ? { ...el, constraints: { ...el.constraints, move: false, resize: true } }
          : el,
      ),
    }
    const title = lockedMove.elements.find((el) => el.slug === 'demo-title')!
    const result = applyCommand(lockedMove, {
      type: 'TransformElement',
      elementId: title.id,
      transform: {
        x: title.transform.x + 40,
        y: title.transform.y + 20,
        width: title.transform.width * 1.5,
        height: title.transform.height * 1.5,
        scaleX: 1,
        scaleY: 1,
      },
      timestamp: Date.now(),
    })
    expect(result.success).toBe(true)
    const next = result.document.elements.find((el) => el.id === title.id)!
    expect(next.transform.x).toBe(title.transform.x)
    expect(next.transform.y).toBe(title.transform.y)
    expect(next.transform.width).toBeCloseTo(title.transform.width * 1.5)
    expect(next.transform.height).toBeCloseTo(title.transform.height * 1.5)
  })
})

describe('Text resize bakes fontSize', () => {
  it('scales fontSize with height when TransformElement resizes text', () => {
    const doc = sessionDoc()
    const title = doc.elements.find((el) => el.slug === 'demo-title')!
    expect(title.type).toBe('text')
    if (title.type !== 'text') return

    const result = applyCommand(doc, {
      type: 'TransformElement',
      elementId: title.id,
      transform: {
        width: title.transform.width,
        height: title.transform.height * 2,
        scaleX: 1,
        scaleY: 1,
      },
      timestamp: Date.now(),
    })
    expect(result.success).toBe(true)
    const next = result.document.elements.find((el) => el.id === title.id)!
    expect(next.type).toBe('text')
    if (next.type === 'text') {
      expect(next.properties.fontSize).toBeCloseTo(title.properties.fontSize * 2)
      expect(next.transform.scaleX).toBe(1)
      expect(next.transform.scaleY).toBe(1)
    }
  })
})

describe('Demo document editable set', () => {
  it('includes fully editable text, image, and shape', () => {
    const doc = sessionDoc()
    const title = doc.elements.find((el) => el.slug === 'demo-title')!
    const photo = doc.elements.find((el) => el.slug === 'customer-photo')!
    const shape = doc.elements.find((el) => el.slug === 'demo-shape')!
    for (const el of [title, photo, shape]) {
      expect(templateRulesEngine.can(el, 'select', doc).allowed).toBe(true)
      expect(templateRulesEngine.can(el, 'move', doc).allowed).toBe(true)
      expect(templateRulesEngine.can(el, 'resize', doc).allowed).toBe(true)
      expect(templateRulesEngine.can(el, 'rotate', doc).allowed).toBe(true)
    }
  })
})
