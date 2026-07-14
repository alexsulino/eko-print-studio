import type { PersonalizationSessionRecord } from '@/types/commerce'
import type { PersonalizationSessionStore } from '@/sdk/commerce/PersonalizationSessionManager'
import { LocalPersistenceProvider } from '@/providers/LocalPersistenceProvider'

/**
 * @deprecated Use `LocalPersistenceProvider` (SessionPersistenceProvider) instead.
 * Kept as a thin façade for older call sites / migration.
 */
export class LocalPersonalizationSessionStore implements PersonalizationSessionStore {
  private readonly persistence: LocalPersistenceProvider

  constructor(storageKey = 'eko-print-studio-commerce-sessions') {
    // Dedicated key so legacy session-only data stays isolated if still present.
    this.persistence = new LocalPersistenceProvider(`${storageKey}__via-local-persistence`)
  }

  save(record: PersonalizationSessionRecord): Promise<PersonalizationSessionRecord> {
    return this.persistence.saveSession(record)
  }

  async load(sessionId: string): Promise<PersonalizationSessionRecord | null> {
    const hit = await this.persistence.loadSession(sessionId)
    return hit?.record ?? null
  }

  remove(sessionId: string): Promise<void> {
    return this.persistence.removeSession(sessionId)
  }

  list(productId?: string): Promise<PersonalizationSessionRecord[]> {
    return this.persistence.listSessions(productId)
  }
}
