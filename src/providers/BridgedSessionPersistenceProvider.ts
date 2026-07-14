import type { EkoDocument } from '@/types/document'
import type { PersonalizationSessionRecord } from '@/types/commerce'
import type {
  PersistedPersonalizationSession,
  PersistenceProvider,
  SessionPersistenceProvider,
} from '@/core/platform/providers'
/** @deprecated Prefer SessionPersistenceProvider — kept for bridging legacy stores. */
export interface LegacyPersonalizationSessionStore {
  save(record: PersonalizationSessionRecord): Promise<PersonalizationSessionRecord>
  load(sessionId: string): Promise<PersonalizationSessionRecord | null>
  remove?(sessionId: string): Promise<void>
  list?(productId?: string): Promise<PersonalizationSessionRecord[]>
}

/**
 * Bridges legacy `PersonalizationSessionStore` + document `PersistenceProvider`
 * into a unified SessionPersistenceProvider (tests / gradual migration).
 */
export class BridgedSessionPersistenceProvider implements SessionPersistenceProvider {
  readonly id = 'bridged'
  readonly backend = 'local' as const
  private readonly documents: PersistenceProvider
  private readonly sessions: LegacyPersonalizationSessionStore

  constructor(documents: PersistenceProvider, sessions: LegacyPersonalizationSessionStore) {
    this.documents = documents
    this.sessions = sessions
  }

  save(document: EkoDocument): Promise<EkoDocument> {
    return this.documents.save(document)
  }

  load(id: string): Promise<EkoDocument> {
    return this.documents.load(id)
  }

  autosave(document: EkoDocument): Promise<void> {
    return this.documents.autosave?.(document) ?? this.documents.save(document).then(() => undefined)
  }

  listVersions(documentId: string) {
    return this.documents.listVersions?.(documentId) ?? Promise.resolve([])
  }

  restoreVersion(documentId: string, versionId: string) {
    return (
      this.documents.restoreVersion?.(documentId, versionId) ?? this.documents.load(documentId)
    )
  }

  async saveSession(
    record: PersonalizationSessionRecord,
    document?: EkoDocument,
  ): Promise<PersonalizationSessionRecord> {
    if (document) await this.save(document)
    return this.sessions.save(record)
  }

  async loadSession(sessionId: string): Promise<PersistedPersonalizationSession | null> {
    const record = await this.sessions.load(sessionId)
    if (!record) return null
    const document = await this.load(record.documentId).catch(() => undefined)
    return { record, document }
  }

  removeSession(sessionId: string): Promise<void> {
    return this.sessions.remove?.(sessionId) ?? Promise.resolve()
  }

  listSessions(productId?: string): Promise<PersonalizationSessionRecord[]> {
    return this.sessions.list?.(productId) ?? Promise.resolve([])
  }
}
