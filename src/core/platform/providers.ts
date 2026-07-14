import type { EkoDocument } from '@/types/document'

/**
 * Platform provider contracts — interfaces only in this phase.
 * Concrete WooCommerce / Shopify / local implementations never live in Core.
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

export interface ExportProvider {
  exportDocument(
    document: EkoDocument,
    options: { format: 'json' | 'png' | 'pdf' | 'svg'; quality?: number },
  ): Promise<{ mimeType: string; data: ArrayBuffer | string }>
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
 * Persistence façade — save / load / autosave / versioning / local / remote / cloud.
 * No concrete backends in this phase.
 */
export type PersistenceBackendKind = 'local' | 'remote' | 'cloud'

export interface PersistenceVersion {
  id: string
  documentId: string
  createdAt: string
  label?: string
}

export interface PersistenceProvider {
  save(document: EkoDocument): Promise<EkoDocument>
  load(id: string): Promise<EkoDocument>
  autosave?(document: EkoDocument): Promise<void>
  listVersions?(documentId: string): Promise<PersistenceVersion[]>
  restoreVersion?(documentId: string, versionId: string): Promise<EkoDocument>
  backend?: PersistenceBackendKind
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
  persistence?: PersistenceProvider
}
