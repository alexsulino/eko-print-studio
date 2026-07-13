import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach } from 'vitest'
import { LayerEngine } from '@/core/layers/LayerEngine'
import { SelectionEngine } from '@/core/selection/SelectionEngine'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { cloneToSession } from '@/core/document/cloneToSession'
import { serializeDocument } from '@/core/document/serializeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { LayerTree } from '@/editor/layers/LayerTree'
import { toLayerTreeNodes } from '@/editor/layers/types'
import { layerTypeGlyph } from '@/editor/layers/layerIcons'

describe('Layer Experience — view model', () => {
  it('maps LayerEngine items into tree nodes with childIds for future nesting', () => {
    const session = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    const items = LayerEngine.listForSurface(session, session.surfaces?.[0]?.id)
    const nodes = toLayerTreeNodes(items)

    expect(nodes.length).toBe(items.length)
    expect(nodes.every((n) => Array.isArray(n.childIds))).toBe(true)
    expect(nodes.some((n) => n.type === 'text' || n.type === 'image' || n.type === 'shape')).toBe(
      true,
    )
  })

  it('provides glyphs for common element types', () => {
    expect(layerTypeGlyph('text')).toBe('T')
    expect(layerTypeGlyph('image')).toBe('Img')
    expect(layerTypeGlyph('shape')).toBe('Sh')
  })
})

describe('Layer Experience — selection wiring', () => {
  it('uses SelectionEngine.applyClick without parallel state', () => {
    expect(SelectionEngine.applyClick(['a'], 'b', {})).toEqual(['b'])
    expect(SelectionEngine.applyClick(['a'], 'b', { ctrlKey: true })).toEqual(['a', 'b'])
    expect(SelectionEngine.applyClick(['a', 'b'], 'a', { metaKey: true })).toEqual(['b'])
    expect(SelectionEngine.applyClick(['a'], 'b', { shiftKey: true })).toEqual(['a', 'b'])
  })
})

describe('LayerTree UI', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
  })

  it('renders layer rows and forwards selection clicks', () => {
    const onSelect = vi.fn()
    const nodes = toLayerTreeNodes([
      {
        id: 'el_1',
        name: 'Logo',
        type: 'shape',
        zIndex: 1,
        visible: true,
        locked: false,
        parentId: null,
        effectivelyVisible: true,
        effectivelyLocked: false,
        depth: 0,
      },
    ])

    act(() => {
      root.render(
        <LayerTree nodes={nodes} selectedIds={['el_1']} onSelect={onSelect} />,
      )
    })

    expect(container.querySelector('[data-testid="layer-item-el_1"]')).toBeTruthy()
    expect(container.textContent).toContain('Logo')
    expect(container.textContent).toContain('shape')

    const button = container.querySelector('.eko-layer-item__main') as HTMLButtonElement
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }))
    })

    expect(onSelect).toHaveBeenCalledWith('el_1', {
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
    })
  })
})
