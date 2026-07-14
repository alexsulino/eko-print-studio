import { LocalPersistenceProvider } from '@/providers/LocalPersistenceProvider'
import { CompositePersistenceProvider } from '@/providers/CompositePersistenceProvider'
import type { SessionPersistenceProvider } from '@/core/platform/providers'
import { WooCommercePersistenceProvider } from './WooCommercePersistenceProvider'

export interface CommercePersistenceConfig {
  restUrl?: string | null
  token?: string | null
  /** Override local storage key (tests). */
  localStorageKey?: string
}

/**
 * Builds the commerce persistence stack:
 * - With REST credentials → WooCommerce (primary) + Local (fallback/mirror)
 * - Without → Local only (standalone / tests without host)
 */
export function createCommercePersistence(
  config: CommercePersistenceConfig = {},
): SessionPersistenceProvider {
  const local = new LocalPersistenceProvider(
    config.localStorageKey ?? 'eko-print-studio-persistence',
  )
  const restUrl = (config.restUrl ?? '').trim()
  const token = (config.token ?? '').trim()
  if (!restUrl || !token) {
    return local
  }
  return new CompositePersistenceProvider({
    primary: new WooCommercePersistenceProvider({ restUrl, token }),
    fallback: local,
    mirrorToFallback: true,
  })
}
