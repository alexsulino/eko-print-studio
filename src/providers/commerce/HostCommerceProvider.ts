import type {
  CommerceCartPayload,
  CommerceEmbedMode,
  CommerceOrderPayload,
  CommerceProductContext,
  PersonalizationSessionRecord,
  ProductionPreviewRef,
} from '@/types/commerce'
import type {
  CommerceBootContext,
  CommercePlatformId,
  CommerceProvider,
  CommerceStartOptions,
} from '@/core/platform/providers'
import {
  EkoPrintStudio,
  platformEvents,
  type EkoPrintStudioOptions,
} from '@/sdk/EkoPrintStudio'
import { bindPostMessageTransport } from '@/sdk/host/PostMessageBridge'
import { commerceMessages } from './commerceMessages'

export interface HostCommerceProviderOptions {
  editor?: EkoPrintStudio
  editorOptions?: EkoPrintStudioOptions
  defaultEmbedMode?: CommerceEmbedMode
  targetOrigin?: string
}

/**
 * Shared CommerceProvider orchestration — SDK + HostBridge only.
 * Storefronts subclass to customize cart meta, message aliases, and prepare().
 */
export abstract class HostCommerceProvider implements CommerceProvider {
  abstract readonly id: CommercePlatformId
  abstract readonly platform: CommercePlatformId

  protected readonly editor: EkoPrintStudio
  protected readonly defaultEmbedMode: CommerceEmbedMode
  protected targetOrigin: string
  protected lastCart: CommerceCartPayload | null = null
  private readonly ownsEditor: boolean
  private unbindTransport: (() => void) | null = null

  constructor(options: HostCommerceProviderOptions = {}) {
    this.ownsEditor = !options.editor
    this.editor = options.editor ?? new EkoPrintStudio(options.editorOptions ?? {})
    this.defaultEmbedMode = options.defaultEmbedMode ?? 'modal'
    this.targetOrigin = options.targetOrigin ?? '*'
  }

  getEditor(): EkoPrintStudio {
    return this.editor
  }

  /** Subclasses wire persistence / export / auth here. */
  prepare(_context: CommerceBootContext): Promise<void> | void {
    /* optional */
  }

  async start(options: CommerceStartOptions): Promise<PersonalizationSessionRecord> {
    const embedMode = options.embedMode ?? this.defaultEmbedMode
    if (options.targetOrigin) this.targetOrigin = options.targetOrigin

    this.editor.requestEmbed(embedMode, {
      productId: options.product.productId,
      templateId: options.product.templateId,
    })

    if (options.hostWindow && typeof window !== 'undefined') {
      this.bindHost(options.hostWindow, this.targetOrigin)
    }

    const sessionId = options.sessionId ?? options.customizationId
    return this.editor.openPersonalization({
      product: options.product,
      embedMode,
      sessionId,
      autosaveMs: options.autosaveMs,
    })
  }

  async reopen(sessionId: string, product?: CommerceProductContext): Promise<PersonalizationSessionRecord> {
    if (product) {
      return this.editor.openPersonalization({
        sessionId,
        product,
        embedMode: this.defaultEmbedMode,
      })
    }
    return this.editor.resumePersonalization(sessionId)
  }

  async reopenFromOrder(order: CommerceOrderPayload): Promise<PersonalizationSessionRecord> {
    return this.editor.openPersonalization({
      sessionId: order.cart.customizationId || order.cart.sessionId,
      product: order.cart.product,
      embedMode: 'page',
    })
  }

  async save(): Promise<CommerceCartPayload> {
    const { cart } = await this.editor.savePersonalization()
    this.lastCart = cart
    return cart
  }

  async finalize(): Promise<CommerceCartPayload> {
    const { cart } = await this.editor.finalizePersonalization()
    this.lastCart = cart
    await this.addToCart(cart)
    return cart
  }

  async cancel(): Promise<PersonalizationSessionRecord> {
    this.lastCart = null
    return this.editor.cancelPersonalization()
  }

  async addToCart(cart?: CommerceCartPayload): Promise<void> {
    const payload = cart ?? this.requireCart()
    this.lastCart = payload
    this.publishCartToHost(payload)
  }

  async updateCartItem(cart?: CommerceCartPayload): Promise<CommerceCartPayload> {
    const payload = cart ?? (await this.finalize())
    this.lastCart = payload
    this.publishCartToHost(payload, { replaced: true })
    return payload
  }

  attachToOrder(orderId: string, lineItemId?: string, cart?: CommerceCartPayload): CommerceOrderPayload {
    const payload = this.editor.buildOrderPayload(orderId, cart ?? this.requireCart(), lineItemId)
    this.editor.getHost().bus.publish({
      kind: 'event',
      channel: commerceMessages.channel,
      type: commerceMessages.orderAttach,
      payload,
    })
    this.publishOrderAttachAliases?.(payload)
    return payload
  }

  async preview(): Promise<ProductionPreviewRef> {
    return this.editor.generateProductionPreview()
  }

  getSession(): PersonalizationSessionRecord | null {
    return this.editor.getPersonalizationSession()
  }

  getLastCart(): CommerceCartPayload | null {
    return this.lastCart
  }

  onCartReady(handler: (cart: CommerceCartPayload) => void): () => void {
    return this.editor.on(platformEvents.CartPayloadReady, (payload) => {
      handler(payload as CommerceCartPayload)
    })
  }

  notifyHostClose(): void {
    const sessionId = this.getSession()?.id ?? null
    this.editor.getHost().bus.publish({
      kind: 'event',
      channel: commerceMessages.channel,
      type: commerceMessages.editorClose,
      payload: { sessionId },
    })
    this.publishCloseAliases?.(sessionId)
  }

  bindHost(hostWindow: Window, targetOrigin = this.targetOrigin): void {
    this.unbindTransport?.()
    this.unbindTransport = bindPostMessageTransport(this.editor.getHost(), {
      targetWindow: hostWindow,
      targetOrigin,
      listenWindow: typeof window !== 'undefined' ? window : undefined,
    })
  }

  destroy(): void {
    this.unbindTransport?.()
    this.unbindTransport = null
    if (this.ownsEditor) {
      this.editor.destroy()
    }
  }

  /**
   * Platform-neutral cart handoff. Subclasses may override to emit
   * store-specific aliases (Woo: `woocommerce.cart.add`) instead/in addition.
   */
  protected publishCartToHost(
    cart: CommerceCartPayload,
    meta?: Record<string, unknown>,
  ): void {
    this.editor.getHost().bus.publish({
      kind: 'event',
      channel: commerceMessages.channel,
      type: commerceMessages.cartAdd,
      payload: { cart, ...meta },
    })
    this.publishCartAliases?.(cart, meta)
  }

  /** Optional store-specific cart postMessage aliases (e.g. woocommerce.cart.add). */
  protected publishCartAliases?(
    cart: CommerceCartPayload,
    meta?: Record<string, unknown>,
  ): void

  protected publishOrderAttachAliases?(order: CommerceOrderPayload): void

  protected publishCloseAliases?(sessionId: string | null): void

  protected requireCart(): CommerceCartPayload {
    if (!this.lastCart) {
      throw new Error(`${this.platform} CommerceProvider: no cart payload — call save/finalize first`)
    }
    return this.lastCart
  }
}
