import type { EkoDocument } from '@/types/document'
import type {
  CommerceCartPayload,
  CommerceEmbedMode,
  CommerceOpenEditorOptions,
  CommerceOrderPayload,
  PersonalizationSessionRecord,
  ProductionPreviewRef,
} from '@/types/commerce'
import { eventBus, platformEvents } from '@/core/events/EventBus'
import type { PlatformEventName } from '@/core/events/EventBus'
import { objectRegistry } from '@/core/registry/ObjectRegistry'
import type { ElementDefinition } from '@/core/registry/ObjectRegistry'
import { rendererRegistry } from '@/core/render/RendererRegistry'
import type { ObjectRenderer } from '@/core/render/RendererRegistry'
import { overlaySystem } from '@/core/render/OverlaySystem'
import type { OverlayContributor } from '@/core/render/OverlaySystem'
import { renderPipeline } from '@/core/render/RenderPipeline'
import type { RenderPass } from '@/core/render/passes/RenderPass'
import { PluginRegistry } from '@/core/plugins/PluginRegistry'
import type { EditorPlugin } from '@/core/plugins/PluginRegistry'
import { createHostBridge } from '@/core/host/HostBridge'
import type { HostBridge } from '@/core/host/HostBridge'
import type {
  CommerceProvider,
  ExportProvider,
  PlatformProviders,
  SessionPersistenceProvider,
} from '@/core/platform/providers'
import { isCommerceProvider, isExportProvider } from '@/core/platform/providers'
import type { DocumentProvider } from '@/types/provider'
import { exportDocument as serializeExport, importDocument } from '@/core/document/serializeDocument'
import { editorSession, type EditorSessionApi } from '@/sdk/session/EditorSession'
import { useEditorStore } from '@/store/editorStore'
import {
  PersonalizationSessionManager,
  type PersonalizationSessionStore,
} from '@/sdk/commerce/PersonalizationSessionManager'

export interface EkoPrintStudioOptions {
  documentProvider?: DocumentProvider
  providers?: PlatformProviders
  host?: HostBridge
  /** @deprecated Prefer `providers.persistence` as SessionPersistenceProvider. */
  sessionStore?: PersonalizationSessionStore
}

export type EditorRegisterTarget =
  | { kind: 'plugin'; plugin: EditorPlugin }
  | { kind: 'object'; definition: ElementDefinition }
  | { kind: 'renderer'; renderer: ObjectRenderer }
  | { kind: 'overlay'; contributor: OverlayContributor }
  | { kind: 'pass'; pass: RenderPass }

/**
 * Public SDK façade — embeddable hosts and CommerceProvider implementations.
 * The SDK never imports a concrete storefront (Woo / Shopify / …).
 */
export class EkoPrintStudio {
  private document: EkoDocument | null = null
  private providers: PlatformProviders
  private readonly documentProvider?: DocumentProvider
  private readonly host: HostBridge
  private readonly plugins: PluginRegistry
  private sessionManager: PersonalizationSessionManager | null = null
  private readonly sessionStore?: PersonalizationSessionStore
  private destroyed = false

  constructor(options: EkoPrintStudioOptions = {}) {
    this.providers = options.providers ?? {}
    this.documentProvider = options.documentProvider
    this.host = options.host ?? createHostBridge()
    this.sessionStore = options.sessionStore
    this.plugins = new PluginRegistry({
      registerObject: (definition) => objectRegistry.register(definition),
      registerRenderer: (renderer) => rendererRegistry.register(renderer),
      registerOverlay: (contributor) => overlaySystem.register(contributor),
      registerPass: (pass) => renderPipeline.registerPass(pass),
    })
    if (options.providers?.commerce && isCommerceProvider(options.providers.commerce)) {
      this.providers = { ...this.providers, commerce: options.providers.commerce }
    }
  }

  /**
   * Swap persistence (e.g. commerce boot → remote + Local composite).
   * Resets the session manager so the next personalization uses the new provider.
   */
  configurePersistence(persistence: SessionPersistenceProvider | PlatformProviders['persistence']): void {
    this.assertAlive()
    this.providers = { ...this.providers, persistence }
    this.resetSessionManager()
  }

