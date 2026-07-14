import type { EkoDocument } from './document'

/**
 * Public commerce contracts — shared by SDK and all storefront adapters.
 * Core never depends on WooCommerce / Shopify / Magento specifics.
 */

export type CommerceEmbedMode = 'modal' | 'iframe' | 'page'

export type PersonalizationSessionStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'autosaving'
  | 'saved'
  | 'finalized'
  | 'cancelled'

/** Product / line-item context passed by the host storefront. */
export interface CommerceProductContext {
  productId: string
  sku?: string
  variationId?: string
  attributes?: Record<string, string>
  quantity?: number
  /** Template Master id linked to the product. */
  templateId: string
  productName?: string
  currency?: string
  unitPrice?: number
  locale?: string
  /** Opaque host metadata (Woo meta, Shopify properties, …). */
  hostMeta?: Record<string, unknown>
}

export interface PersonalizationSessionRecord {
  id: string
  status: PersonalizationSessionStatus
  product: CommerceProductContext
  documentId: string
  masterId: string
  createdAt: string
  updatedAt: string
  autosaveAt?: string
  finalizedAt?: string
  cancelledAt?: string
  /** Document schema version at last save. */
  schemaVersion?: string
  preview?: ProductionPreviewRef
  embedMode?: CommerceEmbedMode
}

/** Lightweight preview reference for cart/order (not a full document). */
export interface ProductionPreviewRef {
  format: 'json' | 'png' | 'svg' | 'pdf'
  mimeType: string
  /** Absolute URL or inline data URL / JSON string. */
  data: string
  widthPx: number
  heightPx: number
  generatedAt: string
  fidelity: 'domain' | 'raster'
}

/**
 * Standardized payload returned to the storefront cart.
 * Hosts map this into Woo cart item data / Shopify line properties / etc.
 */
export interface CommerceCartPayload {
  schema: 'eko.commerce.cart/1'
  sessionId: string
  documentId: string
  masterId: string
  product: CommerceProductContext
  /** Serialized Session Design (clean JSON string). */
  documentJson: string
  preview: ProductionPreviewRef
  savedAt: string
  /** Values useful for line-item display without parsing the full document. */
  summary: {
    documentName: string
    elementCount: number
    pageCount: number
  }
}

/**
 * Payload attached to a placed order for admin recovery / re-edit.
 */
export interface CommerceOrderPayload {
  schema: 'eko.commerce.order/1'
  orderId: string
  lineItemId?: string
  cart: CommerceCartPayload
  recoveredAt?: string
  allowAdminReedit: boolean
}

export interface CommerceOpenEditorOptions {
  product: CommerceProductContext
  embedMode?: CommerceEmbedMode
  /** Resume an existing session instead of cloning a new one. */
  sessionId?: string
  autosaveMs?: number
}

export interface CommerceSessionSnapshot {
  session: PersonalizationSessionRecord
  document: EkoDocument | null
}
