import { describe, expect, it } from 'vitest'
import { DocumentHealth } from '@/core/document/DocumentHealth'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { cloneToSession } from '@/core/document/cloneToSession'
import { serializeDocument } from '@/core/document/serializeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import {
  getEditorDiagnosticsSnapshot,
  recordRendererMetrics,
  resetEditorDiagnosticsForTests,
} from '@/diagnostics/editorDiagnostics'

describe('editor diagnostics', () => {
  it('records renderer metrics without mutating the document', () => {
    resetEditorDiagnosticsForTests()
    const doc = normalizeDocument(cloneToSession(serializeDocument(sampleMasterTemplate)))
    const before = structuredClone(doc)

    recordRendererMetrics({
      elementCount: doc.elements.length,
      resolvedElements: doc.elements.length,
      renderNodes: doc.elements.length,
      stageWidth: 1200,
      stageHeight: 800,
      zoom: 0.5,
    })

    DocumentHealth.check(doc)
    expect(doc).toEqual(before)

    const snapshot = getEditorDiagnosticsSnapshot()
    expect(snapshot.lastRenderElementCount).toBe(doc.elements.length)
    expect(snapshot.lastStageWidth).toBe(1200)
  })
})
