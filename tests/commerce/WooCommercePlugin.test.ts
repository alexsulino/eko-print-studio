import { describe, expect, it } from 'vitest'
import type { CommerceCartPayload } from '@/types/commerce'
import { bootWooCommerceFromUrl } from '@/adapters/woocommerce/bootFromUrl'
import { EkoPrintStudio } from '@/sdk/EkoPrintStudio'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'
import { LocalPersistenceProvider } from '@/providers/LocalPersistenceProvider'
import { SAMPLE_MASTER_ID } from '@/core/templates'
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
      providers: { persistence: new LocalPersistenceProvider('eko-plugin-contract-test') },
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
    expect((cart as CommerceCartPayload).preview.fidelity).toBe('raster')
    expect((cart as CommerceCartPayload).preview.filename).toBe('preview.png')
    expect((cart as CommerceCartPayload).preview.data.startsWith('data:image/png')).toBe(true)
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
      'config/TemplateCatalog.php',
      'config/template-catalog.json',
      'services/SessionRepository.php',
      'services/SessionToken.php',
      'services/PreviewPresenter.php',
      'README.md',
    ]) {
      await expect(fs.access(path.join(root, rel))).resolves.toBeUndefined()
    }
  })

  it('product admin uses Template Master select (no free-text Template ID label)', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const source = await fs.readFile(
      path.join(process.cwd(), 'integrations/woocommerce/eko-print-studio/admin/ProductFields.php'),
      'utf8',
    )
    expect(source.includes('woocommerce_wp_select')).toBe(true)
    expect(source.includes('Template Master')).toBe(true)
    expect(source.includes('TemplateCatalog')).toBe(true)
    expect(source.includes('woocommerce_wp_text_input')).toBe(false)
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

  it('host bridge resumes session and renders official PDP preview status', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const root = path.join(process.cwd(), 'integrations/woocommerce/eko-print-studio')
    const bridge = await fs.readFile(path.join(root, 'assets/js/host-bridge.js'), 'utf8')
    expect(bridge.includes('Editar Personalização') || bridge.includes('edit')).toBe(true)
    expect(bridge.includes('data-session-id')).toBe(true)
    expect(bridge.includes('sessionStorage')).toBe(true)
    expect(bridge.includes('renderPdpStatus')).toBe(true)
    expect(bridge.includes('preview.png') || bridge.includes('isRasterPreview')).toBe(true)

    const cartPersistence = await fs.readFile(path.join(root, 'services/CartPersistence.php'), 'utf8')
    expect(cartPersistence.includes('PreviewPresenter')).toBe(true)
    expect(cartPersistence.includes('Personalizado')).toBe(true)

    const presenter = await fs.readFile(path.join(root, 'services/PreviewPresenter.php'), 'utf8')
    expect(presenter.includes('is_raster')).toBe(true)
    expect(presenter.includes('preview.png')).toBe(true)

    const productButton = await fs.readFile(path.join(root, 'frontend/ProductButton.php'), 'utf8')
    expect(productButton.includes('data-eko-pdp-status')).toBe(true)
  })
})
