import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { EkoPrintStudio, platformEvents } from '@/sdk/EkoPrintStudio'
import { WooCommerceAdapter, WooCommerceCommerceProvider } from '@/adapters/woocommerce'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'
import { LocalPersistenceProvider } from '@/providers/LocalPersistenceProvider'
import { createSessionExport } from '@/providers/export'
import { SAMPLE_MASTER_ID } from '@/core/templates'
import { historyEngine } from '@/core/history/HistoryEngine'
import { eventBus } from '@/core/events/EventBus'
import type { CommerceProductContext } from '@/types/commerce'

const product: CommerceProductContext = {
  productId: 'woo-42',
  sku: 'MUG-BR',
  variationId: '456',
  attributes: { cor: 'verde' },
  quantity: 2,
  templateId: SAMPLE_MASTER_ID,
  productName: 'Caneca Brasil',
}

describe('v0.8 Commerce — personalization + WooCommerce adapter', () => {
  let editor: EkoPrintStudio
  let adapter: WooCommerceAdapter

  beforeEach(() => {
    historyEngine.clear()
    eventBus.clear()
    editor = new EkoPrintStudio({
      documentProvider: localDocumentProvider,
      providers: {
        persistence: new LocalPersistenceProvider('eko-test-persistence'),
        export: createSessionExport({ includeRaster: true }),
      },
    })
    adapter = new WooCommerceAdapter({ editor, defaultEmbedMode: 'modal' })
  })

  afterEach(() => {
    adapter.destroy()
  })

  it('opens product template as personalization session without Core imports in adapter', async () => {
    const record = await adapter.openEditor({ product, autosaveMs: 0 })
    expect(record.status).toBe('active')
    expect(record.product.productId).toBe('woo-42')
    expect(record.masterId).toBe(SAMPLE_MASTER_ID)
    expect(editor.getDocument()?.type).toBe('session')
    expect(editor.getDocument()?.id).toBe(record.documentId)
  })

  it('save → cart payload → order attachment → admin reopen', async () => {
    await adapter.openEditor({ product, autosaveMs: 0 })
    const cart = await adapter.finalizeCustomization()

    expect(cart.schema).toBe('eko.commerce.cart/1')
    expect(cart.product.sku).toBe('MUG-BR')
    expect(cart.documentJson).toContain('"type": "session"')
    expect(cart.preview.fidelity).toBe('raster')
    expect(cart.preview.filename).toBe('preview.png')
    expect(cart.preview.domainData).toBeTruthy()
    expect(cart.summary.elementCount).toBeGreaterThan(0)

    const wooMeta = adapter.toWooCartMeta(cart)
    expect(wooMeta.eko_personalization.sessionId).toBe(cart.sessionId)

    const order = adapter.attachToOrder('order-100', 'line-1', cart)
    expect(order.schema).toBe('eko.commerce.order/1')
    expect(order.allowAdminReedit).toBe(true)

    const resumed = await adapter.reopenFromOrder(order)
    expect(resumed.id).toBe(cart.sessionId)
    expect(resumed.status).toBe('active')
  })

  it('supports cancel and refuses resume of cancelled session', async () => {
    const started = await adapter.openEditor({ product, autosaveMs: 0 })
    const cancelled = await adapter.cancelCustomization()
    expect(cancelled.status).toBe('cancelled')
    await expect(adapter.reopenSession(started.id)).rejects.toThrow(/cancelled/)
  })

  it('autosave + preview events fire on SDK bus', async () => {
    const autosaves: string[] = []
    const previews: string[] = []
    editor.on(platformEvents.SessionAutosaved, () => autosaves.push('ok'))
    editor.on(platformEvents.PreviewGenerated, () => previews.push('ok'))

    await adapter.openEditor({ product, autosaveMs: 0 })
    await adapter.preview()
    expect(previews.length).toBe(1)

    await adapter.saveCustomization()
    const record = editor.getPersonalizationSession()
    expect(record?.preview).toBeTruthy()
  })

  it('WooCommerceAdapter is a thin façade over WooCommerceCommerceProvider', () => {
    expect(adapter.asCommerceProvider()).toBeInstanceOf(WooCommerceCommerceProvider)
    expect(adapter.asCommerceProvider().platform).toBe('woocommerce')
  })

  it('WooCommerceCommerceProvider may import platform contracts only — not Core engines', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const file = path.join(process.cwd(), 'src/adapters/woocommerce/WooCommerceCommerceProvider.ts')
    const source = await fs.readFile(file, 'utf8')
    expect(source).toContain('HostCommerceProvider')
    expect(source).not.toMatch(/from ['"]@\/core\/(?!platform)/)
  })
})
