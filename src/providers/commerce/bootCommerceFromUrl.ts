import type { CommerceEmbedMode, CommerceProductContext } from '@/types/commerce'
import type { CommerceProvider } from '@/core/platform/providers'
import type { EkoPrintStudio } from '@/sdk/EkoPrintStudio'
import { createCommerceProvider } from './createCommerceProvider'

export interface CommerceHostBootOptions {
  editor: EkoPrintStudio
  /** Defaults from URL search params when omitted. */
  search?: string
  targetOrigin?: string
  /**
   * Override platform detection. Default: URL `platform` / `commerce`,
   * else `woocommerce` for backward-compatible embeds.
   */
  platform?: string
}

export interface CommerceHostBootResult {
  provider: CommerceProvider
  record: Awaited<ReturnType<CommerceProvider['start']>>
}

/**
 * Platform-agnostic editor boot for storefront embeds.
 * Reads public query params, resolves CommerceProvider, prepare + start.
 * App.tsx must call this — never import a concrete Woo/Shopify class.
 */
export async function bootCommerceFromUrl(
  options: CommerceHostBootOptions,
): Promise<CommerceHostBootResult | null> {
  const params = new URLSearchParams(
    options.search ?? (typeof window !== 'undefined' ? window.location.search : ''),
  )
  const templateId = params.get('templateId') || ''
  const productId = params.get('productId') || ''
  const sessionId = params.get('sessionId') || params.get('customizationId') || undefined
  const embed = (params.get('embed') as CommerceEmbedMode | null) || 'modal'
  const autosaveMs = Number(params.get('autosaveMs') ?? 15000)
  const variationId = params.get('variationId') || undefined
  const hostOrigin = params.get('hostOrigin') || undefined
  const restUrl = params.get('restUrl') || undefined
  const persistenceToken = params.get('persistenceToken') || undefined
  const platform =
    options.platform ||
    params.get('platform') ||
    params.get('commerce') ||
    'woocommerce'

  if (!templateId && !sessionId) {
    return null
  }

  const provider = createCommerceProvider({
    platform,
    editor: options.editor,
    defaultEmbedMode: embed,
    targetOrigin: options.targetOrigin ?? hostOrigin ?? '*',
  })

  await provider.prepare?.({
    sessionId,
    customizationId: params.get('customizationId') || sessionId,
    embedMode: embed,
    autosaveMs: Number.isFinite(autosaveMs) ? autosaveMs : 15000,
    restUrl: restUrl || undefined,
    persistenceToken: persistenceToken || undefined,
    hostOrigin: hostOrigin || undefined,
    hostMeta: { restUrl },
  })

  options.editor.configureCommerce(provider)

  const product: CommerceProductContext = {
    productId: productId || 'unknown',
    templateId: templateId || 'unknown',
    variationId,
    quantity: 1,
    hostMeta: { hostOrigin, restUrl, platform },
  }

  const record = await provider.start({
    product,
    sessionId,
    customizationId: params.get('customizationId') || sessionId,
    embedMode: embed,
    autosaveMs: Number.isFinite(autosaveMs) ? autosaveMs : 15000,
    hostWindow: typeof window !== 'undefined' ? window.parent : undefined,
    targetOrigin: options.targetOrigin ?? hostOrigin ?? '*',
  })

  return { provider, record }
}
