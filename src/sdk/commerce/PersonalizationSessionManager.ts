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
import type {
  ExportProvider,
  PersistenceProvider,
  SessionPersistenceProvider,
} from '@/core/platform/providers'
import { isSessionPersistenceProvider } from '@/core/platform/providers'
import { eventBus, platformEvents } from '@/core/events/EventBus'
import { exportDocument } from '@/core/document/serializeDocument'
import { useEditorStore } from '@/store/editorStore'
import { historyEngine } from '@/core/history/HistoryEngine'
import { createId } from '@/utils/id'
import { BridgedSessionPersistenceProvider } from '@/providers/BridgedSessionPersistenceProvider'
import { InMemorySessionPersistenceProvider } from '@/providers/InMemorySessionPersistenceProvider'
import { DomainExportProvider } from '@/providers/export/DomainExportProvider'
import {
  applyLifecycle,
  toCustomizationView,
  touchCurrentRevision,
} from '@/sdk/commerce/CustomizationLifecycle'
import { ensureCustomizationFields } from '@/types/customization'
import { withCommerceBootStage } from '@/providers/commerce/commerceBootStage'

/**
 * @deprecated Prefer SessionPersistenceProvider.saveSession / loadSession.
 * Kept for tests and gradual migration via BridgedSessionPersistenceProvider.
 */
export interface PersonalizationSessionStore {
  save(record: PersonalizationSessionRecord): Promise<PersonalizationSessionRecord>
  load(sessionId: string): Promise<PersonalizationSessionRecord | null>
  remove?(sessionId: string): Promise<void>
  list?(productId?: string): Promise<PersonalizationSessionRecord[]>
}

export interface PersonalizationSessionManagerOptions {
  documentProvider: DocumentProvider
  /**
   * Preferred: SessionPersistenceProvider (Local / Woo / Composite / Cloud).
   * Document-only PersistenceProvider is accepted when `sessionStore` is also provided.
   */
  persistence?: PersistenceProvider | SessionPersistenceProvider
  /** Session preview generation — Domain / Raster / Composite. Defaults to Domain. */
  export?: ExportProvider
  /** @deprecated Use a SessionPersistenceProvider instead. */
  sessionStore?: PersonalizationSessionStore
}

/**
 * Personalization / Customization lifecycle — SDK-facing commerce engine.
 * Speaks only DocumentProvider + SessionPersistenceProvider + ExportProvider —
 * never concrete Local/Woo/Raster classes.
 *
 * Business entity: Customization (`customizationId`, `lifecycle`).
 * `sessionId` remains the persistence key and equals customizationId in v1.
 */
export class PersonalizationSessionManager {
  private record: PersonalizationSessionRecord | null = null
  private autosaveTimer: ReturnType<typeof setInterval> | null = null
  private readonly documentProvider: DocumentProvider
  private readonly persistence: SessionPersistenceProvider
  private readonly exporter: ExportProvider

  constructor(options: PersonalizationSessionManagerOptions) {
    this.documentProvider = options.documentProvider
    this.persistence = resolveSessionPersistence(options)
    this.exporter = options.export ?? new DomainExportProvider()
  }

  getRecord(): PersonalizationSessionRecord | null {
    return this.record ? structuredClone(this.record) : null
  }

  /** Business view of the active customization (session migrated if needed). */
  getCustomization() {
    return this.record ? toCustomizationView(this.record) : null
  }

