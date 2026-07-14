import type {
  CommercePlatformId,
  CommerceProvider,
  CommerceStartOptions,
} from '@/core/platform/providers'
import type {
  CommerceCartPayload,
  CommerceProductContext,
  PersonalizationSessionRecord,
  ProductionPreviewRef,
} from '@/types/commerce'

/**
 * Reserved Shopify CommerceProvider — wire Storefront / Checkout Extensibility later.
 * Registers in createCommerceProvider so the SDK surface is platform-complete.
 */
export class ShopifyCommerceProvider implements CommerceProvider {
  readonly id: CommercePlatformId = 'shopify'
  readonly platform: CommercePlatformId = 'shopify'

  async start(_options: CommerceStartOptions): Promise<PersonalizationSessionRecord> {
    throw new Error('ShopifyCommerceProvider: not implemented yet')
  }

  async reopen(
    _sessionId: string,
    _product?: CommerceProductContext,
  ): Promise<PersonalizationSessionRecord> {
    throw new Error('ShopifyCommerceProvider: not implemented yet')
  }

  async save(): Promise<CommerceCartPayload> {
    throw new Error('ShopifyCommerceProvider: not implemented yet')
  }

  async finalize(): Promise<CommerceCartPayload> {
    throw new Error('ShopifyCommerceProvider: not implemented yet')
  }

  async cancel(): Promise<PersonalizationSessionRecord> {
    throw new Error('ShopifyCommerceProvider: not implemented yet')
  }

  async preview(): Promise<ProductionPreviewRef> {
    throw new Error('ShopifyCommerceProvider: not implemented yet')
  }

  getSession(): PersonalizationSessionRecord | null {
    return null
  }

  getLastCart(): CommerceCartPayload | null {
    return null
  }

  notifyHostClose(): void {
    /* no-op until wired */
  }

  destroy(): void {
    /* no-op */
  }
}
