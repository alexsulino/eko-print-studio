import type { EkoDocument } from '@/types/document'
import type { PersonalizationSessionRecord } from '@/types/commerce'
import type {
  PersistedPersonalizationSession,
  PersistenceVersion,
  SessionPersistenceProvider,
} from '@/core/platform/providers'
import { serializeDocument } from '@/core/document/serializeDocument'
import { validateDocument } from '@/core/document/validateDocument'
import { createId } from '@/utils/id'

/**
 * Local SessionPersistenceProvider — documents + commerce sessions in memory/localStorage.
 * Primary for standalone Creator; fallback / offline for commerce stacks.
 */
export class LocalPersistenceProvider implements SessionPersistenceProvider {
  readonly id = 'local'
  readonly backend = 'local' as const
  private readonly storageKey: string
  private memory = new Map<string, EkoDocument>()
  private sessions = new Map<string, PersonalizationSessionRecord>()
  private versions = new Map<string, PersistenceVersion[]>()

  constructor(storageKey = 'eko-print-studio-persistence') {
    this.storageKey = storageKey
    this.hydrate()
  }

  private hydrate(): void {
    try {
      if (typeof localStorage === 'undefined') return
      const raw = localStorage.getItem(this.storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        documents?: EkoDocument[]
        sessions?: PersonalizationSessionRecord[]
        versions?: Record<string, PersistenceVersion[]>
      }
      for (const doc of parsed.documents ?? []) this.memory.set(doc.id, doc)
      for (const session of parsed.sessions ?? []) this.sessions.set(session.id, session)
      if (parsed.versions) {
        for (const [id, list] of Object.entries(parsed.versions)) {
          this.versions.set(id, list)
        }
      }
    } catch {
      /* ignore corrupt cache */
    }
  }

  private flush(): void {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          documents: [...this.memory.values()],
          sessions: [...this.sessions.values()],
          versions: Object.fromEntries(this.versions.entries()),
        }),
      )
    } catch {
      /* private mode / SSR */
    }
  }

  async save(document: EkoDocument): Promise<EkoDocument> {
    const validation = validateDocument(document)
    if (!validation.valid) {
      throw new Error(`Invalid document: ${validation.issues.map((i) => i.message).join('; ')}`)
    }
    const clean = serializeDocument(document)
    this.memory.set(clean.id, clean)
    const list = this.versions.get(clean.id) ?? []
    list.push({
      id: createId('ver'),
      documentId: clean.id,
      createdAt: new Date().toISOString(),
      label: 'autosave',
    })
    this.versions.set(clean.id, list.slice(-20))
    this.flush()
    return structuredClone(clean)
  }

  async load(id: string): Promise<EkoDocument> {
    const doc = this.memory.get(id)
    if (!doc) throw new Error(`Document not found in persistence: ${id}`)
    return structuredClone(doc)
  }

  async autosave(document: EkoDocument): Promise<void> {
    await this.save(document)
  }

  async listVersions(documentId: string): Promise<PersistenceVersion[]> {
    return structuredClone(this.versions.get(documentId) ?? [])
  }

  async restoreVersion(documentId: string, _versionId: string): Promise<EkoDocument> {
    return this.load(documentId)
  }

  async saveSession(
    record: PersonalizationSessionRecord,
    document?: EkoDocument,
  ): Promise<PersonalizationSessionRecord> {
    if (document) {
      await this.save(document)
    }
    const clone = structuredClone(record)
    this.sessions.set(clone.id, clone)
    this.flush()
    return structuredClone(clone)
  }

  async loadSession(sessionId: string): Promise<PersistedPersonalizationSession | null> {
    const record = this.sessions.get(sessionId)
    if (!record) return null
    const document = this.memory.get(record.documentId)
    return {
      record: structuredClone(record),
      document: document ? structuredClone(document) : undefined,
    }
  }

  async removeSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
    this.flush()
  }

  async listSessions(productId?: string): Promise<PersonalizationSessionRecord[]> {
    const all = [...this.sessions.values()]
    return structuredClone(
      productId ? all.filter((r) => r.product.productId === productId) : all,
    )
  }
}
