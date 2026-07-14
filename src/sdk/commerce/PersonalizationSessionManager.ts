import type { EkoDocument } from '@/types/document'
import type {
  CommerceCartPayload,
  CommerceOrderPayload,
  CommerceProductContext,
  PersonalizationSessionRecord,
  PersonalizationSessionStatus,
  ProductionPreviewRef,
} from '@/types/commerce'
import type { DocumentProvider } from '@/types/provider'
import type { PersistenceProvider } from '@/core/platform/providers'
import { eventBus, platformEvents } from '@/core/events/EventBus'
import { exportDocument } from '@/core/document/serializeDocument'
import { useEditorStore } from '@/store/editorStore'
import { historyEngine } from '@/core/history/HistoryEngine'
import { createId } from '@/utils/id'
import { buildProductionPreview } from '@/sdk/preview/ProductionPreview'

export interface PersonalizationSessionManagerOptions {
  documentProvider: DocumentProvider
  persistence?: PersistenceProvider
  /** Optional session record store (local/remote). */
  sessionStore?: PersonalizationSessionStore
}

export interface PersonalizationSessionStore {
  save(record: PersonalizationSessionRecord): Promise<PersonalizationSessionRecord>
  load(sessionId: string): Promise<PersonalizationSessionRecord | null>
  remove?(sessionId: string): Promise<void>
  list?(productId?: string): Promise<PersonalizationSessionRecord[]>
}

/**
 * Personalization session lifecycle — SDK-facing commerce engine.
 * Uses DocumentProvider / PersistenceProvider; never WooCommerce APIs.
 */
export class PersonalizationSessionManager {
  private record: PersonalizationSessionRecord | null = null
  private autosaveTimer: ReturnType<typeof setInterval> | null = null
  private readonly documentProvider: DocumentProvider
  private readonly persistence?: PersistenceProvider
  private readonly sessionStore: PersonalizationSessionStore

  constructor(options: PersonalizationSessionManagerOptions) {
    this.documentProvider = options.documentProvider
    this.persistence = options.persistence
    this.sessionStore = options.sessionStore ?? new InMemorySessionStore()
  }

  getRecord(): PersonalizationSessionRecord | null {
    return this.record ? structuredClone(this.record) : null
  }

  /** Start a new session from a product-linked template master. */
  async start(product: CommerceProductContext, embedMode: PersonalizationSessionRecord['embedMode'] = 'page'): Promise<PersonalizationSessionRecord> {
    this.clearAutosave()
    const now = new Date().toISOString()
    const document = await this.documentProvider.createSession(product.templateId)
    this.hydrateEditor(document)

    this.record = {
      id: createId('psess'),
      status: 'active',
      product: { ...product, quantity: product.quantity ?? 1 },
      documentId: document.id,
      masterId: product.templateId,
      createdAt: now,
      updatedAt: now,
      schemaVersion: document.schemaVersion,
      embedMode,
    }
    await this.sessionStore.save(this.record)
    await this.persistDocument(document)
    eventBus.emit(platformEvents.SessionStarted, { sessionId: this.record.id, documentId: document.id })
    return structuredClone(this.record)
  }

  /** Resume an existing personalization session. */
  async resume(sessionId: string): Promise<PersonalizationSessionRecord> {
    this.clearAutosave()
    const existing = await this.sessionStore.load(sessionId)
    if (!existing) throw new Error(`Personalization session not found: ${sessionId}`)
    if (existing.status === 'cancelled') {
      throw new Error(`Cannot resume cancelled session: ${sessionId}`)
    }

    const document =
      (await this.persistence?.load(existing.documentId).catch(() => null)) ??
      (await this.documentProvider.getDocument(existing.documentId))

    this.hydrateEditor(document)
    this.record = {
      ...existing,
      status: 'active',
      updatedAt: new Date().toISOString(),
    }
    await this.sessionStore.save(this.record)
    eventBus.emit(platformEvents.SessionResumed, { sessionId: this.record.id, documentId: document.id })
    return structuredClone(this.record)
  }

  enableAutosave(intervalMs = 15000): void {
    this.clearAutosave()
    if (intervalMs <= 0) return
    this.autosaveTimer = setInterval(() => {
      void this.autosave().catch(() => {
        /* autosave failures stay non-fatal */
      })
    }, intervalMs)
  }

  async autosave(): Promise<PersonalizationSessionRecord | null> {
    if (!this.record || this.record.status === 'cancelled' || this.record.status === 'finalized') {
      return null
    }
    this.setStatus('autosaving')
    const document = this.requireEditorDocument()
    await this.persistDocument(document)
    const preview = buildProductionPreview(document)
    const now = new Date().toISOString()
    this.record = {
      ...this.record,
      status: 'active',
      updatedAt: now,
      autosaveAt: now,
      schemaVersion: document.schemaVersion,
      preview,
    }
    await this.sessionStore.save(this.record)
    eventBus.emit(platformEvents.SessionAutosaved, { sessionId: this.record.id, at: now })
    return structuredClone(this.record)
  }

