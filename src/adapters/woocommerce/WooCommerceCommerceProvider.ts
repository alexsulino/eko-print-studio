import type {
  CommerceBootContext,
  CommercePlatformId,
  CommerceStartOptions,
} from '@/core/platform/providers'
import type {
  CommerceCartPayload,
  CommerceOrderPayload,
  PersonalizationSessionRecord,
} from '@/types/commerce'
import { createSessionExport } from '@/providers/export'
import {
  HostCommerceProvider,
  type HostCommerceProviderOptions,
} from '@/providers/commerce/HostCommerceProvider'
import { commerceMessages } from '@/providers/commerce/commerceMessages'
import { createCommercePersistence } from './createCommercePersistence'

/** Woo cart item data blob — plugin stores under `eko_personalization`. */
export interface WooCommerceCartLineData {
  eko_personalization: CommerceCartPayload
}

export type WooCommerceCommerceProviderOptions = HostCommerceProviderOptions

/**
 * Official WooCommerce implementation of CommerceProvider.
 * WordPress plugin (host-bridge / REST) stays unchanged — this provider speaks its protocol.
 */
export class WooCommerceCommerceProvider extends HostCommerceProvider {
  readonly id: CommercePlatformId = 'woocommerce'
  readonly platform: CommercePlatformId = 'woocommerce'

  prepare(context: CommerceBootContext): void {
    this.editor.configurePersistence(
      createCommercePersistence({
        restUrl: context.restUrl,
        token: context.persistenceToken,
      }),
    )
    this.editor.configureExport(createSessionExport({ includeRaster: true }))
    if (context.hostOrigin) {
      this.targetOrigin = context.hostOrigin
    }
  }

  async start(options: CommerceStartOptions): Promise<PersonalizationSessionRecord> {
    return super.start(options)
  }

  /** Map standardized cart → Woo cart item meta. */
  toWooCartMeta(cart: CommerceCartPayload = this.requireCart()): WooCommerceCartLineData {
    return { eko_personalization: cart }
  }

  /**
   * WordPress host-bridge expects `woocommerce.cart.add` + `eko_personalization`.
   * (Neutral `commerce.cart.add` is used by other CommerceProvider implementations.)
   */
  protected publishCartToHost(
    cart: CommerceCartPayload,
    _meta?: Record<string, unknown>,
  ): void {
    this.editor.getHost().bus.publish({
      kind: 'event',
      channel: commerceMessages.channel,
      type: 'woocommerce.cart.add',
      payload: this.toWooCartMeta(cart),
    })
  }

  protected publishOrderAttachAliases(order: CommerceOrderPayload): void {
    this.editor.getHost().bus.publish({
      kind: 'event',
      channel: commerceMessages.channel,
      type: 'woocommerce.order.attach',
      payload: order,
    })
  }

  protected publishCloseAliases(sessionId: string | null): void {
    this.editor.getHost().bus.publish({
      kind: 'event',
      channel: commerceMessages.channel,
      type: 'woocommerce.editor.close',
      payload: { sessionId },
    })
  }
}
