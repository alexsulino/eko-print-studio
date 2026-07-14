import type { CommerceEmbedMode, CommerceProductContext } from '@/types/commerce'
import { WooCommerceAdapter } from '@/adapters/woocommerce/WooCommerceAdapter'
import type { EkoPrintStudio } from '@/sdk/EkoPrintStudio'

export interface WooCommerceHostBootOptions {
  editor: EkoPrintStudio
  /** Defaults from URL search params when omitted. */
  search?: string
  targetOrigin?: string
}

/**
 * Editor-side boot for WooCommerce embeds.
 * Reads public query params and opens a personalization session via the adapter.
 * Safe for iframe / modal / page hosts — no Core imports.
 */
export async function bootWooCommerceFromUrl(options: WooCommerceHostBootOptions) {
  const params = new URLSearchParams(options.search ?? (typeof window !== 'undefined' ? window.location.search : ''))
  const templateId = params.get('templateId') || ''
  const productId = params.get('productId') || ''
  const sessionId = params.get('sessionId') || undefined
  const embed = (params.get('embed') as CommerceEmbedMode | null) || 'modal'
  const autosaveMs = Number(params.get('autosaveMs') ?? 15000)
  const variationId = params.get('variationId') || undefined
  const hostOrigin = params.get('hostOrigin') || undefined

  if (!templateId && !sessionId) {
    return null
  }

  const adapter = new WooCommerceAdapter({
    editor: options.editor,
    defaultEmbedMode: embed,
    targetOrigin: options.targetOrigin ?? hostOrigin ?? '*',
  })

  const product: CommerceProductContext = {
    productId: productId || 'unknown',
    templateId: templateId || 'unknown',
    variationId,
    quantity: 1,
    hostMeta: { hostOrigin },
  }

  const record = await adapter.openEditor({
    product,
    sessionId,
    embedMode: embed,
    autosaveMs: Number.isFinite(autosaveMs) ? autosaveMs : 15000,
    hostWindow: typeof window !== 'undefined' ? window.parent : undefined,
  })

  return { adapter, record }
}
