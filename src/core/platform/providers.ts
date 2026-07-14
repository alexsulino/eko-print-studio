import type { EkoDocument } from '@/types/document'
import type {
  CommerceCartPayload,
  CommerceEmbedMode,
  CommerceOrderPayload,
  CommerceProductContext,
  PersonalizationSessionRecord,
  ProductionPreviewRef,
} from '@/types/commerce'

/**
 * Platform provider contracts — interfaces only.
 * Concrete Local / WooCommerce / Cloud implementations never live in Core.
 */

export interface StorageProvider {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  list?(prefix?: string): Promise<string[]>
}

export interface AssetProvider {
  resolveUrl(assetId: string): Promise<string | null>
  list?(query?: string): Promise<Array<{ id: string; name: string; url: string }>>
}

export interface FontProvider {
  ensureFont(family: string, weights?: number[]): Promise<void>
  listFamilies(): Promise<string[]>
}

export interface UploadProvider {
  upload(file: { name: string; mimeType: string; data: ArrayBuffer }): Promise<{ id: string; url: string }>
}

/**
 * Export façade — domain / raster / future PDF / print.
 * Homogeneous with Template Registry / PersistenceProvider: Core owns interfaces only.
 *
 * ExportProvider
 *        │
 * ┌──────┴──────────┬─────────────────┬──────────────────┐
 * Domain            Raster              FuturePdf          FuturePrint
 */
export type ExportFormat = 'json' | 'png' | 'pdf' | 'svg'

export interface ExportResult {
  mimeType: string
  data: ArrayBuffer | string
  format: ExportFormat
}

export interface ExportProvider {
  /** Provider identity (e.g. `domain`, `raster`, `composite`). */
  readonly id?: string
  readonly formats: readonly ExportFormat[]
  exportDocument(
    document: EkoDocument,
    options: { format: ExportFormat; quality?: number },
  ): Promise<ExportResult>
  /**
   * Official session preview for commerce persistence.
   * Composite prefers raster (`preview.png`); Domain remains the fallback / standalone default.
   */
  createSessionPreview(document: EkoDocument): Promise<ProductionPreviewRef>
}

export function isExportProvider(provider: unknown): provider is ExportProvider {
  const p = provider as ExportProvider | null | undefined
  return Boolean(
    p &&
      typeof p.exportDocument === 'function' &&
      typeof p.createSessionPreview === 'function' &&
      Array.isArray(p.formats),
  )
}

export interface ClipboardProvider {
  writeText(text: string): Promise<void>
  readText(): Promise<string | null>
  writeBinary?(mimeType: string, data: ArrayBuffer): Promise<void>
  readBinary?(mimeType: string): Promise<ArrayBuffer | null>
}

export interface LocalizationProvider {
  t(key: string, params?: Record<string, string | number>): string
  locale(): string
  setLocale?(locale: string): void
}

export interface ThemeProvider {
  getTheme(): Record<string, string>
  setTheme?(partial: Record<string, string>): void
}

export interface ConfigurationProvider {
  get<T = unknown>(key: string, fallback?: T): T
  set?(key: string, value: unknown): void
}

/**
 * Persistence façade — documents (+ optional commerce sessions).
 * Homogeneous with Template Registry / ExportProvider: Core owns interfaces only.
 *
 * PersistenceProvider
 *        │
 * ┌──────┴────────┬─────────────────────────┐
 * Local           WooCommerce                 FutureCloud
 */
export type PersistenceBackendKind = 'local' | 'remote' | 'cloud'

export interface PersistenceVersion {
  id: string
  documentId: string
  createdAt: string
  label?: string
}

export interface PersistenceProvider {
  /** Provider identity for diagnostics / swaps (e.g. `local`, `woocommerce`). */
  readonly id?: string
  readonly backend?: PersistenceBackendKind
  save(document: EkoDocument): Promise<EkoDocument>
  load(id: string): Promise<EkoDocument>
  autosave?(document: EkoDocument): Promise<void>
  listVersions?(documentId: string): Promise<PersistenceVersion[]>
  restoreVersion?(documentId: string, versionId: string): Promise<EkoDocument>
}

/** Loaded personalization session (+ optional document payload). */
export interface PersistedPersonalizationSession {
  record: PersonalizationSessionRecord
  document?: EkoDocument
}

/**
 * Commerce-capable persistence — sessions + documents.
 * PersonalizationSessionManager talks only to this interface.
 */
