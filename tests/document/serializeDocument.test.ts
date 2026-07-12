import { describe, expect, it } from 'vitest'
import { serializeDocument, exportDocument, importDocument } from '@/core/document/serializeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { cloneToSession } from '@/core/document/cloneToSession'

describe('serializeDocument', () => {
  it('exports a clean JSON without mutating the source', () => {
    const source = structuredClone(sampleMasterTemplate)
    const serialized = serializeDocument(source)

    expect(serialized.id).toBe(source.id)
    expect(serialized.schemaVersion).toBe('1.1.0')
    expect(serialized.elements).toHaveLength(source.elements.length)
    expect(serialized.permissions).toBeDefined()
    expect(serialized.variables.definitions[0]?.key).toBe('customer_name')
    expect(JSON.stringify(serialized).includes('__konva')).toBe(false)
  })

  it('round-trips through export/import', () => {
    const session = cloneToSession(sampleMasterTemplate)
    const json = exportDocument(session)
    const imported = importDocument(json)

    expect(imported.type).toBe('session')
    expect(imported.metadata.masterId).toBe(sampleMasterTemplate.id)
    expect(imported.elements.map((el) => el.slug)).toContain('customer-name')
    expect(imported.elements.every((el) => el.category)).toBe(true)
  })

  it('uses elements (not objects) as the graphic collection key', () => {
    const json = exportDocument(sampleMasterTemplate)
    const parsed = JSON.parse(json) as Record<string, unknown>
    expect(parsed.elements).toBeDefined()
    expect(parsed.objects).toBeUndefined()
  })
})