  /** Start a new session / customization from a product-linked template master. */
  async start(
    product: CommerceProductContext,
    embedMode: PersonalizationSessionRecord['embedMode'] = 'page',
  ): Promise<PersonalizationSessionRecord> {
    this.clearAutosave()
    const now = new Date().toISOString()
    const document = await withCommerceBootStage('createSession', () =>
      this.documentProvider.createSession(product.templateId),
    )
    this.hydrateEditor(document)

    const id = createId('psess')
    let record: PersonalizationSessionRecord = ensureCustomizationFields({
      id,
      customizationId: id,
      status: 'starting',
      lifecycle: 'created',
      product: { ...product, quantity: product.quantity ?? 1 },
      documentId: document.id,
      masterId: product.templateId,
      createdAt: now,
      updatedAt: now,
      schemaVersion: document.schemaVersion,
      embedMode,
      revisions: [],
    })
    record = applyLifecycle(record, 'editing', now)
    record = touchCurrentRevision(record, 'initial')

    // Persist session + document through the provider (server may echo a stable id).
    record = await this.persistence.saveSession(record, document)
    this.record = ensureCustomizationFields(record)
    eventBus.emit(platformEvents.SessionStarted, {
      sessionId: this.record.id,
      customizationId: this.record.customizationId,
      documentId: this.record.documentId,
      lifecycle: this.record.lifecycle,
    })
    return structuredClone(this.record)
  }

  /**
   * Resume an existing customization / session.
   * Accepts either customizationId or sessionId (same value when migrated).
   */
  async resume(sessionId: string): Promise<PersonalizationSessionRecord> {
    this.clearAutosave()
    const persisted = await this.persistence.loadSession(sessionId)
    if (!persisted?.record) throw new Error(`Personalization session not found: ${sessionId}`)
    const existing = ensureCustomizationFields(persisted.record)
    if (existing.status === 'cancelled' || existing.lifecycle === 'cancelled') {
      throw new Error(`Cannot resume cancelled session: ${sessionId}`)
    }

    const document =
      persisted.document ??
      (await this.persistence.load(existing.documentId).catch(() => null)) ??
      (await this.documentProvider.getDocument(existing.documentId))

    this.hydrateEditor(document)
    // Re-open for edit from saved / finalized / cart_attached without duplicating.
    let next = applyLifecycle(existing, 'editing')
    next = await this.persistence.saveSession(next, document)
    this.record = ensureCustomizationFields(next)
    eventBus.emit(platformEvents.SessionResumed, {
      sessionId: this.record.id,
      customizationId: this.record.customizationId,
      documentId: document.id,
      lifecycle: this.record.lifecycle,
    })
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
    if (
      !this.record ||
      this.record.status === 'cancelled' ||
      this.record.lifecycle === 'cancelled' ||
      this.record.lifecycle === 'ordered'
    ) {
      return null
    }
    // Re-enter editing from saved/finalized/cart_attached before mutating.
    const life = this.record.lifecycle
    if (life === 'saved' || life === 'finalized' || life === 'cart_attached') {
      this.record = applyLifecycle(this.record, 'editing')
    }
    this.setStatus('autosaving')
    const document = this.requireEditorDocument()
    const preview = await this.exporter.createSessionPreview(document)
    const now = new Date().toISOString()
    this.record = {
      ...ensureCustomizationFields(this.record),
      status: 'active',
      lifecycle: 'editing',
      updatedAt: now,
      autosaveAt: now,
      schemaVersion: document.schemaVersion,
      preview,
    }
    this.record = await this.persistence.saveSession(this.record, document)
    eventBus.emit(platformEvents.SessionAutosaved, {
      sessionId: this.record.id,
      customizationId: this.record.customizationId,
      at: now,
    })
    return structuredClone(this.record)
  }

  async save(): Promise<{ record: PersonalizationSessionRecord; cart: CommerceCartPayload }> {
    if (!this.record) throw new Error('No active personalization session')
    if (this.record.status === 'cancelled' || this.record.lifecycle === 'cancelled') {
      throw new Error('Session cancelled')
    }

    const document = this.requireEditorDocument()
    const preview = await this.exporter.createSessionPreview(document)
    const now = new Date().toISOString()
    let next: PersonalizationSessionRecord = {
      ...ensureCustomizationFields(this.record),
      schemaVersion: document.schemaVersion,
      preview,
      updatedAt: now,
    }
    // From finalized/cart_attached (re-edit) go through editing → saved.
    if (next.lifecycle === 'finalized' || next.lifecycle === 'cart_attached') {
      next = applyLifecycle(next, 'editing', now)
    }
    if (next.lifecycle === 'created') {
      next = applyLifecycle(next, 'editing', now)
    }
    next = applyLifecycle(next, 'saved', now)
    next = touchCurrentRevision(next, 'saved')
    this.record = await this.persistence.saveSession(next, document)
    const cart = this.buildCartPayload(document, preview, now)
    eventBus.emit(platformEvents.SessionSaved, {
      sessionId: this.record.id,
      customizationId: this.record.customizationId,
      lifecycle: this.record.lifecycle,
    })
    eventBus.emit(platformEvents.CartPayloadReady, cart)
    return { record: structuredClone(this.record), cart }
  }

