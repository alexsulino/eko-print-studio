import type {
  CommerceCartPayload,
  CommerceEmbedMode,
  CommerceOpenEditorOptions,
  CommerceOrderPayload,
  CommerceProductContext,
  PersonalizationSessionRecord,
  ProductionPreviewRef,
} from '@/types/commerce'
import {
  EkoPrintStudio,
  platformEvents,
  type EkoPrintStudioOptions,
} from '@/sdk/EkoPrintStudio'
import { bindPostMessageTransport, postToEditor } from '@/sdk/host/PostMessageBridge'

export interface WooCommerceAdapterOptions {
  /** Pre-built SDK instance, or factory options. */
  editor?: EkoPrintStudio
  editorOptions?: EkoPrintStudioOptions
  /** Default embed presentation. */
  defaultEmbedMode?: CommerceEmbedMode
  /** Target origin for iframe/modal postMessage. */
  targetOrigin?: string
}

export interface WooCommerceCartLineData {
  /** WooCommerce cart item `eko_personalization` meta key value. */
  eko_personalization: CommerceCartPayload
}

/**
 * Official WooCommerce adapter — SDK + public types only.
 * Never imports Core modules. WordPress/PHP host maps payloads into cart/order meta.
 */
export class WooCommerceAdapter {
  readonly platform = 'woocommerce' as const
  private readonly editor: EkoPrintStudio
  private readonly defaultEmbedMode: CommerceEmbedMode
  private readonly targetOrigin: string
  private lastCart: CommerceCartPayload | null = null
  private unbindTransport: (() => void) | null = null

  constructor(options: WooCommerceAdapterOptions = {}) {
    this.editor =
      options.editor ??
      new EkoPrintStudio(options.editorOptions ?? {})
    this.defaultEmbedMode = options.defaultEmbedMode ?? 'modal'
    this.targetOrigin = options.targetOrigin ?? '*'
  }

  getEditor(): EkoPrintStudio {
    return this.editor
  }

  /**
   * Open the editor for a Woo product (modal / iframe / dedicated page).
   * Template is loaded via DocumentProvider.createSession — Core stays unaware of Woo.
   */
  async openEditor(options: {
    product: CommerceProductContext
    embedMode?: CommerceEmbedMode
    sessionId?: string
    autosaveMs?: number
    /** When embedding in iframe, peer window receiving host events. */
    hostWindow?: Window
  }): Promise<PersonalizationSessionRecord> {
    const embedMode = options.embedMode ?? this.defaultEmbedMode
    this.editor.requestEmbed(embedMode, {
      productId: options.product.productId,
      templateId: options.product.templateId,
    })

    if (options.hostWindow && typeof window !== 'undefined') {
      this.unbindTransport?.()
      this.unbindTransport = bindPostMessageTransport(this.editor.getHost(), {
        targetWindow: options.hostWindow,
        targetOrigin: this.targetOrigin,
        listenWindow: window,
      })
    }

    const openOptions: CommerceOpenEditorOptions = {
      product: options.product,
      embedMode,
      sessionId: options.sessionId,
      autosaveMs: options.autosaveMs,
    }
    return this.editor.openPersonalization(openOptions)
  }

  async saveCustomization(): Promise<CommerceCartPayload> {
    const { cart } = await this.editor.savePersonalization()
    this.lastCart = cart
    return cart
  }

  async finalizeCustomization(): Promise<CommerceCartPayload> {
    const { cart } = await this.editor.finalizePersonalization()
    this.lastCart = cart
    this.editor.getHost().bus.publish({
      kind: 'event',
      channel: 'eko.commerce',
      type: 'woocommerce.cart.add',
      payload: this.toWooCartMeta(cart),
    })
    return cart
  }

  async cancelCustomization(): Promise<PersonalizationSessionRecord> {
    this.lastCart = null
    return this.editor.cancelPersonalization()
  }

  async reopenSession(sessionId: string): Promise<PersonalizationSessionRecord> {
    return this.editor.resumePersonalization(sessionId)
  }

  /** Admin recovery from order meta. */
  async reopenFromOrder(order: CommerceOrderPayload): Promise<PersonalizationSessionRecord> {
    return this.editor.openPersonalization({
      sessionId: order.cart.sessionId,
      product: order.cart.product,
      embedMode: 'page',
    })
  }

  async preview(): Promise<ProductionPreviewRef> {
    return this.editor.generateProductionPreview()
  }

  /**
   * Map standardized cart payload → WooCommerce cart item data blob.
   * PHP plugin stores this under `eko_personalization` without knowing EkoDocument shape.
   */
  toWooCartMeta(cart: CommerceCartPayload = this.requireCart()): WooCommerceCartLineData {
    return { eko_personalization: cart }
  }

  /** Build order payload after checkout for line-item persistence. */
  attachToOrder(orderId: string, lineItemId?: string, cart?: CommerceCartPayload): CommerceOrderPayload {
    const payload = this.editor.buildOrderPayload(orderId, cart ?? this.requireCart(), lineItemId)
    this.editor.getHost().bus.publish({
      kind: 'event',
      channel: 'eko.commerce',
      type: 'woocommerce.order.attach',
      payload,
    })
    return payload
  }

  getLastCartPayload(): CommerceCartPayload | null {
    return this.lastCart
  }

  getSession(): PersonalizationSessionRecord | null {
    return this.editor.getPersonalizationSession()
  }

  private requireCart(): CommerceCartPayload {
    if (!this.lastCart) {
      throw new Error('WooCommerceAdapter: no cart payload — call save/finalize first')
    }
    return this.lastCart
  }

  onCartReady(handler: (cart: CommerceCartPayload) => void): () => void {
    return this.editor.on(platformEvents.CartPayloadReady, (payload) => {
      handler(payload as CommerceCartPayload)
    })
  }

  /** Notify parent/opener that the editor shell should close. */
  notifyHostClose(): void {
    this.editor.getHost().bus.publish({
      kind: 'event',
      channel: 'eko.commerce',
      type: 'woocommerce.editor.close',
      payload: { sessionId: this.getSession()?.id ?? null },
    })
  }

  destroy(): void {
    this.unbindTransport?.()
    this.unbindTransport = null
    this.editor.destroy()
  }
}

export { postToEditor }
