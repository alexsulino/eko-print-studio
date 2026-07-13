import { describe, expect, it } from 'vitest'
import { templateRulesEngine } from '@/core/rules/TemplateRulesEngine'
import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { cloneToSession } from '@/core/document/cloneToSession'

describe('TemplateRulesEngine', () => {
  it('blocks edits on locked template masters', () => {
    const brand = sampleMasterTemplate.elements.find((el) => el.slug === 'brand-logo')!
    const decision = templateRulesEngine.can(brand, 'move', sampleMasterTemplate)
    expect(decision.allowed).toBe(false)
    expect(decision.reason.length).toBeGreaterThan(0)
  })

  it('allows customer text move and edits inside a session', () => {
    const session = cloneToSession(sampleMasterTemplate)
    const name = session.elements.find((el) => el.slug === 'customer-name')!
    expect(templateRulesEngine.can(name, 'changeText', session).allowed).toBe(true)
    expect(templateRulesEngine.can(name, 'move', session).allowed).toBe(true)
  })

  it('allows selecting protected brand elements but denies move', () => {
    const session = cloneToSession(sampleMasterTemplate)
    const brand = session.elements.find((el) => el.slug === 'brand-logo')!
    expect(templateRulesEngine.can(brand, 'select', session).allowed).toBe(true)
    expect(templateRulesEngine.can(brand, 'move', session).allowed).toBe(false)
  })
  it('validates allowed fonts', () => {
    const session = cloneToSession(sampleMasterTemplate)
    expect(templateRulesEngine.canUseFont(session, 'Montserrat').allowed).toBe(true)
    expect(templateRulesEngine.canUseFont(session, 'Comic Sans').allowed).toBe(false)
  })
})
