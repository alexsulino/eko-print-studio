import { describe, expect, it } from 'vitest'
import type { CommerceCartPayload } from '@/types/commerce'
import { bootWooCommerceFromUrl } from '@/adapters/woocommerce/bootFromUrl'
import { EkoPrintStudio } from '@/sdk/EkoPrintStudio'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'
import { InMemorySessionStore } from '@/sdk/commerce/PersonalizationSessionManager'
import { SAMPLE_MASTER_ID } from '@/data/sampleDocuments'
import { historyEngine } from '@/core/history/HistoryEngine'
import { eventBus } from '@/core/events/EventBus'

/**
 * Mirrors PHP PayloadValidator rules used by the production plugin.
 * Keeps JS ↔ PHP contract alignment without running WordPress in CI.
 */
function validateCartLikePlugin(data: unknown): { ok: boolean; error?: string } {
  if (!data || typeof data !== 'object') return { ok: false, error: 'Cart payload must be an object.' }
  const cart = data as Record<string, unknown>
  if (cart.schema !== 'eko.commerce.cart/1') return { ok: false, error: 'Unsupported cart contract version.' }
  for (const key of ['sessionId', 'documentId', 'masterId', 'product', 'documentJson', 'preview', 'savedAt', 'summary']) {
    if (!(key in cart)) return { ok: false, error: `Missing cart field: ${key}` }
  }
  const product = cart.product as Record<string, unknown>
  if (!product?.productId || !product?.templateId) return { ok: false, error: 'Invalid product context.' }
  const preview = cart.preview as Record<string, unknown>
  if (!preview?.data) return { ok: false, error: 'Invalid preview.' }
  return { ok: true }
}

describe('v0.8.1 WooCommerce production plugin contracts', () => {
  it('accepts SDK cart payloads that the PHP plugin will persist', async () => {
    historyEngine.clear()
    eventBus.clear()
    const editor = new EkoPrintStudio({
      documentProvider: localDocumentProvider,
      sessionStore: new InMemorySessionStore(),
    })
    const result = await bootWooCommerceFromUrl({
      editor,
      search: `?templateId=${SAMPLE_MASTER_ID}&productId=42&embed=modal&autosaveMs=0`,
    })
    expect(result).toBeTruthy()
    const cart = await result!.adapter.finalizeCustomization()
    const check = validateCartLikePlugin(cart)
    expect(check.ok).toBe(true)
    expect(cart.schema).toBe('eko.commerce.cart/1')
    expect((cart as CommerceCartPayload).product.templateId).toBe(SAMPLE_MASTER_ID)
    result!.adapter.destroy()
  })

  it('rejects malformed cart payloads (plugin gate)', () => {
    expect(validateCartLikePlugin({ schema: 'other' }).ok).toBe(false)
    expect(validateCartLikePlugin({ schema: 'eko.commerce.cart/1' }).ok).toBe(false)
  })

  it('plugin PHP entrypoint and host bridge exist on disk', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const root = path.join(process.cwd(), 'integrations/woocommerce/eko-print-studio')
    for (const rel of [
      'eko-print-studio.php',
      'assets/js/host-bridge.js',
      'assets/js/admin-reopen.js',
      'rest/Routes.php',
      'services/PayloadValidator.php',
      'services/CartPersistence.php',
      'services/OrderPersistence.php',
      'config/Settings.php',
      'README.md',
    ]) {
      await expect(fs.access(path.join(root, rel))).resolves.toBeUndefined()
    }
  })

  it('host-bridge.js never references Core paths', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const source = await fs.readFile(
      path.join(process.cwd(), 'integrations/woocommerce/eko-print-studio/assets/js/host-bridge.js'),
      'utf8',
    )
    expect(source.includes('@/core')).toBe(false)
    expect(source.includes('postMessage')).toBe(true)
    expect(source.includes('eko_personalization') || source.includes('add-to-cart')).toBe(true)
  })
})