  /**
   * Swap export stack (e.g. commerce → Domain + Raster composite).
   * Resets the session manager so save/finalize use the new preview pipeline.
   */
  configureExport(exporter: ExportProvider): void {
    this.assertAlive()
    if (!isExportProvider(exporter)) {
      throw new Error('EkoPrintStudio.configureExport: invalid ExportProvider')
    }
    this.providers = { ...this.providers, export: exporter }
    this.resetSessionManager()
  }

  /**
   * Attach the active CommerceProvider (WooCommerce / Shopify / … implementation).
   * App and hosts orchestrate through this — never through a concrete store class.
   */
  configureCommerce(commerce: CommerceProvider): void {
    this.assertAlive()
    if (!isCommerceProvider(commerce)) {
      throw new Error('EkoPrintStudio.configureCommerce: invalid CommerceProvider')
    }
    this.providers = { ...this.providers, commerce }
  }

  getCommerce(): CommerceProvider | null {
    return this.providers.commerce ?? null
  }

  private resetSessionManager(): void {
    if (this.sessionManager) {
      this.sessionManager.destroy()
      this.sessionManager = null
    }
  }

  private ensureCommerce(): PersonalizationSessionManager {
    if (this.sessionManager) return this.sessionManager
    if (!this.documentProvider) {
      throw new Error('EkoPrintStudio: DocumentProvider required for personalization sessions')
    }
    this.sessionManager = new PersonalizationSessionManager({
      documentProvider: this.documentProvider,
      persistence: this.providers.persistence,
      export: isExportProvider(this.providers.export) ? this.providers.export : undefined,
      sessionStore: this.sessionStore,
    })
    return this.sessionManager
  }

  async load(id: string): Promise<EkoDocument> {
    this.assertAlive()
    const doc =
      (await this.documentProvider?.getDocument(id)) ??
      (await this.providers.persistence?.load(id))
    if (!doc) {
      throw new Error('EkoPrintStudio.load: no DocumentProvider or PersistenceProvider configured')
    }
    this.document = doc
    eventBus.emit(platformEvents.DocumentOpened, { documentId: doc.id })
    return doc
  }

  open(document: EkoDocument): EkoDocument {
    this.assertAlive()
    this.document = document
    eventBus.emit(platformEvents.DocumentOpened, { documentId: document.id })
    return document
  }

  async save(): Promise<EkoDocument> {
    this.assertAlive()
    const current = this.getDocument()
    if (!current) throw new Error('EkoPrintStudio.save: no document open')
    const saved =
      (await this.documentProvider?.saveDocument(current)) ??
      (await this.providers.persistence?.save(current))
    if (!saved) {
      throw new Error('EkoPrintStudio.save: no DocumentProvider or PersistenceProvider configured')
    }
    this.document = saved
    eventBus.emit(platformEvents.DocumentSaved, { documentId: saved.id })
    return saved
  }

  async export(format: 'json' | 'png' | 'pdf' | 'svg' = 'json'): Promise<{
    mimeType: string
    data: ArrayBuffer | string
  }> {
    this.assertAlive()
    const current = this.getDocument()
    if (!current) throw new Error('EkoPrintStudio.export: no document open')
    if (isExportProvider(this.providers.export)) {
      const result = await this.providers.export.exportDocument(current, { format })
      return { mimeType: result.mimeType, data: result.data }
    }
    if (format !== 'json') {
      throw new Error(`EkoPrintStudio.export: format "${format}" requires ExportProvider`)
    }
    return { mimeType: 'application/json', data: serializeExport(current) }
  }

  on(event: PlatformEventName | string, handler: (payload: unknown) => void): () => void {
    this.assertAlive()
    return eventBus.on(event, handler)
  }

  off(event: PlatformEventName | string, handler: (payload: unknown) => void): void {
    eventBus.off(event, handler)
  }

