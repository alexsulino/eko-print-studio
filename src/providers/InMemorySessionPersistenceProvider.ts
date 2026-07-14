import type { EkoDocument } from '@/types/document'
import type { PersonalizationSessionRecord } from '@/types/commerce'
import type {
  PersistedPersonalizationSession,
  SessionPersistenceProvider,
} from '@/core/platform/providers'

/**
 * Pure in-memory SessionPersistenceProvider — default for unit tests / ephemeral embeds.
 * No localStorage.
 */
export class InMemorySessionPersistenceProvider implements SessionPersistenceProvider {
  readonly id = 'memory'
  readonly backend = 'local' as const
  private documents = new Map<string, EkoDocument>()
  private sessions = new Map<string, PersonalizationSessionRecord>()

  async save(document: EkoDocument): Promise<EkoDocument> {
    const clone = structuredClone(document)
    this.documents.set(clone.id, clone)
    return structuredClone(clone)
  }

  async load(id: string): Promise<EkoDocument> {
    const doc = this.documents.get(id)
    if (!doc) throw new Error(`Document not found in persistence: ${id}`)
    return structuredClone(doc)
  }

  async autosave(document: EkoDocument): Promise<void> {
    await this.save(document)
  }

  async saveSession(
    record: PersonalizationSessionRecord,
    document?: EkoDocument,
  ): Promise<PersonalizationSessionRecord> {
    if (document) await this.save(document)
    const clone = structuredClone(record)
    this.sessions.set(clone.id, clone)
    return structuredClone(clone)
  }

  async loadSession(sessionId: string): Promise<PersistedPersonalizationSession | null> {
    const record = this.sessions.get(sessionId)
    if (!record) return null
    const document = this.documents.get(record.documentId)
    return {
      record: structuredClone(record),
      document: document ? structuredClone(document) : undefined,
    }
  }

  async removeSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }

  async listSessions(productId?: string): Promise<PersonalizationSessionRecord[]> {
    const all = [...this.sessions.values()]
    return structuredClone(
      productId ? all.filter((r) => r.product.productId === productId) : all,
    )
  }
}
