import type { EkoDocument } from '@/types/document'
import type { PersistenceProvider, PersistenceVersion } from '@/core/platform/providers'
import { serializeDocument } from '@/core/document/serializeDocument'
import { validateDocument } from '@/core/document/validateDocument'
import { createId } from '@/utils/id'

/**
 * Local PersistenceProvider — documents + optional version metadata in memory/localStorage.
 * Used by commerce sessions when no remote backend is configured.
 */
export class LocalPersistenceProvider implements PersistenceProvider {
  readonly backend = 'local' as const
  private readonly storageKey: string
  private memory = new Map<string, EkoDocument>()
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
        versions?: Record<string, PersistenceVersion[]>
      }
      for (const doc of parsed.documents ?? []) this.memory.set(doc.id, doc)
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
    // MVP: restore latest saved document for the id (full version payload later).
    return this.load(documentId)
  }
}
