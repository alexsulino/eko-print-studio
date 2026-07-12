import { describe, expect, it } from 'vitest'
import { SelectionEngine } from '@/core/selection/SelectionEngine'
import { ClipboardEngine } from '@/core/clipboard/ClipboardEngine'
import { SnappingEngine } from '@/core/snapping/SnappingEngine'
import { TransformerEngine } from '@/core/transformer/TransformerEngine'
import { KeyboardEngine } from '@/core/keyboard/KeyboardEngine'
import { applyCommand } from '@/core/editor/commands'
import { cloneToSession } from '@/core/document/cloneToSession'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { DEFAULT_SNAP_CONFIG } from '@/types/interaction'

describe('SelectionEngine', () => {
  it('supports replace, toggle and ctrl/shift click semantics', () => {
    expect(SelectionEngine.replace(['a', 'a', 'b'])).toEqual(['a', 'b'])
    expect(SelectionEngine.toggle(['a'], 'b')).toEqual(['a', 'b'])
    expect(SelectionEngine.toggle(['a', 'b'], 'a')).toEqual(['b'])
    expect(SelectionEngine.applyClick(['a'], 'b', { ctrlKey: true })).toEqual(['a', 'b'])
    expect(SelectionEngine.applyClick(['a'], 'b', { shiftKey: true })).toEqual(['a', 'b'])
    expect(SelectionEngine.applyClick(['a', 'b'], 'c', {})).toEqual(['c'])
  })

  it('selects elements intersecting a marquee', () => {
    const ids = SelectionEngine.fromMarquee(
      [
        { id: 'a', x: 0, y: 0, width: 10, height: 10 },
        { id: 'b', x: 50, y: 50, width: 10, height: 10 },
      ],
      { x1: 0, y1: 0, x2: 20, y2: 20 },
    )
    expect(ids).toEqual(['a'])
  })
})

describe('ClipboardEngine', () => {
  it('copies and pastes document elements with new ids', () => {
    const session = cloneToSession(sampleMasterTemplate)
    const photo = session.elements.find((el) => el.slug === 'customer-photo')!
    const engine = new ClipboardEngine()
    engine.copy([photo])
    const pasted = engine.paste()
    expect(pasted).toHaveLength(1)
    expect(pasted[0]!.id).not.toBe(photo.id)
    expect(pasted[0]!.transform.x).toBe(photo.transform.x + 24)
  })
})

describe('TransformerEngine', () => {
  it('flips and nudges transforms in document space', () => {
    const base = { x: 10, y: 20, width: 100, height: 50, rotation: 0, scaleX: 1, scaleY: 1 }
    expect(TransformerEngine.flipHorizontal(base).scaleX).toBe(-1)
    expect(TransformerEngine.flipVertical(base).scaleY).toBe(-1)
    expect(TransformerEngine.nudge(base, 5, -2)).toMatchObject({ x: 15, y: 18 })
  })
})

describe('SnappingEngine', () => {
  it('snaps to document center and exposes guides', () => {
    const session = cloneToSession(sampleMasterTemplate)
    const targets = SnappingEngine.collectTargets(session, [], DEFAULT_SNAP_CONFIG)
    expect(targets.some((t) => t.kind === 'center')).toBe(true)
    expect(targets.some((t) => t.kind === 'safe')).toBe(true)
    expect(targets.some((t) => t.kind === 'bleed')).toBe(true)

    const result = SnappingEngine.snapBox(
      { x: 588, y: 100, width: 10, height: 10 },
      targets,
      { ...DEFAULT_SNAP_CONFIG, thresholdPx: 12 },
    )
    expect(result.guides.length).toBeGreaterThan(0)
  })
})

describe('KeyboardEngine', () => {
  it('maps primary shortcuts to intents', () => {
    const del = KeyboardEngine.resolve({ key: 'Delete', ctrlKey: false, metaKey: false, shiftKey: false })
    expect(del).toEqual({ type: 'delete' })
    const copy = KeyboardEngine.resolve({ key: 'c', ctrlKey: true, metaKey: false, shiftKey: false })
    expect(copy).toEqual({ type: 'copy' })
    const nudge = KeyboardEngine.resolve({ key: 'ArrowRight', ctrlKey: false, metaKey: false, shiftKey: true })
    expect(nudge).toEqual({ type: 'nudge', dx: 10, dy: 0 })
  })
})

describe('Interaction commands', () => {
  it('duplicates selectable elements through AddElements pipeline', () => {
    const session = cloneToSession(sampleMasterTemplate)
    const photo = session.elements.find((el) => el.slug === 'customer-photo')!
    const result = applyCommand(session, {
      type: 'DuplicateElements',
      elementIds: [photo.id],
      timestamp: Date.now(),
    })
    expect(result.success).toBe(true)
    expect(result.document.elements.length).toBe(session.elements.length + 1)
    expect(result.selectedIds?.length).toBe(1)
  })

  it('applies TransformElement as a single mutation', () => {
    const session = cloneToSession(sampleMasterTemplate)
    const photo = session.elements.find((el) => el.slug === 'customer-photo')!
    const result = applyCommand(session, {
      type: 'TransformElement',
      elementId: photo.id,
      transform: { x: 12, y: 14, width: 200, height: 200, rotation: 15 },
      timestamp: Date.now(),
    })
    expect(result.success).toBe(true)
    const next = result.document.elements.find((el) => el.id === photo.id)!
    expect(next.transform).toMatchObject({ x: 12, y: 14, width: 200, height: 200, rotation: 15 })
  })
})
