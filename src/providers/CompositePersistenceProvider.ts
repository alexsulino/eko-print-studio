import type { EkoDocument } from '@/types/document'
import type { PersonalizationSessionRecord } from '@/types/commerce'
import type {
  PersistedPersonalizationSession,
  PersistenceBackendKind,
  PersistenceVersion,
  SessionPersistenceProvider,
} from '@/core/platform/providers'

/**
 * Outcome of the last saveSession() on a composite commerce stack.
 * LOCAL_ONLY means fallback wrote the session but remote (Woo) did not —
 * never treated as commercial persistence success (saveSession still throws).
 */
export type SessionPersistOutcome = 'PERSISTED_REMOTE' | 'LOCAL_ONLY' | 'FAILED'

export interface CompositePersistenceProviderOptions {
  /** Primary (e.g. WooCommerce remote). */
  primary: SessionPersistenceProvider
  /** Fallback / offline (e.g. LocalPersistenceProvider). */
  fallback: SessionPersistenceProvider
  /**
   * When true (default), document/session writes always mirror to fallback after a successful primary save
   * so offline resume still works.
   */
  mirrorToFallback?: boolean
}

/**
 * Routes persistence through a primary provider with local/offline fallback.
 * PersonalizationSessionManager never sees which concrete backend succeeded.
 *
 * Session writes: local fallback remains for recovery, but a remote failure
 * is still thrown so commerce never treats LOCAL_ONLY as commercial success.
 */
export class CompositePersistenceProvider implements SessionPersistenceProvider {
  readonly id = 'composite'
  private readonly primary: SessionPersistenceProvider
  private readonly fallback: SessionPersistenceProvider
  private readonly mirrorToFallback: boolean
  private lastBackend: PersistenceBackendKind
  private lastSessionPersistOutcome: SessionPersistOutcome = 'FAILED'

  constructor(options: CompositePersistenceProviderOptions) {
    this.primary = options.primary
    this.fallback = options.fallback
    this.mirrorToFallback = options.mirrorToFallback ?? true
    this.lastBackend = options.primary.backend ?? 'remote'
  }

  get backend(): PersistenceBackendKind {
    return this.lastBackend
  }

  /** Which leaf handled the last successful document/session read or remote write. */
  get activeBackend(): PersistenceBackendKind {
    return this.lastBackend
  }

  /** Last commerce session write classification (remote vs local-only vs failed). */
  get sessionPersistOutcome(): SessionPersistOutcome {
    return this.lastSessionPersistOutcome
  }

  async save(document: EkoDocument): Promise<EkoDocument> {
    try {
      const saved = await this.primary.save(document)
      this.lastBackend = this.primary.backend ?? 'remote'
      if (this.mirrorToFallback) {
        await this.fallback.save(saved).catch(() => undefined)
      }
      return saved
    } catch {
      const saved = await this.fallback.save(document)
      this.lastBackend = this.fallback.backend ?? 'local'
      return saved
    }
  }

  async load(id: string): Promise<EkoDocument> {
    try {
      const doc = await this.primary.load(id)
      this.lastBackend = this.primary.backend ?? 'remote'
      return doc
    } catch {
      const doc = await this.fallback.load(id)
      this.lastBackend = this.fallback.backend ?? 'local'
      return doc
    }
  }

  async autosave(document: EkoDocument): Promise<void> {
    if (this.primary.autosave) {
      try {
        await this.primary.autosave(document)
        this.lastBackend = this.primary.backend ?? 'remote'
        if (this.mirrorToFallback) {
          await this.fallback.autosave?.(document).catch(() => undefined)
        }
        return
      } catch {
        /* fall through */
      }
    } else {
      try {
        await this.primary.save(document)
        this.lastBackend = this.primary.backend ?? 'remote'
        if (this.mirrorToFallback) {
          await this.fallback.save(document).catch(() => undefined)
        }
        return
      } catch {
        /* fall through */
      }
    }
    if (this.fallback.autosave) {
      await this.fallback.autosave(document)
    } else {
      await this.fallback.save(document)
    }
    this.lastBackend = this.fallback.backend ?? 'local'
  }

  async listVersions(documentId: string): Promise<PersistenceVersion[]> {
    if (this.primary.listVersions) {
      try {
        return await this.primary.listVersions(documentId)
      } catch {
        /* fall through */
      }
    }
    return this.fallback.listVersions?.(documentId) ?? []
  }

  async restoreVersion(documentId: string, versionId: string): Promise<EkoDocument> {
    if (this.primary.restoreVersion) {
      try {
        return await this.primary.restoreVersion(documentId, versionId)
      } catch {
        /* fall through */
      }
    }
    if (!this.fallback.restoreVersion) {
      return this.fallback.load(documentId)
    }
    return this.fallback.restoreVersion(documentId, versionId)
  }

  async saveSession(
    record: PersonalizationSessionRecord,
    document?: EkoDocument,
  ): Promise<PersonalizationSessionRecord> {
    try {
      const saved = await this.primary.saveSession(record, document)
      this.lastBackend = this.primary.backend ?? 'remote'
      this.lastSessionPersistOutcome = 'PERSISTED_REMOTE'
      if (this.mirrorToFallback) {
        await this.fallback.saveSession(saved, document).catch(() => undefined)
      }
      return saved
    } catch (err) {
      // Keep a local copy for UX/offline recovery — but never treat this as commercial success.
      try {
        await this.fallback.saveSession(record, document)
        this.lastBackend = this.fallback.backend ?? 'local'
        this.lastSessionPersistOutcome = 'LOCAL_ONLY'
      } catch {
        this.lastSessionPersistOutcome = 'FAILED'
      }
      throw err
    }
  }

  async loadSession(sessionId: string): Promise<PersistedPersonalizationSession | null> {
    try {
      const hit = await this.primary.loadSession(sessionId)
      if (hit) {
        this.lastBackend = this.primary.backend ?? 'remote'
        return hit
      }
    } catch {
      /* fall through — unchanged */
    }

    const hit = await this.fallback.loadSession(sessionId)
    if (hit) this.lastBackend = this.fallback.backend ?? 'local'
    return hit
  }

  async removeSession(sessionId: string): Promise<void> {
    try {
      await this.primary.removeSession?.(sessionId)
    } catch {
      /* ignore primary failures on delete */
    }
    await this.fallback.removeSession?.(sessionId)
  }

  async listSessions(productId?: string): Promise<PersonalizationSessionRecord[]> {
    try {
      const remote = await this.primary.listSessions?.(productId)
      if (remote) {
        this.lastBackend = this.primary.backend ?? 'remote'
        return remote
      }
    } catch {
      /* fall through */
    }
    this.lastBackend = this.fallback.backend ?? 'local'
    return this.fallback.listSessions?.(productId) ?? []
  }
}
