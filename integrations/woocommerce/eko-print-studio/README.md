# Eko Print Studio for WooCommerce (v0.8.1)

Thin **production plugin** that connects WooCommerce to the Eko Print Studio SDK.

```text
WooCommerce
  → this plugin (PHP + host-bridge.js)
  → WooCommerce Adapter / bootFromUrl (TypeScript package)
  → Eko Print Studio SDK
  → Core
```

The plugin **never** imports Core. It does **not** implement the editor.

## Install

1. Copy `integrations/woocommerce/eko-print-studio/` into `wp-content/plugins/eko-print-studio/`.
2. Activate **Eko Print Studio for WooCommerce**.
3. Open **WooCommerce → Eko Print Studio** and set **URL do Editor** (your Vite/production app URL).
4. Edit a product → set **Eko Template ID** (e.g. `template_caneca-brasil`).
5. Visit the product → **Personalizar**.

Flush permalinks once after activation (Settings → Permalinks → Save) so `/eko-print-studio/editor/` works.

## Merchant flow

1. Customer clicks **Personalizar**
2. Host bridge loads product context via REST (`/eko-print/v1/product-context/{id}`)
3. Editor opens (modal / iframe / page) with query params
4. SDK `openPersonalization()` / `finalizePersonalization()`
5. Cart payload posted to parent → REST `add-to-cart`
6. Checkout copies payload to order line meta
7. Admin **Reabrir Personalização** loads `CommerceOrderPayload` and reopens the editor with `sessionId`

## Contracts persisted

| Where | Key | Contract |
|-------|-----|----------|
| Cart item | `eko_personalization` | `eko.commerce.cart/1` |
| Order item | `_eko_commerce_order` | `eko.commerce.order/1` |

## Security

- REST gated by `X-WP-Nonce` (`wp_rest`)
- Order re-open requires `edit_shop_orders`
- Incoming cart payloads validated + sanitized (`PayloadValidator`)
- Never trust browser JSON blindly; size-capped

## Extensibility

WordPress action `eko_ps_event` receives audit events.  
Same commerce contracts power future Shopify / Magento / Nuvemshop plugins.
