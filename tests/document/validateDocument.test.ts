import { describe, expect, it } from 'vitest'
import { validateDocument } from '@/core/document/validateDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { cloneToSession } from '@/core/document/cloneToSession'
import { CURRENT_SCHEMA_VERSION } from '@/types/document'

describe('validateDocument', () => {
  it('accepts the sample master template', () => {
    const result = validateDocument(sampleMasterTemplate)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('requires semantic schemaVersion', () => {
    const result = validateDocument({
      ...sampleMasterTemplate,
      schemaVersion: 'v1',
    })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.path === 'schemaVersion')).toBe(true)
  })

  it('requires masterId on session documents', () => {
    const session = cloneToSession(sampleMasterTemplate)
    const broken = {
      ...session,
      metadata: { ...session.metadata, masterId: undefined },
    }
    const result = validateDocument(broken)
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.path === 'metadata.masterId')).toBe(true)
  })

  it('requires permissions, variables and element category', () => {
    const result = validateDocument({
      id: 'x',
      type: 'template',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      metadata: { name: 'x', createdAt: '', updatedAt: '' },
      canvas: { width: 10, height: 10, unit: 'mm', dpi: 300 },
      rules: { allowedFonts: [], allowedBackgrounds: [] },
      assets: { fonts: [], images: [], backgrounds: [] },
      elements: [
        {
          id: 'a',
          type: 'text',
          visible: true,
          locked: false,
          editable: true,
          zIndex: 0,
          transform: { x: 0, y: 0, width: 10, height: 10, rotation: 0, scaleX: 1, scaleY: 1 },
          metadata: {},
          constraints: {},
          properties: { text: 'a', fontFamily: 'Roboto', fontSize: 12, fill: '#000' },
        },
      ],
    })

    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.path === 'permissions')).toBe(true)
    expect(result.issues.some((i) => i.path === 'variables')).toBe(true)
    expect(result.issues.some((i) => i.path === 'elements[0].category')).toBe(true)
  })
})