  async finalize(): Promise<{ record: PersonalizationSessionRecord; cart: CommerceCartPayload }> {
    const { record } = await this.save()
    this.clearAutosave()
    const now = new Date().toISOString()
    let next = applyLifecycle(record, 'finalized', now)
    next = touchCurrentRevision(next, 'finalized')
    this.record = await this.persistence.saveSession(next)
    const document = this.requireEditorDocument()
    const cart = this.buildCartPayload(
      document,
      this.record.preview ?? (await this.exporter.createSessionPreview(document)),
      now,
    )
    eventBus.emit(platformEvents.SessionFinalized, {
      sessionId: this.record.id,
      customizationId: this.record.customizationId,
      lifecycle: this.record.lifecycle,
      cart,
    })
    return { record: structuredClone(this.record), cart }
  }

  /** Host notifies that the customization is on a cart line. */
  async markCartAttached(): Promise<PersonalizationSessionRecord> {
    if (!this.record) throw new Error('No active personalization session')
    const next = applyLifecycle(ensureCustomizationFields(this.record), 'cart_attached')
    this.record = await this.persistence.saveSession(next)
    return structuredClone(this.record)
  }

  /** Host notifies checkout completed for this customization. */
  async markOrdered(): Promise<PersonalizationSessionRecord> {
    if (!this.record) throw new Error('No active personalization session')
    const next = applyLifecycle(ensureCustomizationFields(this.record), 'ordered')
    this.record = await this.persistence.saveSession(next)
    return structuredClone(this.record)
  }

  async cancel(): Promise<PersonalizationSessionRecord> {
    if (!this.record) throw new Error('No active personalization session')
    this.clearAutosave()
    const next = applyLifecycle(ensureCustomizationFields(this.record), 'cancelled')
    this.record = await this.persistence.saveSession(next)
    eventBus.emit(platformEvents.SessionCancelled, {
      sessionId: this.record.id,
      customizationId: this.record.customizationId,
      lifecycle: this.record.lifecycle,
    })
    return structuredClone(this.record)
  }

  async generatePreview(): Promise<ProductionPreviewRef> {
    const document = this.requireEditorDocument()
    const preview = await this.exporter.createSessionPreview(document)
    if (this.record) {
      this.record = { ...this.record, preview, updatedAt: new Date().toISOString() }
      this.record = await this.persistence.saveSession(this.record, document)
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
    const record = ensureCustomizationFields(this.record)
    return {
      schema: 'eko.commerce.cart/1',
      sessionId: record.id,
      customizationId: record.customizationId || record.id,
      lifecycleStatus: record.lifecycle ?? 'finalized',
      documentId: document.id,
      masterId: record.masterId,
      product: record.product,
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

function resolveSessionPersistence(
  options: PersonalizationSessionManagerOptions,
): SessionPersistenceProvider {
  if (isSessionPersistenceProvider(options.persistence)) {
    return options.persistence
  }
  if (options.persistence && options.sessionStore) {
    return new BridgedSessionPersistenceProvider(options.persistence, options.sessionStore)
  }
  if (options.sessionStore) {
    return new BridgedSessionPersistenceProvider(
      new InMemorySessionPersistenceProvider(),
      options.sessionStore,
    )
  }
  if (options.persistence) {
    return new BridgedSessionPersistenceProvider(options.persistence, new InMemorySessionStore())
  }
  return new InMemorySessionPersistenceProvider()
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
