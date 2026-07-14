import { describe, expect, it, vi } from 'vitest'
import { LocalPersistenceProvider } from '@/providers/LocalPersistenceProvider'
import { CompositePersistenceProvider } from '@/providers/CompositePersistenceProvider'
import { InMemorySessionPersistenceProvider } from '@/providers/InMemorySessionPersistenceProvider'
import { WooCommercePersistenceProvider } from '@/adapters/woocommerce/WooCommercePersistenceProvider'
import { createCommercePersistence } from '@/adapters/woocommerce/createCommercePersistence'
import { PersonalizationSessionManager } from '@/sdk/commerce/PersonalizationSessionManager'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'
import { SAMPLE_MASTER_ID } from '@/core/templates'
import { historyEngine } from '@/core/history/HistoryEngine'
import { eventBus } from '@/core/events/EventBus'
import type { PersonalizationSessionRecord } from '@/types/commerce'

const product = {
  productId: 'p-1',
  templateId: SAMPLE_MASTER_ID,
  quantity: 1,
}

describe('SessionPersistenceProvider architecture', () => {
  it('LocalPersistenceProvider stores session + document without legacy SessionStore', async () => {
    const persistence = new LocalPersistenceProvider('eko-test-local-sess')
    const manager = new PersonalizationSessionManager({
      documentProvider: localDocumentProvider,
      persistence,
    })
    historyEngine.clear()
    eventBus.clear()
    const started = await manager.start(product, 'modal')
    const loaded = await persistence.loadSession(started.id)
    expect(loaded?.record.id).toBe(started.id)
    expect(loaded?.document?.type).toBe('session')
    manager.destroy()
  })

  it('Composite falls back to local when primary fails', async () => {
    const primary = new InMemorySessionPersistenceProvider()
    const fallback = new InMemorySessionPersistenceProvider()
    vi.spyOn(primary, 'saveSession').mockRejectedValue(new Error('remote down'))
    const composite = new CompositePersistenceProvider({ primary, fallback })
    const record: PersonalizationSessionRecord = {
      id: 'psess_test_1',
      status: 'active',
      product,
      documentId: 'doc_1',
      masterId: SAMPLE_MASTER_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const saved = await composite.saveSession(record)
    expect(saved.id).toBe('psess_test_1')
    expect(composite.activeBackend).toBe('local')
    const hit = await fallback.loadSession('psess_test_1')
    expect(hit?.record.id).toBe('psess_test_1')
  })

  it('createCommercePersistence uses local without REST credentials', () => {
    const p = createCommercePersistence({})
    expect(p.id).toBe('local')
  })

  it('createCommercePersistence uses composite when REST credentials present', () => {
    const p = createCommercePersistence({
      restUrl: 'https://loja.example/wp-json/eko-print/v1',
      token: 'tok',
      localStorageKey: 'eko-test-composite',
    })
    expect(p.id).toBe('composite')
  })

  it('WooCommercePersistenceProvider talks REST with token header', async () => {
    const fetchImpl: typeof fetch = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
        return new Response(JSON.stringify({ record: { id: 'psess_remote', status: 'active' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    )
    const remote = new WooCommercePersistenceProvider({
      restUrl: 'https://loja.example/wp-json/eko-print/v1',
      token: 'secret',
      fetchImpl,
    })
    const record: PersonalizationSessionRecord = {
      id: 'psess_remote',
      status: 'active',
      product,
      documentId: 'doc_x',
      masterId: SAMPLE_MASTER_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await remote.saveSession(record)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://loja.example/wp-json/eko-print/v1/sessions/psess_remote',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'X-Eko-Persistence-Token': 'secret',
        }),
      }),
    )
  })
})