  register(target: EditorRegisterTarget): void {
    this.assertAlive()
    switch (target.kind) {
      case 'plugin':
        this.plugins.register(target.plugin)
        break
      case 'object':
        objectRegistry.register(target.definition)
        break
      case 'renderer':
        rendererRegistry.register(target.renderer)
        break
      case 'overlay':
        overlaySystem.register(target.contributor)
        break
      case 'pass':
        renderPipeline.registerPass(target.pass)
        break
    }
  }

  getDocument(): EkoDocument | null {
    return useEditorStore.getState().document ?? this.document
  }

  session(): EditorSessionApi {
    this.assertAlive()
    return editorSession
  }

  async bootstrap(masterId?: string): Promise<void> {
    this.assertAlive()
    await editorSession.bootstrap(masterId)
    this.document = useEditorStore.getState().document
  }

  async openPersonalization(options: CommerceOpenEditorOptions): Promise<PersonalizationSessionRecord> {
    this.assertAlive()
    const manager = this.ensureCommerce()
    const record = options.sessionId
      ? await manager.resume(options.sessionId)
      : await manager.start(options.product, options.embedMode ?? 'page')
    this.document = this.getDocument()
    if (options.autosaveMs !== 0) {
      manager.enableAutosave(options.autosaveMs ?? 15000)
    }
    this.host.callbacks.emit('personalization:opened', {
      sessionId: record.id,
      embedMode: options.embedMode ?? 'page',
    })
    return record
  }

  async savePersonalization(): Promise<{ record: PersonalizationSessionRecord; cart: CommerceCartPayload }> {
    this.assertAlive()
    const result = await this.ensureCommerce().save()
    this.document = this.getDocument()
    return result
  }

  async finalizePersonalization(): Promise<{
    record: PersonalizationSessionRecord
    cart: CommerceCartPayload
  }> {
    this.assertAlive()
    const result = await this.ensureCommerce().finalize()
    this.document = this.getDocument()
    this.host.callbacks.emit('personalization:finalized', result.cart)
    return result
  }

  async cancelPersonalization(): Promise<PersonalizationSessionRecord> {
    this.assertAlive()
    const record = await this.ensureCommerce().cancel()
    this.host.callbacks.emit('personalization:cancelled', { sessionId: record.id })
    return record
  }

  async resumePersonalization(sessionId: string): Promise<PersonalizationSessionRecord> {
    return this.openPersonalization({
      sessionId,
      product: { productId: '', templateId: '' },
      autosaveMs: 15000,
    })
  }

  getPersonalizationSession(): PersonalizationSessionRecord | null {
    return this.sessionManager?.getRecord() ?? null
  }

  async generateProductionPreview(): Promise<ProductionPreviewRef> {
    this.assertAlive()
    return this.ensureCommerce().generatePreview()
  }

  buildOrderPayload(
    orderId: string,
    cart: CommerceCartPayload,
    lineItemId?: string,
  ): CommerceOrderPayload {
    this.assertAlive()
    return this.ensureCommerce().buildOrderPayload(orderId, cart, lineItemId)
  }

  requestEmbed(mode: CommerceEmbedMode, payload?: Record<string, unknown>): void {
    this.assertAlive()
    this.host.bus.publish({
      kind: 'event',
      channel: 'eko.commerce',
      type: 'embed.request',
      payload: { mode, ...payload },
    })
  }

  getHost(): HostBridge {
    return this.host
  }

  getPlugins(): PluginRegistry {
    return this.plugins
  }

  getProviders(): PlatformProviders {
    return this.providers
  }

  importJson(raw: string): EkoDocument {
    this.assertAlive()
    const doc = importDocument(raw)
    this.document = doc
    eventBus.emit(platformEvents.DocumentOpened, { documentId: doc.id })
    return doc
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.sessionManager?.destroy()
    this.sessionManager = null
    // Do not destroy CommerceProvider here — host owns its lifecycle / may share editor.
    this.providers = { ...this.providers, commerce: undefined }
    for (const plugin of this.plugins.list()) {
      this.plugins.unregister(plugin.id)
    }
    this.document = null
  }

  private assertAlive(): void {
    if (this.destroyed) {
      throw new Error('EkoPrintStudio: instance destroyed')
    }
  }
}

export { platformEvents }
