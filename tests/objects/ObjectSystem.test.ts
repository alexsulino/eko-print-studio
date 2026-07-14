import { describe, expect, it, beforeAll } from 'vitest'
import { registerBuiltins } from '@/core/registry/registerBuiltins'
import { objectRegistry } from '@/core/registry/ObjectRegistry'
import { ObjectFactory } from '@/core/objects/ObjectFactory'
import { NamingEngine } from '@/core/objects/NamingEngine'
import { StyleEngine } from '@/core/objects/StyleEngine'
import { ConstraintEngine } from '@/core/objects/ConstraintEngine'
import { HitTestEngine } from '@/core/objects/HitTestEngine'
import { migrateElement } from '@/core/objects/migrateElement'
import { PropertyEngine } from '@/core/properties/PropertyEngine'
import { GroupEngine } from '@/core/groups/GroupEngine'
import { LayerEngine } from '@/core/layers/LayerEngine'
import { applyCommand } from '@/core/editor/commands'
import { cloneToSession } from '@/core/document/cloneToSession'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { serializeDocument } from '@/core/document/serializeDocument'

beforeAll(() => {
  registerBuiltins()
})

function sessionDoc() {
  return normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
}

describe('ObjectRegistry', () => {
  it('registers all plugin object types with capabilities and renderer keys', () => {
    const types = objectRegistry.list().map((d) => d.type)
    expect(types).toEqual(
      expect.arrayContaining([
        'text',
        'image',
        'shape',
        'group',
        'frame',
        'table',
        'svg',
        'qr-code',
        'barcode',
      ]),
    )
    expect(objectRegistry.capabilities('text')?.editText).toBe(true)
    expect(objectRegistry.capabilities('image')?.acceptImage).toBe(true)
    expect(objectRegistry.rendererKey('shape')).toBe('shape')
  })

  it('creates defaults via factory without reinventing ids', () => {
    const shape = objectRegistry.create('shape')
    expect(shape?.type).toBe('shape')
    expect(shape?.transform.originX).toBe(0)
    expect(shape?.appearance?.fill).toBeTruthy()
  })
})

describe('ObjectFactory + NamingEngine', () => {
  it('assigns non-colliding names', () => {
    const doc = sessionDoc()
    const a = ObjectFactory.create(doc, 'shape')!
    const withA = { ...doc, elements: [...doc.elements, a] }
    const b = ObjectFactory.create(withA, 'shape')!
    expect(a.name).toMatch(/Shape|Rectangle/)
    expect(b.name).not.toBe(a.name)
  })

  it('nextName increments', () => {
    expect(NamingEngine.nextName([], 'Text')).toBe('Text 1')
    expect(
      NamingEngine.nextName([{ name: 'Text 1' } as never, { name: 'Text 2' } as never], 'Text'),
    ).toBe('Text 3')
  })
})

describe('PropertyEngine patch / migrate', () => {
  it('migrates legacy elements with timestamps and appearance', () => {
    const doc = sessionDoc()
    const photo = doc.elements.find((el) => el.type === 'image')!
    expect(photo.createdAt).toBeTruthy()
    expect(photo.transform.originX).toBe(0)
    expect(photo.appearance).toBeTruthy()
  })

  it('patches nested paths and mirrors style', () => {
    const doc = sessionDoc()
    const shape = doc.elements.find((el) => el.type === 'shape')!
    const patched = PropertyEngine.patch(shape, { 'properties.fill': '#ff0000' })
    expect(PropertyEngine.getValue(patched, 'properties.fill')).toBe('#ff0000')
    const styled = StyleEngine.applyAppearance(shape, { fill: '#00ff00' })
    expect(styled.type === 'shape' && styled.properties.fill).toBe('#00ff00')
    expect(styled.appearance?.fill).toBe('#00ff00')
  })
})

describe('ConstraintEngine + HitTestEngine', () => {
  it('centers with layout constraints', () => {
    const next = ConstraintEngine.apply(
      { x: 0, y: 0, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 },
      { center: true, constraints: ['centerX', 'centerY'] },
      { bounds: { x: 0, y: 0, width: 400, height: 300 } },
    )
    expect(next.x).toBe(150)
    expect(next.y).toBe(125)
  })

  it('picks top-most element under a point', () => {
    const boxes = [
      HitTestEngine.boxFromTransform('a', 'shape', { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 }, null, 1),
      HitTestEngine.boxFromTransform('b', 'shape', { x: 10, y: 10, width: 40, height: 40, rotation: 0, scaleX: 1, scaleY: 1 }, null, 5),
    ]
    const hit = HitTestEngine.hitTest({ x: 20, y: 20 }, boxes)
    expect(hit.elementId).toBe('b')
  })
})

describe('GroupEngine transform propagation', () => {
  it('moves children when group moves via command', () => {
    let doc = sessionDoc()
    const ids = doc.elements
      .filter((el) => el.constraints.selectable !== false && el.type !== 'group')
      .slice(0, 2)
      .map((el) => el.id)
    expect(ids.length).toBe(2)
    doc = GroupEngine.createGroup(doc, ids, 'Bundle')
    const group = doc.elements.find((el) => el.type === 'group')!
    const childBefore = doc.elements.find((el) => el.id === ids[0])!
    const result = applyCommand(doc, {
      type: 'MoveElement',
      elementId: group.id,
      x: group.transform.x + 40,
      y: group.transform.y + 20,
      timestamp: Date.now(),
    })
    expect(result.success).toBe(true)
    const childAfter = result.document!.elements.find((el) => el.id === ids[0])!
    expect(childAfter.transform.x).toBe(childBefore.transform.x + 40)
    expect(childAfter.transform.y).toBe(childBefore.transform.y + 20)
  })
})

describe('LayerEngine moveBefore / moveAfter', () => {
  it('reorders siblings', () => {
    const doc = sessionDoc()
    const list = LayerEngine.listForSurface(doc)
    const a = list[0]!
    const b = list[1]
    if (!b) return
    const next = LayerEngine.moveBefore(doc, a.id, b.id)
    const siblings = next.elements
      .filter((el) => (el.parentId ?? null) === (a.parentId ?? null))
      .sort((x, y) => x.zIndex - y.zIndex)
    const ai = siblings.findIndex((el) => el.id === a.id)
    const bi = siblings.findIndex((el) => el.id === b.id)
    expect(ai).toBeLessThan(bi)
  })
})

describe('migrateElement idempotent', () => {
  it('keeps values stable on second migrate', () => {
    const doc = sessionDoc()
    const el = doc.elements[0]!
    const once = migrateElement(el)
    const twice = migrateElement(once)
    expect(twice.transform.originX).toBe(once.transform.originX)
    expect(twice.selectable).toBe(once.selectable)
  })
})
