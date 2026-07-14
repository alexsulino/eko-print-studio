import type {
  CommerceCartPayload,
  CommerceEmbedMode,
  CommerceOrderPayload,
  CommerceProductContext,
  PersonalizationSessionRecord,
  ProductionPreviewRef,
} from '@/types/commerce'
import { postToEditor } from '@/sdk/host/PostMessageBridge'
import {
  WooCommerceCommerceProvider,
  type WooCommerceCartLineData,
  type WooCommerceCommerceProviderOptions,
} from './WooCommerceCommerceProvider'

export interface WooCommerceAdapterOptions extends WooCommerceCommerceProviderOptions {
  /** Reuse an already-booted CommerceProvider instance. */
  provider?: WooCommerceCommerceProvider
}

export type { WooCommerceCartLineData }

/**
 * @deprecated Prefer {@link WooCommerceCommerceProvider} (CommerceProvider).
 * Thin compatibility façade — delegates to WooCommerceCommerceProvider.
 */
export class WooCommerceAdapter {
  readonly platform = 'woocommerce' as const
  private readonly provider: WooCommerceCommerceProvider

  constructor(options: WooCommerceAdapterOptions = {}) {
    this.provider = options.provider ?? new WooCommerceCommerceProvider(options)
  }

  /** Underlying CommerceProvider implementation. */
  asCommerceProvider(): WooCommerceCommerceProvider {
    return this.provider
  }

  getEditor() {
    return this.provider.getEditor()
  }

  async openEditor(options: {
    product: CommerceProductContext
    embedMode?: CommerceEmbedMode
    sessionId?: string
    autosaveMs?: number
    hostWindow?: Window
  }): Promise<PersonalizationSessionRecord> {
    return this.provider.start(options)
  }

  async saveCustomization(): Promise<CommerceCartPayload> {
    return this.provider.save()
  }

  async finalizeCustomization(): Promise<CommerceCartPayload> {
    return this.provider.finalize()
  }

  async cancelCustomization(): Promise<PersonalizationSessionRecord> {
    return this.provider.cancel()
  }

  async reopenSession(sessionId: string): Promise<PersonalizationSessionRecord> {
    return this.provider.reopen(sessionId)
  }

  async reopenFromOrder(order: CommerceOrderPayload): Promise<PersonalizationSessionRecord> {
    return this.provider.reopenFromOrder(order)
  }

  async preview(): Promise<ProductionPreviewRef> {
    return this.provider.preview()
  }

  toWooCartMeta(cart?: CommerceCartPayload): WooCommerceCartLineData {
    return this.provider.toWooCartMeta(cart)
  }

  attachToOrder(orderId: string, lineItemId?: string, cart?: CommerceCartPayload): CommerceOrderPayload {
    return this.provider.attachToOrder(orderId, lineItemId, cart)
  }

  getLastCartPayload(): CommerceCartPayload | null {
    return this.provider.getLastCart()
  }

  getSession(): PersonalizationSessionRecord | null {
    return this.provider.getSession()
  }

  onCartReady(handler: (cart: CommerceCartPayload) => void): () => void {
    return this.provider.onCartReady(handler)
  }

  notifyHostClose(): void {
    this.provider.notifyHostClose()
  }

  destroy(): void {
    this.provider.destroy()
  }
}

export { postToEditor }