export interface SessionPersistenceProvider extends PersistenceProvider {
  saveSession(
    record: PersonalizationSessionRecord,
    document?: EkoDocument,
  ): Promise<PersonalizationSessionRecord>
  loadSession(sessionId: string): Promise<PersistedPersonalizationSession | null>
  removeSession?(sessionId: string): Promise<void>
  listSessions?(productId?: string): Promise<PersonalizationSessionRecord[]>
}

export function isSessionPersistenceProvider(
  provider: PersistenceProvider | undefined | null,
): provider is SessionPersistenceProvider {
  return Boolean(
    provider &&
      typeof (provider as SessionPersistenceProvider).saveSession === 'function' &&
      typeof (provider as SessionPersistenceProvider).loadSession === 'function',
  )
}

/**
 * Storefront commerce façade — open / finalize / cart / host transport.
 * Homogeneous with Template / Persistence / Export: Core owns interfaces only.
 *
 * CommerceProvider
 *        │
 * ┌──────┴────────────┬─────────────┬──────────────┐
 * WooCommerce         Shopify       Magento        Nuvemshop / …
 */
export type CommercePlatformId =
  | 'woocommerce'
  | 'shopify'
  | 'magento'
  | 'nuvemshop'
  | (string & {})

export interface CommerceBootContext {
  /** Product / session query context from the host embed URL. */
  product?: CommerceProductContext
  sessionId?: string
  customizationId?: string
  embedMode?: CommerceEmbedMode
  autosaveMs?: number
  /** Remote session persistence credentials (host-issued). */
  restUrl?: string
  persistenceToken?: string
  hostOrigin?: string
  /** Opaque platform extras (variation attrs, locale, …). */
  hostMeta?: Record<string, unknown>
}

export interface CommerceStartOptions {
  product: CommerceProductContext
  embedMode?: CommerceEmbedMode
  sessionId?: string
  customizationId?: string
  autosaveMs?: number
  /** When embedding in iframe, peer window receiving host events. */
  hostWindow?: Window
  targetOrigin?: string
}

export interface CommerceProvider {
  /** Provider identity (e.g. `woocommerce`, `shopify`). */
  readonly id: CommercePlatformId
  readonly platform: CommercePlatformId

  /**
   * Wire persistence / export / auth for this storefront embed.
   * Called before `start` during URL boot.
   */
  prepare?(context: CommerceBootContext): Promise<void> | void

  /** Start or resume a customization in the editor. */
  start(options: CommerceStartOptions): Promise<PersonalizationSessionRecord>

  /** Resume by session / customization id. */
  reopen(sessionId: string, product?: CommerceProductContext): Promise<PersonalizationSessionRecord>

  /** Admin recovery from a stored order payload. */
  reopenFromOrder?(order: CommerceOrderPayload): Promise<PersonalizationSessionRecord>

  save(): Promise<CommerceCartPayload>
  /** Finalize + notify host to add / update cart line. */
  finalize(): Promise<CommerceCartPayload>
  cancel(): Promise<PersonalizationSessionRecord>

  /** Explicit cart handoff (same transport as finalize uses). */
  addToCart?(cart?: CommerceCartPayload): Promise<void>
  /** Re-publish cart for an existing line (edit personalization). */
  updateCartItem?(cart?: CommerceCartPayload): Promise<CommerceCartPayload>

  attachToOrder?(
    orderId: string,
    lineItemId?: string,
    cart?: CommerceCartPayload,
  ): CommerceOrderPayload

  preview(): Promise<ProductionPreviewRef>
  getSession(): PersonalizationSessionRecord | null
  getLastCart(): CommerceCartPayload | null

  onCartReady?(handler: (cart: CommerceCartPayload) => void): () => void
  notifyHostClose(): void
  destroy(): void
}

export function isCommerceProvider(provider: unknown): provider is CommerceProvider {
  const p = provider as CommerceProvider | null | undefined
  return Boolean(
    p &&
      typeof p.start === 'function' &&
      typeof p.finalize === 'function' &&
      typeof p.reopen === 'function' &&
      typeof p.notifyHostClose === 'function' &&
      typeof p.platform === 'string',
  )
}

/** Bundle of optional providers injected by hosts / SDK. */
export interface PlatformProviders {
  storage?: StorageProvider
  assets?: AssetProvider
  fonts?: FontProvider
  upload?: UploadProvider
  export?: ExportProvider
  clipboard?: ClipboardProvider
  i18n?: LocalizationProvider
  theme?: ThemeProvider
  config?: ConfigurationProvider
  /** Prefer SessionPersistenceProvider for commerce embeds. */
  persistence?: PersistenceProvider | SessionPersistenceProvider
  /** Storefront commerce orchestration (Woo / Shopify / …). */
  commerce?: CommerceProvider
}
