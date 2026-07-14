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

/** Reserved Magento / Adobe Commerce CommerceProvider stub. */
export class MagentoCommerceProvider implements CommerceProvider {
  readonly id: CommercePlatformId = 'magento'
  readonly platform: CommercePlatformId = 'magento'

  async start(_options: CommerceStartOptions): Promise<PersonalizationSessionRecord> {
    throw new Error('MagentoCommerceProvider: not implemented yet')
  }

  async reopen(
    _sessionId: string,
    _product?: CommerceProductContext,
  ): Promise<PersonalizationSessionRecord> {
    throw new Error('MagentoCommerceProvider: not implemented yet')
  }

  async save(): Promise<CommerceCartPayload> {
    throw new Error('MagentoCommerceProvider: not implemented yet')
  }

  async finalize(): Promise<CommerceCartPayload> {
    throw new Error('MagentoCommerceProvider: not implemented yet')
  }

  async cancel(): Promise<PersonalizationSessionRecord> {
    throw new Error('MagentoCommerceProvider: not implemented yet')
  }

  async preview(): Promise<ProductionPreviewRef> {
    throw new Error('MagentoCommerceProvider: not implemented yet')
  }

  getSession(): PersonalizationSessionRecord | null {
    return null
  }

  getLastCart(): CommerceCartPayload | null {
    return null
  }

  notifyHostClose(): void {}

  destroy(): void {}
}
