import { sampleMasterTemplate } from '@/data/sampleDocuments'
import { cloneToSession } from '@/core/document/cloneToSession'
import { serializeDocument } from '@/core/document/serializeDocument'
import { validateDocument } from '@/core/document/validateDocument'
import type { EkoDocument } from '@/types/document'
import type { DocumentProvider } from '@/types/provider'

/**
 * In-memory / localStorage provider for Phase 1.
 * Swap for WordPress / Woo / API providers later without touching the core.
 */
export class LocalDocumentProvider implements DocumentProvider {
  private readonly storageKey = 'eko-print-studio-documents'
  private memory = new Map<string, EkoDocument>()

  constructor() {
    this.seed()
  }

  private seed(): void {
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as EkoDocument[]
        for (const doc of parsed) {
          this.memory.set(doc.id, doc)
        }
      }
    } catch {
      // Ignore corrupt local cache in Phase 1.
    }

    // Always re-seed the canonical sample master from code so a stale localStorage
    // copy cannot blank the canvas (empty/invalid surface.elementIds, missing elements).
    const master = serializeDocument(sampleMasterTemplate)
    this.memory.set(master.id, master)
  }

  private persist(): void {
    try {
      const all = [...this.memory.values()]
      localStorage.setItem(this.storageKey, JSON.stringify(all))
    } catch {
      // localStorage may be unavailable (SSR / private mode).
    }
  }

  async getDocument(id: string): Promise<EkoDocument> {
    const doc = this.memory.get(id)
    if (!doc) {
      throw new Error(`Document not found: ${id}`)
    }
    return structuredClone(doc)
  }

  async saveDocument(document: EkoDocument): Promise<EkoDocument> {
    if (document.type === 'template' && document.permissions.lockMaster) {
      throw new Error('Cannot save locked template master from customer flow')
    }

    const validation = validateDocument(document)
    if (!validation.valid) {
      throw new Error(`Invalid document: ${validation.issues.map((i) => i.message).join('; ')}`)
    }

    const clean = serializeDocument(document)
    this.memory.set(clean.id, clean)
    this.persist()
    return structuredClone(clean)
  }

  async createSession(masterId: string): Promise<EkoDocument> {
    const master = await this.getDocument(masterId)
    const session = cloneToSession(master)
    this.memory.set(session.id, session)
    this.persist()
    return structuredClone(session)
  }

  async listDocuments(): Promise<EkoDocument[]> {
    return [...this.memory.values()].map((doc) => structuredClone(doc))
  }
}

export const localDocumentProvider = new LocalDocumentProvider()
