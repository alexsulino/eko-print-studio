import { describe, expect, it } from 'vitest'
import { getDocumentPixelSize, toPixels, fromPixels } from '@/core/document/units'
import { CommandHistoryEngine } from '@/core/history/HistoryEngine'
import { sampleMasterTemplate } from '@/data/sampleDocuments'

describe('units', () => {
  it('converts 100mm @ 300dpi to document pixels', () => {
    const size = getDocumentPixelSize({
      width: 100,
      height: 100,
      unit: 'mm',
      dpi: 300,
    })
    expect(size.widthPx).toBe(Math.round((100 / 25.4) * 300))
    expect(size.heightPx).toBe(size.widthPx)
  })

  it('round-trips mm ↔ px', () => {
    const px = toPixels(50, 'mm', 300)
    const mm = fromPixels(px, 'mm', 300)
    expect(mm).toBeCloseTo(50, 5)
  })

  it('round-trips in and pt', () => {
    expect(toPixels(1, 'in', 300)).toBe(300)
    expect(fromPixels(300, 'pt', 300)).toBeCloseTo(72, 5)
  })
})

describe('CommandHistoryEngine', () => {
  it('stores commands for future undo/redo', () => {
    const history = new CommandHistoryEngine()
    const command = {
      type: 'MoveElement' as const,
      elementId: 'el_customer_name',
      x: 10,
      y: 20,
      timestamp: Date.now(),
    }

    history.push(command, sampleMasterTemplate, sampleMasterTemplate)
    expect(history.canUndo()).toBe(true)
    expect(history.undo()?.type).toBe('MoveElement')
    expect(history.canRedo()).toBe(true)
    expect(history.redo()?.type).toBe('MoveElement')
  })
})
