import type { CommercePlatformId, CommerceProvider } from '@/core/platform/providers'
import type { EkoPrintStudio } from '@/sdk/EkoPrintStudio'
import type { CommerceEmbedMode } from '@/types/commerce'
import { WooCommerceCommerceProvider } from '@/adapters/woocommerce/WooCommerceCommerceProvider'
import { ShopifyCommerceProvider } from './stubs/ShopifyCommerceProvider'
import { MagentoCommerceProvider } from './stubs/MagentoCommerceProvider'
import { NuvemshopCommerceProvider } from './stubs/NuvemshopCommerceProvider'

export interface CreateCommerceProviderOptions {
  platform: CommercePlatformId
  editor?: EkoPrintStudio
  defaultEmbedMode?: CommerceEmbedMode
  targetOrigin?: string
}

/**
 * Factory for CommerceProvider implementations.
 * App / SDK boot resolve a platform id — never hard-code a storefront class.
 */
export function createCommerceProvider(options: CreateCommerceProviderOptions): CommerceProvider {
  const { platform, editor, defaultEmbedMode, targetOrigin } = options
  switch (platform) {
    case 'woocommerce':
      return new WooCommerceCommerceProvider({ editor, defaultEmbedMode, targetOrigin })
    case 'shopify':
      return new ShopifyCommerceProvider()
    case 'magento':
      return new MagentoCommerceProvider()
    case 'nuvemshop':
      return new NuvemshopCommerceProvider()
    default:
      throw new Error(`createCommerceProvider: unsupported platform "${platform}"`)
  }
}
