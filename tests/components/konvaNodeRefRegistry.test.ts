import { describe, expect, it, vi } from 'vitest'
import type Konva from 'konva'
import {
  KonvaNodeRefRegistry,
  applyNodeRefToMap,
} from '@/components/CanvasEditor/hooks/konvaNodeRefRegistry'

describe('KonvaNodeRefRegistry', () => {
  it('returns the same callback instance for the same element id', () => {
    const handler = vi.fn()
    const registry = new KonvaNodeRefRegistry(handler)

    const first = registry.getRef('text-1')
    const second = registry.getRef('text-1')

    expect(first).toBe(second)
  })

  it('does not recreate callbacks across simulated re-renders', () => {
    const handler = vi.fn()
    const registry = new KonvaNodeRefRegistry(handler)

    const refs = Array.from({ length: 5 }, () => registry.getRef('shape-1'))
    expect(new Set(refs).size).toBe(1)
  })

  it('tracks handler invocations via getStats', () => {
    const handler = vi.fn()
    const registry = new KonvaNodeRefRegistry(handler)
    const nodeRef = registry.getRef('el-1')
    const node = { id: 'el-1' } as unknown as Konva.Node

    nodeRef(node)
    nodeRef(null)

    expect(registry.getStats().handlerCalls).toBe(2)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('prune removes stale callbacks so a new id gets a fresh callback', () => {
    const handler = vi.fn()
    const registry = new KonvaNodeRefRegistry(handler)
    const before = registry.getRef('removed')

    registry.prune(new Set(['kept']))
    expect(registry.hasCallback('removed')).toBe(false)

    const after = registry.getRef('removed')
    expect(after).not.toBe(before)
  })

  it('clear drops all cached callbacks', () => {
    const registry = new KonvaNodeRefRegistry(vi.fn())
    registry.getRef('a')
    registry.getRef('b')

    registry.clear()

    expect(registry.hasCallback('a')).toBe(false)
    expect(registry.hasCallback('b')).toBe(false)
  })
})

describe('applyNodeRefToMap', () => {
  const nodeA = { tag: 'a' } as unknown as Konva.Node
  const nodeB = { tag: 'b' } as unknown as Konva.Node

  it('registers a node once and ignores duplicate registration', () => {
    const map = new Map<string, Konva.Node>()

    expect(applyNodeRefToMap(map, 'el-1', nodeA)).toBe(true)
    expect(applyNodeRefToMap(map, 'el-1', nodeA)).toBe(false)
    expect(map.get('el-1')).toBe(nodeA)
  })

  it('cleans up on real unmount', () => {
    const map = new Map<string, Konva.Node>([['el-1', nodeA]])

    expect(applyNodeRefToMap(map, 'el-1', null)).toBe(true)
    expect(map.has('el-1')).toBe(false)
  })

  it('ignores unmount when the id was never registered', () => {
    const map = new Map<string, Konva.Node>()

    expect(applyNodeRefToMap(map, 'missing', null)).toBe(false)
  })

  it('updates the map when Konva replaces the node instance', () => {
    const map = new Map<string, Konva.Node>([['el-1', nodeA]])

    expect(applyNodeRefToMap(map, 'el-1', nodeB)).toBe(true)
    expect(map.get('el-1')).toBe(nodeB)
  })
})
