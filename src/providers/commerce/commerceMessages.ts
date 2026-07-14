/**
 * Platform-neutral HostBridge / postMessage types for CommerceProvider.
 * Store-specific providers may ALSO emit legacy aliases (e.g. woocommerce.*).
 */
export const commerceMessages = {
  channel: 'eko.commerce',
  cartAdd: 'commerce.cart.add',
  cartReady: 'commerce.cart.ready',
  orderAttach: 'commerce.order.attach',
  editorClose: 'commerce.editor.close',
  embedRequest: 'embed.request',
  embedClose: 'embed.close',
  previewGenerated: 'commerce.preview.generated',
} as const
