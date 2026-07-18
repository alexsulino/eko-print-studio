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
      'services/JsonMetaPersistence.php',
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
    expect(source.includes('fetch') || source.includes('postMessage')).toBe(true)
    expect(source.includes('eko_personalization') || source.includes('add-to-cart')).toBe(true)
  })

  it('session upsert failure surfaces as REST persist_failed (not silent success)', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const routes = await fs.readFile(
      path.join(process.cwd(), 'integrations/woocommerce/eko-print-studio/rest/Routes.php'),
      'utf8',
    )
    expect(routes.includes('session.persist_failed')).toBe(true)
    expect(routes.includes('eko_persist_failed')).toBe(true)
    expect(routes.includes('eko_id_mismatch')).toBe(true)
    const repo = await fs.readFile(
      path.join(process.cwd(), 'integrations/woocommerce/eko-print-studio/services/SessionRepository.php'),
      'utf8',
    )
    expect(repo.includes('persist verification failed')).toBe(true)
    expect(repo.includes('write_identity_metas')).toBe(true)
    expect(repo.includes('JsonMetaPersistence')).toBe(true)
    expect(repo.includes('RuntimeException')).toBe(true)
  })

  it('ADR-0002: all JSON meta writes go through JsonMetaPersistence (no raw encode to meta)', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const root = path.join(process.cwd(), 'integrations/woocommerce/eko-print-studio')

    const helper = await fs.readFile(path.join(root, 'services/JsonMetaPersistence.php'), 'utf8')
    expect(helper.includes('wp_slash')).toBe(true)
    expect(helper.includes('persist_post_meta')).toBe(true)
    expect(helper.includes('encode_for_metadata')).toBe(true)
    expect(helper.includes('RuntimeException')).toBe(true)
    expect(helper.includes('json_decode')).toBe(true)

    const { readdir } = fs
    async function collectPhp(dir: string): Promise<string[]> {
      const entries = await readdir(dir, { withFileTypes: true })
      const files: string[] = []
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) files.push(...(await collectPhp(full)))
        else if (entry.name.endsWith('.php')) files.push(full)
      }
      return files
    }

    const phpFiles = await collectPhp(root)
    const offenders: string[] = []
    for (const file of phpFiles) {
      if (file.endsWith(`${path.sep}JsonMetaPersistence.php`)) continue
      const src = await fs.readFile(file, 'utf8')
      if (/update_post_meta\s*\([^;]*wp_json_encode/.test(src)) {
        offenders.push(`${file}: update_post_meta(...wp_json_encode)`)
      }
      if (/update_post_meta\s*\([^;]*wp_slash\s*\(/.test(src)) {
        offenders.push(`${file}: update_post_meta(...wp_slash) outside helper`)
      }
      if (/add_meta_data\s*\([^;]*wp_json_encode/.test(src)) {
        offenders.push(`${file}: add_meta_data(...wp_json_encode)`)
      }
      if (/update_post_meta\s*\([^;]*_eko_session_record/.test(src)) {
        offenders.push(`${file}: direct update_post_meta(_eko_session_record)`)
      }
      if (/update_post_meta\s*\([^;]*_eko_session_document/.test(src)) {
        offenders.push(`${file}: direct update_post_meta(_eko_session_document)`)
      }
    }
    expect(offenders).toEqual([])

    const order = await fs.readFile(path.join(root, 'services/OrderPersistence.php'), 'utf8')
    expect(order.includes('JsonMetaPersistence::encode_for_metadata')).toBe(true)
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

  it('host-bridge.js is syntactically valid and resumes only with explicit edit hint', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const { execFileSync } = await import('node:child_process')
    const bridgePath = path.join(
      process.cwd(),
      'integrations/woocommerce/eko-print-studio/assets/js/host-bridge.js',
    )
    expect(() => execFileSync(process.execPath, ['--check', bridgePath], { stdio: 'pipe' })).not.toThrow()

    const bridge = await fs.readFile(bridgePath, 'utf8')
    expect(bridge.includes('customization not found')).toBe(true)
    expect(bridge.includes("lifecycle === 'cart_attached'")).toBe(true)
    expect(bridge.includes('startFromCartEdit')).toBe(true)
    expect(bridge.includes('fetchCustomizationById')).toBe(true)
    // TEMP strip must not leave orphan object literals
    expect(bridge.includes('type: data.type,')).toBe(false)
  })

  it('order admin panel decodes order meta as string or array (reopen button)', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const root = path.join(process.cwd(), 'integrations/woocommerce/eko-print-studio')
    const order = await fs.readFile(path.join(root, 'services/OrderPersistence.php'), 'utf8')
    expect(order.includes('function decode_order_meta')).toBe(true)
    const panel = await fs.readFile(path.join(root, 'admin/OrderPanel.php'), 'utf8')
    expect(panel.includes('decode_order_meta')).toBe(true)
    expect(panel.includes('payload_from_scalar_metas')).toBe(true)
    expect(panel.includes('admin-order-item.php')).toBe(true)
    const view = await fs.readFile(path.join(root, 'views/admin-order-item.php'), 'utf8')
    expect(view.includes('data-eko-edit-customization')).toBe(true)
    expect(view.includes('data-customization-id')).toBe(true)
    expect(view.includes('data-product-id')).toBe(true)
    const adminJs = await fs.readFile(path.join(root, 'assets/js/admin-reopen.js'), 'utf8')
    expect(adminJs.includes('persistenceToken')).toBe(true)
    expect(adminJs.includes('product-context')).toBe(true)
    expect(adminJs.includes('startFromCartEdit')).toBe(true)
  })
})