  async save(): Promise<{ record: PersonalizationSessionRecord; cart: CommerceCartPayload }> {
    if (!this.record) throw new Error('No active personalization session')
    if (this.record.status === 'cancelled') throw new Error('Session cancelled')

    const document = this.requireEditorDocument()
    await this.persistDocument(document)
    const preview = buildProductionPreview(document)
    const now = new Date().toISOString()
    this.record = {
      ...this.record,
      status: 'saved',
      updatedAt: now,
      schemaVersion: document.schemaVersion,
      preview,
    }
    await this.sessionStore.save(this.record)
    const cart = this.buildCartPayload(document, preview, now)
    eventBus.emit(platformEvents.SessionSaved, { sessionId: this.record.id })
    eventBus.emit(platformEvents.CartPayloadReady, cart)
    return { record: structuredClone(this.record), cart }
  }

  async finalize(): Promise<{ record: PersonalizationSessionRecord; cart: CommerceCartPayload }> {
    const { record, cart } = await this.save()
    this.clearAutosave()
    const now = new Date().toISOString()
    this.record = {
      ...record,
      status: 'finalized',
      finalizedAt: now,
      updatedAt: now,
    }
    await this.sessionStore.save(this.record)
    eventBus.emit(platformEvents.SessionFinalized, { sessionId: this.record.id, cart })
    return { record: structuredClone(this.record), cart }
  }

  async cancel(): Promise<PersonalizationSessionRecord> {
    if (!this.record) throw new Error('No active personalization session')
    this.clearAutosave()
    const now = new Date().toISOString()
    this.record = {
      ...this.record,
      status: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
    }
    await this.sessionStore.save(this.record)
    eventBus.emit(platformEvents.SessionCancelled, { sessionId: this.record.id })
    return structuredClone(this.record)
  }

  async generatePreview(): Promise<ProductionPreviewRef> {
    const document = this.requireEditorDocument()
    const preview = buildProductionPreview(document)
    if (this.record) {
      this.record = { ...this.record, preview, updatedAt: new Date().toISOString() }
      await this.sessionStore.save(this.record)
    }
    eventBus.emit(platformEvents.PreviewGenerated, preview)
    return preview
  }

  buildOrderPayload(orderId: string, cart: CommerceCartPayload, lineItemId?: string): CommerceOrderPayload {
    const payload: CommerceOrderPayload = {
      schema: 'eko.commerce.order/1',
      orderId,
      lineItemId,
      cart,
      allowAdminReedit: true,
    }
    eventBus.emit(platformEvents.OrderPayloadReady, payload)
    return payload
  }

  private setStatus(status: PersonalizationSessionStatus): void {
    if (!this.record) return
    this.record = { ...this.record, status, updatedAt: new Date().toISOString() }
  }

  private buildCartPayload(
    document: EkoDocument,
    preview: ProductionPreviewRef,
    savedAt: string,
  ): CommerceCartPayload {
    if (!this.record) throw new Error('No session')
    return {
      schema: 'eko.commerce.cart/1',
      sessionId: this.record.id,
      documentId: document.id,
      masterId: this.record.masterId,
      product: this.record.product,
      documentJson: exportDocument(document),
      preview,
      savedAt,
      summary: {
        documentName: document.metadata.name,
        elementCount: document.elements.length,
        pageCount: document.pages?.length ?? 1,
      },
    }
  }

  private async persistDocument(document: EkoDocument): Promise<EkoDocument> {
    if (this.persistence) {
      return this.persistence.save(document)
    }
    return this.documentProvider.saveDocument(document)
  }

  private hydrateEditor(document: EkoDocument): void {
    historyEngine.clear()
    const pageId = document.pages?.[0]?.id ?? null
    const surfaceId =
      document.surfaces?.find((s) => s.pageId === pageId)?.id ?? document.surfaces?.[0]?.id ?? null
    useEditorStore.setState({
      document: structuredClone(document),
      activePageId: pageId,
      activeSurfaceId: surfaceId,
      selectedIds: [],
      selectedId: null,
      isLoading: false,
      lastError: null,
    })
  }

  private requireEditorDocument(): EkoDocument {
    const doc = useEditorStore.getState().document
    if (!doc) throw new Error('No document open in editor')
    return doc
  }

  private clearAutosave(): void {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer)
      this.autosaveTimer = null
    }
  }

  destroy(): void {
    this.clearAutosave()
    this.record = null
  }
}

export class InMemorySessionStore implements PersonalizationSessionStore {
  private records = new Map<string, PersonalizationSessionRecord>()

  async save(record: PersonalizationSessionRecord): Promise<PersonalizationSessionRecord> {
    const clone = structuredClone(record)
    this.records.set(clone.id, clone)
    return structuredClone(clone)
  }

  async load(sessionId: string): Promise<PersonalizationSessionRecord | null> {
    const hit = this.records.get(sessionId)
    return hit ? structuredClone(hit) : null
  }

  async remove(sessionId: string): Promise<void> {
    this.records.delete(sessionId)
  }

  async list(productId?: string): Promise<PersonalizationSessionRecord[]> {
    const all = [...this.records.values()]
    return structuredClone(
      productId ? all.filter((r) => r.product.productId === productId) : all,
    )
  }
}
