import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { EkoPrintStudio } from '@/sdk/EkoPrintStudio'
import {
  bootCommerceFromUrl,
  createCommerceProvider,
  isCommerceProvider,
} from '@/providers/commerce'
import { WooCommerceCommerceProvider } from '@/adapters/woocommerce/WooCommerceCommerceProvider'
import { localDocumentProvider } from '@/providers/LocalDocumentProvider'
import { LocalPersistenceProvider } from '@/providers/LocalPersistenceProvider'
import { createSessionExport } from '@/providers/export'
import { SAMPLE_MASTER_ID } from '@/core/templates'
import { historyEngine } from '@/core/history/HistoryEngine'
import { eventBus } from '@/core/events/EventBus'
import type { CommerceProductContext } from '@/types/commerce'

const product: CommerceProductContext = {
  productId: '42',
  templateId: SAMPLE_MASTER_ID,
  quantity: 1,
}

describe('CommerceProvider architecture', () => {
  let editor: EkoPrintStudio

  beforeEach(() => {
    historyEngine.clear()
    eventBus.clear()
    editor = new EkoPrintStudio({
      documentProvider: localDocumentProvider,
      providers: {
        persistence: new LocalPersistenceProvider('eko-test-commerce-provider'),
        export: createSessionExport({ includeRaster: true }),
      },
    })
  })

  afterEach(() => {
    editor.destroy()
  })

  it('createCommerceProvider resolves woo and stubs', () => {
    const woo = createCommerceProvider({ platform: 'woocommerce', editor })
    expect(isCommerceProvider(woo)).toBe(true)
    expect(woo.platform).toBe('woocommerce')
    expect(woo).toBeInstanceOf(WooCommerceCommerceProvider)

    const shopify = createCommerceProvider({ platform: 'shopify' })
    expect(shopify.platform).toBe('shopify')
    expect(createCommerceProvider({ platform: 'magento' }).platform).toBe('magento')
    expect(createCommerceProvider({ platform: 'nuvemshop' }).platform).toBe('nuvemshop')
  })

  it('SDK configureCommerce / getCommerce never needs a Woo import', async () => {
    const provider = createCommerceProvider({ platform: 'woocommerce', editor })
    editor.configureCommerce(provider)
    expect(editor.getCommerce()?.id).toBe('woocommerce')

    await provider.start({ product, autosaveMs: 0 })
    const cart = await provider.finalize()
    expect(cart.schema).toBe('eko.commerce.cart/1')
    expect(cart.sessionId).toBeTruthy()
  })

  it('bootCommerceFromUrl defaults platform to woocommerce without App knowing Woo', async () => {
    const result = await bootCommerceFromUrl({
      editor,
      search: `?templateId=${SAMPLE_MASTER_ID}&productId=99&embed=page&autosaveMs=0`,
    })
    expect(result).toBeTruthy()
    expect(result!.provider.platform).toBe('woocommerce')
    expect(result!.record.product.productId).toBe('99')
    expect(editor.getCommerce()?.platform).toBe('woocommerce')
  })

  it('App source must not import adapters/woocommerce', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const file = path.join(process.cwd(), 'src/App.tsx')
    const source = await fs.readFile(file, 'utf8')
    expect(source).not.toMatch(/adapters\/woocommerce/)
    expect(source).toMatch(/bootCommerceFromUrl/)
    expect(source).toMatch(/CommerceProvider/)
  })
})
