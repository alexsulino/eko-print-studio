import { describe, expect, it } from 'vitest'
import { AlignmentGuides } from '@/core/alignment/AlignmentGuides'
import { InteractionEngine } from '@/core/interaction'
import type { EkoElement } from '@/types/element'

function fakeElement(partial: Partial<EkoElement> & { id: string }): EkoElement {
  return {
    id: partial.id,
    slug: partial.slug ?? partial.id,
    type: partial.type ?? 'shape',
    category: partial.category ?? 'customer',
    name: partial.name ?? partial.id,
    visible: true,
    locked: false,
    editable: true,
    zIndex: 0,
    transform: partial.transform ?? {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    metadata: {},
    constraints: { selectable: true, move: true, resize: true, rotate: true },
    properties: partial.properties ?? { shape: 'rect', fill: '#000' },
  } as EkoElement
}

describe('AlignmentGuides', () => {
  it('unions selection bounds for zoom-to-selection', () => {
    const a = fakeElement({
      id: 'a',
      transform: { x: 10, y: 20, width: 100, height: 40, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    const b = fakeElement({
      id: 'b',
      transform: { x: 50, y: 100, width: 80, height: 30, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    const bounds = AlignmentGuides.selectionBounds([a, b])
    expect(bounds).toEqual({ x: 10, y: 20, width: 120, height: 110 })
  })

  it('exposes center guides for a rect', () => {
    const guides = AlignmentGuides.centerGuides({ x: 0, y: 0, width: 100, height: 50 })
    expect(guides).toHaveLength(2)
    expect(guides[0]).toMatchObject({ orientation: 'vertical', position: 50, kind: 'center' })
    expect(guides[1]).toMatchObject({ orientation: 'horizontal', position: 25, kind: 'center' })
  })

  it('aligns elements to selection left / horizontal center', () => {
    const a = fakeElement({
      id: 'a',
      transform: { x: 10, y: 0, width: 40, height: 20, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    const b = fakeElement({
      id: 'b',
      transform: { x: 80, y: 10, width: 20, height: 20, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    const left = AlignmentGuides.align([a, b], 'left')
    expect(left).toEqual([
      { elementId: 'a', x: 10, y: 0 },
      { elementId: 'b', x: 10, y: 10 },
    ])
    const center = AlignmentGuides.align([a, b], 'centerHorizontal')
    expect(center[0]!.x).toBeCloseTo(10 + (90 - 40) / 2)
    expect(center[1]!.x).toBeCloseTo(10 + (90 - 20) / 2)
  })

  it('distributes three elements horizontally with equal gaps', () => {
    const a = fakeElement({
      id: 'a',
      transform: { x: 0, y: 0, width: 10, height: 10, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    const b = fakeElement({
      id: 'b',
      transform: { x: 20, y: 0, width: 10, height: 10, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    const c = fakeElement({
      id: 'c',
      transform: { x: 90, y: 0, width: 10, height: 10, rotation: 0, scaleX: 1, scaleY: 1 },
    })
    const moves = AlignmentGuides.distribute([a, b, c], 'horizontal')
    expect(moves).toHaveLength(3)
    expect(moves[0]).toMatchObject({ elementId: 'a', x: 0 })
    expect(moves[2]).toMatchObject({ elementId: 'c', x: 90 })
    expect(moves[1]!.x).toBeCloseTo(45)
  })
})

describe('InteractionEngine facade', () => {
  it('composes selection, clipboard, snapping, transformer, keyboard, viewport, guides, alignment', () => {
    expect(InteractionEngine.selection).toBeDefined()
    expect(InteractionEngine.clipboard).toBeDefined()
    expect(InteractionEngine.snapping).toBeDefined()
    expect(InteractionEngine.transformer).toBeDefined()
    expect(InteractionEngine.keyboard).toBeDefined()
    expect(InteractionEngine.viewport).toBeDefined()
    expect(InteractionEngine.guides).toBeDefined()
    expect(InteractionEngine.alignment).toBe(AlignmentGuides)
  })
})
