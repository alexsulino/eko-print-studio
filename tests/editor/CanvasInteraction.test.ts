import { describe, expect, it } from 'vitest'
import {
  CANVAS_FOUNDATION_SNAP,
  SNAP_ROADMAP_DEFAULTS,
  describeMoveCommand,
  describeTransformCommand,
  resolveCanvasSelection,
} from '@/editor/canvas'
import { SnappingEngine } from '@/core/snapping/SnappingEngine'
import { applyCommand } from '@/core/editor/commands'
import { cloneToSession } from '@/core/document/cloneToSession'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { serializeDocument } from '@/core/document/serializeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { FOUNDATION_SNAP_CONFIG } from '@/types/interaction'

describe('Canvas Interaction Foundation — selection', () => {
  it('resolves simple, ctrl multi, and shift add via SelectionEngine bridge', () => {
    expect(resolveCanvasSelection(['a'], 'b', {})).toEqual(['b'])
    expect(resolveCanvasSelection(['a'], 'b', { ctrlKey: true })).toEqual(['a', 'b'])
    expect(resolveCanvasSelection(['a'], 'b', { metaKey: true })).toEqual(['a', 'b'])
    expect(resolveCanvasSelection(['a'], 'b', { shiftKey: true })).toEqual(['a', 'b'])
  })
})

describe('Canvas Interaction Foundation — transform commands', () => {
  it('maps transformer payload to TransformElement and applies via history path', () => {
    const session = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    const photo = session.elements.find((el) => el.slug === 'customer-photo')!
    const described = describeTransformCommand({
      id: photo.id,
      x: 100,
      y: 120,
      width: 200,
      height: 200,
      rotation: 15,
      scaleX: 1,
      scaleY: 1,
    })
    expect(described.type).toBe('TransformElement')

    const result = applyCommand(session, {
      ...described,
      timestamp: Date.now(),
    })
    expect(result.success).toBe(true)
    const updated = result.document.elements.find((el) => el.id === photo.id)!
    expect(updated.transform).toMatchObject({
      x: 100,
      y: 120,
      width: 200,
      height: 200,
      rotation: 15,
    })
  })

  it('maps drag end to MoveElement command shape', () => {
    expect(describeMoveCommand({ id: 'el_1', x: 10, y: 20 })).toEqual({
      type: 'MoveElement',
      elementId: 'el_1',
      x: 10,
      y: 20,
    })
  })
})

describe('Canvas Interaction Foundation — snap', () => {
  it('foundation snap includes only page edges and center', () => {
    expect(CANVAS_FOUNDATION_SNAP).toEqual(FOUNDATION_SNAP_CONFIG)
    expect(CANVAS_FOUNDATION_SNAP.documentEdges).toBe(true)
    expect(CANVAS_FOUNDATION_SNAP.documentCenter).toBe(true)
    expect(CANVAS_FOUNDATION_SNAP.objectEdges).toBe(false)
    expect(CANVAS_FOUNDATION_SNAP.margins).toBe(false)
    expect(CANVAS_FOUNDATION_SNAP.safeArea).toBe(false)
    expect(CANVAS_FOUNDATION_SNAP.bleed).toBe(false)
    expect(SNAP_ROADMAP_DEFAULTS).toEqual({
      grid: false,
      guides: true,
      smartAlignment: true,
    })
  })

  it('collectTargets with foundation config yields edge and center only', () => {
    const session = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    const targets = SnappingEngine.collectTargets(session, [], FOUNDATION_SNAP_CONFIG)
    const kinds = new Set(targets.map((t) => t.kind))
    expect(kinds.has('edge')).toBe(true)
    expect(kinds.has('center')).toBe(true)
    expect(kinds.has('object')).toBe(false)
    expect(kinds.has('margin')).toBe(false)
    expect(kinds.has('safe')).toBe(false)
    expect(kinds.has('bleed')).toBe(false)
  })
})
