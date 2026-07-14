# WooCommerce Adapter (TypeScript)

This package adapter (`src/adapters/woocommerce`) is consumed by the **editor app**.

The installable WordPress plugin lives at:

`integrations/woocommerce/eko-print-studio/`

```text
Woo storefront (plugin host-bridge.js)
  → postMessage / REST
Editor app (bootWooCommerceFromUrl + WooCommerceAdapter)
  → EkoPrintStudio SDK
  → Core
```

Neither the plugin nor this adapter import Core modules.
