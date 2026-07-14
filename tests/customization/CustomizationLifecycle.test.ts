import { describe, expect, it, beforeEach } from 'vitest'
import {
  CUSTOMIZATION_TRANSITIONS,
  canTransitionCustomization,
  ensureCustomizationFields,
  lifecycleFromSessionStatus,
  migrateSessionToCustomization,
} from '@/types/customization'
import {
  applyLifecycle,
  toCustomizationView,
  touchCurrentRevision,
} from '@/sdk/commerce/CustomizationLifecycle'
import { PersonalizationSessionManager } from '@/sdk/commerce/PersonalizationSessionManager'
import { InMemorySessionPersistenceProvider } from '@/providers/InMemorySessionPersistenceProvider'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'
import { SAMPLE_MASTER_ID } from '@/core/templates'
import { historyEngine } from '@/core/history/HistoryEngine'
import { eventBus } from '@/core/events/EventBus'
import type { PersonalizationSessionRecord } from '@/types/commerce'

const product = {
  productId: 'p-cust-1',
  templateId: SAMPLE_MASTER_ID,
  quantity: 1,
}

function legacySession(): PersonalizationSessionRecord {
  return {
    id: 'psess_legacy',
    status: 'finalized',
    product,
    documentId: 'doc_1',
    masterId: SAMPLE_MASTER_ID,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    finalizedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('Customization lifecycle transitions', () => {
  it('defines a directed acyclic happy-path with reopen edges', () => {
    expect(CUSTOMIZATION_TRANSITIONS.created).toContain('editing')
    expect(CUSTOMIZATION_TRANSITIONS.editing).toContain('saved')
    expect(CUSTOMIZATION_TRANSITIONS.saved).toContain('finalized')
    expect(CUSTOMIZATION_TRANSITIONS.finalized).toContain('cart_attached')
    expect(CUSTOMIZATION_TRANSITIONS.cart_attached).toContain('ordered')
    // Re-edit paths
    expect(canTransitionCustomization('finalized', 'editing')).toBe(true)
    expect(canTransitionCustomization('cart_attached', 'editing')).toBe(true)
    expect(canTransitionCustomization('ordered', 'editing')).toBe(true)
    // Invalid jumps
    expect(canTransitionCustomization('created', 'ordered')).toBe(false)
    expect(canTransitionCustomization('cancelled', 'editing')).toBe(false)
  })

  it('migrates session-only records transparently (customizationId === sessionId)', () => {
    const legacy = legacySession()
    const ensured = ensureCustomizationFields(legacy)
    expect(ensured.customizationId).toBe('psess_legacy')
    expect(ensured.lifecycle).toBe('finalized')

    const view = migrateSessionToCustomization(legacy)
    expect(view.schema).toBe('eko.customization/1')
    expect(view.id).toBe('psess_legacy')
    expect(view.sessionId).toBe('psess_legacy')
    expect(view.lifecycle).toBe('finalized')
  })

  it('maps legacy editor status → business lifecycle', () => {
    expect(lifecycleFromSessionStatus('idle')).toBe('created')
    expect(lifecycleFromSessionStatus('active')).toBe('editing')
    expect(lifecycleFromSessionStatus('saved')).toBe('saved')
    expect(lifecycleFromSessionStatus('finalized')).toBe('finalized')
    expect(lifecycleFromSessionStatus('cancelled')).toBe('cancelled')
    expect(lifecycleFromSessionStatus('finalized', { cartAttached: true })).toBe('cart_attached')
    expect(lifecycleFromSessionStatus('finalized', { ordered: true })).toBe('ordered')
  })

  it('applyLifecycle rejects invalid transitions', () => {
    const record = ensureCustomizationFields(legacySession())
    expect(() => applyLifecycle(record, 'created')).toThrow(/invalid transition/)
  })

  it('touchCurrentRevision keeps a single tip ready for future history', () => {
    const record = ensureCustomizationFields(legacySession())
    const touched = touchCurrentRevision(record, 'finalized')
    expect(touched.currentRevisionId).toBeTruthy()
    expect(touched.revisions).toHaveLength(1)
    expect(touched.revisions![0]!.label).toBe('finalized')
  })
})

describe('PersonalizationSessionManager as Customization engine', () => {
  beforeEach(() => {
    historyEngine.clear()
    eventBus.clear()
  })

  it('start → save → finalize → cart → order without new ids', async () => {
    const persistence = new InMemorySessionPersistenceProvider()
    const manager = new PersonalizationSessionManager({
      documentProvider: localDocumentProvider,
      persistence,
    })

    const started = await manager.start(product, 'page')
    expect(started.customizationId).toBe(started.id)
    expect(started.lifecycle).toBe('editing')
    expect(manager.getCustomization()?.id).toBe(started.id)

    const { record: saved, cart } = await manager.save()
    expect(saved.lifecycle).toBe('saved')
    expect(cart.customizationId).toBe(started.id)
    expect(cart.sessionId).toBe(started.id)

    const { record: finalized } = await manager.finalize()
    expect(finalized.lifecycle).toBe('finalized')
    expect(finalized.id).toBe(started.id)

    const cartAttached = await manager.markCartAttached()
    expect(cartAttached.lifecycle).toBe('cart_attached')
    expect(cartAttached.id).toBe(started.id)

    const ordered = await manager.markOrdered()
    expect(ordered.lifecycle).toBe('ordered')
    expect(ordered.customizationId).toBe(started.id)

    const resumed = await manager.resume(started.id)
    expect(resumed.id).toBe(started.id)
    expect(resumed.lifecycle).toBe('editing')
    expect(resumed.customizationId).toBe(started.id)

    manager.destroy()
  })

  it('resume migrates legacy session records and reuses the same id', async () => {
    const persistence = new InMemorySessionPersistenceProvider()
    const legacy = legacySession()
    await persistence.saveSession(legacy)

    const manager = new PersonalizationSessionManager({
      documentProvider: localDocumentProvider,
      persistence,
    })

    // Seed a document so hydrate can load (manager falls back to documentProvider).
    const doc = await localDocumentProvider.createSession(SAMPLE_MASTER_ID)
    await persistence.saveSession(
      { ...legacy, documentId: doc.id },
      doc,
    )

    const resumed = await manager.resume('psess_legacy')
    expect(resumed.id).toBe('psess_legacy')
    expect(resumed.customizationId).toBe('psess_legacy')
    expect(resumed.lifecycle).toBe('editing')
    expect(toCustomizationView(resumed).schema).toBe('eko.customization/1')

    manager.destroy()
  })
})
