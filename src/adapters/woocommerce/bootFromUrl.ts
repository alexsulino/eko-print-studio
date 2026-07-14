import type { EkoPrintStudio } from '@/sdk/EkoPrintStudio'
import { bootCommerceFromUrl } from '@/providers/commerce/bootCommerceFromUrl'
import { WooCommerceCommerceProvider } from './WooCommerceCommerceProvider'
import { WooCommerceAdapter } from './WooCommerceAdapter'

export interface WooCommerceHostBootOptions {
  editor: EkoPrintStudio
  /** Defaults from URL search params when omitted. */
  search?: string
  targetOrigin?: string
}

/**
 * @deprecated Prefer {@link bootCommerceFromUrl} from `@/providers/commerce`.
 * Editor-side boot for WooCommerce embeds — thin wrapper for backward compatibility.
 */
export async function bootWooCommerceFromUrl(options: WooCommerceHostBootOptions) {
  const result = await bootCommerceFromUrl({
    ...options,
    platform: 'woocommerce',
  })
  if (!result) return null

  const provider =
    result.provider instanceof WooCommerceCommerceProvider
      ? result.provider
      : new WooCommerceCommerceProvider({ editor: options.editor })

  const adapter = new WooCommerceAdapter({
    editor: options.editor,
    provider,
    targetOrigin: options.targetOrigin,
  })

  return { adapter, provider, record: result.record }
}
