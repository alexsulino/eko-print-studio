# WooCommerce CommerceProvider (TypeScript)

`WooCommerceCommerceProvider` is the official **CommerceProvider** for WooCommerce.
It runs inside the **editor app**. The installable WordPress plugin lives at:

`integrations/woocommerce/eko-print-studio/`

```text
Woo storefront (plugin host-bridge.js)
  → postMessage / REST
Editor app
  → bootCommerceFromUrl
  → createCommerceProvider({ platform: 'woocommerce' })
  → WooCommerceCommerceProvider
  → EkoPrintStudio SDK
  → Core
```

The SDK / App never import this folder directly for boot — only the commerce factory does.

Deprecated aliases: `WooCommerceAdapter`, `bootWooCommerceFromUrl`.
