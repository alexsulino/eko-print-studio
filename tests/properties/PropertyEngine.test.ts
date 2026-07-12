import { describe, expect, it } from 'vitest'
import { PropertyEngine } from '@/core/properties/PropertyEngine'
import { applyCommand } from '@/core/editor/commands'
import { cloneToSession } from '@/core/document/cloneToSession'
import { normalizeDocument } from '@/core/document/normalizeDocument'
import { sampleMasterTemplate } from '@/data/sampleDocuments'

describe('PropertyEngine', () => {
  it('reads editable property descriptors for text elements', () => {
    const session = normalizeDocument(cloneToSession(sampleMasterTemplate))
    const name = session.elements.find((el) => el.slug === 'customer-name')!
    const descriptors = PropertyEngine.getDescriptors(session, name)
    expect(descriptors.some((d) => d.path === 'properties.text')).toBe(true)
    expect(descriptors.some((d) => d.path === 'properties.fontFamily')).toBe(true)
    expect(descriptors.find((d) => d.path === 'properties.text')?.editable).toBe(true)
  })

  it('marks move-blocked transform fields as not editable', () => {
    const session = normalizeDocument(cloneToSession(sampleMasterTemplate))
    const name = session.elements.find((el) => el.slug === 'customer-name')!
    const x = PropertyEngine.getDescriptors(session, name).find((d) => d.path === 'transform.x')
    expect(x?.editable).toBe(false)
    expect(x?.reason?.length).toBeGreaterThan(0)
  })

  it('creates UpdateProperty command when allowed', () => {
    const session = normalizeDocument(cloneToSession(sampleMasterTemplate))
    const name = session.elements.find((el) => el.slug === 'customer-name')!
    const prepared = PropertyEngine.createUpdateCommand(session, name.id, 'properties.text', 'Alex')
    expect(prepared.success).toBe(true)
    if (!prepared.success) return
    expect(prepared.command.type).toBe('UpdateProperty')
    expect(name.type).toBe('text')
    expect(prepared.command.oldValue).toBe(name.type === 'text' ? name.properties.text : undefined)
    expect(prepared.command.newValue).toBe('Alex')

    const applied = applyCommand(session, prepared.command)
    expect(applied.success).toBe(true)
    const next = applied.document.elements.find((el) => el.id === name.id)
    expect(next?.type === 'text' && next.properties.text).toBe('Alex')
  })

  it('blocks forbidden property updates via rules', () => {
    const session = normalizeDocument(cloneToSession(sampleMasterTemplate))
    const name = session.elements.find((el) => el.slug === 'customer-name')!
    const blocked = PropertyEngine.createUpdateCommand(session, name.id, 'transform.x', 999)
    expect(blocked.success).toBe(false)

    const applied = applyCommand(session, {
      type: 'UpdateProperty',
      elementId: name.id,
      path: 'transform.x',
      oldValue: name.transform.x,
      newValue: 999,
      timestamp: Date.now(),
    })
    expect(applied.success).toBe(false)
  })

  it('blocks fonts outside the allow-list', () => {
    const session = normalizeDocument(cloneToSession(sampleMasterTemplate))
    const name = session.elements.find((el) => el.slug === 'customer-name')!
    const blocked = PropertyEngine.createUpdateCommand(
      session,
      name.id,
      'properties.fontFamily',
      'Comic Sans',
    )
    expect(blocked.success).toBe(false)
  })
})
