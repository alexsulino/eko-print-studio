import type { PersonalizationSessionRecord } from '@/types/commerce'
import type { PersonalizationSessionStore } from '@/sdk/commerce/PersonalizationSessionManager'

/**
 * Local session record store — commerce session metadata only (not EkoDocument internals).
 */
export class LocalPersonalizationSessionStore implements PersonalizationSessionStore {
  private readonly storageKey: string
  private memory = new Map<string, PersonalizationSessionRecord>()

  constructor(storageKey = 'eko-print-studio-commerce-sessions') {
    this.storageKey = storageKey
    this.hydrate()
  }

  private hydrate(): void {
    try {
      if (typeof localStorage === 'undefined') return
      const raw = localStorage.getItem(this.storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as PersonalizationSessionRecord[]
      for (const record of parsed) this.memory.set(record.id, record)
    } catch {
      /* ignore */
    }
  }

  private flush(): void {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(this.storageKey, JSON.stringify([...this.memory.values()]))
    } catch {
      /* ignore */
    }
  }

  async save(record: PersonalizationSessionRecord): Promise<PersonalizationSessionRecord> {
    const clone = structuredClone(record)
    this.memory.set(clone.id, clone)
    this.flush()
    return structuredClone(clone)
  }

  async load(sessionId: string): Promise<PersonalizationSessionRecord | null> {
    const hit = this.memory.get(sessionId)
    return hit ? structuredClone(hit) : null
  }

  async remove(sessionId: string): Promise<void> {
    this.memory.delete(sessionId)
    this.flush()
  }

  async list(productId?: string): Promise<PersonalizationSessionRecord[]> {
    const all = [...this.memory.values()]
    return structuredClone(
      productId ? all.filter((r) => r.product.productId === productId) : all,
    )
  }
}
