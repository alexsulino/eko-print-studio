import { describe, expect, it } from 'vitest'
import {
  BENCHMARK_ELEMENT_COUNTS,
  countBenchmarkTypes,
  createBenchmarkDocument,
} from '@/diagnostics/benchmarkDocuments'
import { LayoutResolver } from '@/core/layout'
import { DocumentHealth } from '@/core/document/DocumentHealth'

describe('benchmark document fixtures', () => {
  it('creates small, medium and large documents with expected counts', () => {
    for (const size of ['small', 'medium', 'large'] as const) {
      const doc = createBenchmarkDocument(size)
      expect(doc.elements.length).toBe(BENCHMARK_ELEMENT_COUNTS[size])
      expect(doc.type).toBe('session')
      expect(doc.surfaces?.length).toBeGreaterThan(0)
    }
  })

  it('mixes text, shape and image nodes', () => {
    const doc = createBenchmarkDocument('medium')
    const types = countBenchmarkTypes(doc)
    expect(types.text).toBeGreaterThan(0)
    expect(types.shape).toBeGreaterThan(0)
    expect(types.image).toBeGreaterThan(0)
    expect(types.text + types.shape + types.image).toBe(100)
  })

  it('passes DocumentHealth and resolves layout for 500 elements under budget', () => {
    const doc = createBenchmarkDocument('large')
    const health = DocumentHealth.check(doc)
    expect(health.valid).toBe(true)

    const started = performance.now()
    const layout = LayoutResolver.resolve(doc, {
      pageId: doc.pages?.[0]?.id,
      surfaceId: doc.surfaces?.[0]?.id,
    })
    const elapsed = performance.now() - started

    expect(layout.elements.length).toBe(500)
    expect(elapsed).toBeLessThan(500)
  })
})
