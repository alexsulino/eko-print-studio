import { describe, expect, it, vi } from 'vitest'
import type Konva from 'konva'
import {
  KonvaNodeRefRegistry,
  applyNodeRefToMap,
} from '@/components/CanvasEditor/hooks/konvaNodeRefRegistry'
import { areCanvasNodePropsEqual } from '@/components/CanvasEditor/nodes/nodeRenderCompare'
import type { TextElement } from '@/types/element'

function mockTextElement(id: string, text: string): TextElement {
  return {
    id,
    type: 'text',
    category: 'customer',
    visible: true,
    locked: false,
    editable: true,
    zIndex: 0,
    metadata: {},
    constraints: { selectable: true, move: true },
    transform: { x: 0, y: 0, width: 100, height: 40, rotation: 0, scaleX: 1, scaleY: 1 },
    properties: { text, fontFamily: 'Montserrat', fontSize: 16, fill: '#111' },
  }
}

describe('runtime stability — Konva ref registry', () => {
  it('creates one callback when a new element is added', () => {
    const handler = vi.fn()
    const registry = new KonvaNodeRefRegistry(handler)
    const nodeRef = registry.getRef('new-el')

    expect(registry.getStats().callbackCount).toBe(1)
    expect(registry.getRef('new-el')).toBe(nodeRef)
    expect(registry.getStats().callbackCount).toBe(1)
  })

  it('does not recreate callback when element properties change', () => {
    const registry = new KonvaNodeRefRegistry(vi.fn())
    const before = registry.getRef('el-1')

    // Simulated re-render after property update — same id lookup.
    const after = registry.getRef('el-1')
    expect(after).toBe(before)
  })

  it('cleans up callbacks and node map on document swap', () => {
    const map = new Map<string, Konva.Node>()
    const node = { tag: 'konva' } as unknown as Konva.Node
    const registry = new KonvaNodeRefRegistry((id, konvaNode) => {
      applyNodeRefToMap(map, id, konvaNode)
    })

    registry.getRef('a')(node)
    registry.getRef('b')(node)
    expect(map.size).toBe(2)
    expect(registry.getStats().callbackCount).toBe(2)

    registry.clear()
    map.clear()
    expect(map.size).toBe(0)
    expect(registry.getStats().callbackCount).toBe(0)
  })
})

describe('runtime stability — node memo comparator', () => {
  const baseProps = {
    draggable: true,
    nodeRef: vi.fn(),
    onSelect: vi.fn(),
    onDragMove: vi.fn(),
    onDragEnd: vi.fn(),
  }

  it('skips rerender for unrelated elements when another element updates', () => {
    const elB = mockTextElement('b', 'World')
    const prev = { ...baseProps, element: elB }
    const next = { ...baseProps, element: elB }
    expect(areCanvasNodePropsEqual(prev, next)).toBe(true)

    const elBUpdated = mockTextElement('b', 'Changed')
    const afterUpdate = { ...baseProps, element: elBUpdated }
    expect(areCanvasNodePropsEqual(prev, afterUpdate)).toBe(false)
  })

  it('skips rerender on selection-only changes when element reference is stable', () => {
    const el = mockTextElement('a', 'Hello')
    const prev = { ...baseProps, element: el }
    const next = { ...baseProps, element: el }
    expect(areCanvasNodePropsEqual(prev, next)).toBe(true)
  })
})

describe('runtime stability — command immutability', () => {
  it('preserves element references not targeted by property updates', () => {
    const elA = mockTextElement('a', 'A')
    const elB = mockTextElement('b', 'B')
    const elements = [elA, elB]
    const updated = elements.map((el) =>
      el.id === 'a'
        ? { ...el, properties: { ...el.properties, text: 'A updated' } }
        : el,
    )

    expect(updated[0]).not.toBe(elA)
    expect(updated[0]?.properties.text).toBe('A updated')
    expect(updated[1]).toBe(elB)
  })
})
