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
4. Edit a product → choose **Template Master** from the dropdown (names only; IDs stay internal).
5. Optional: **WooCommerce → Eko Print Studio → Sincronizar templates do editor** to refresh the catalog from `{editor_url}/templates/catalog.json`.
6. Visit the product → **Personalizar**.

Flush permalinks once after activation (Settings → Permalinks → Save) so `/eko-print-studio/editor/` works.

## Merchant flow

1. Customer clicks **Personalizar**
2. Host bridge loads product context via REST (`/eko-print/v1/product-context/{id}`) — inclui `persistence.restUrl` + token
3. Editor opens with query params + persistence credentials
4. SDK `openPersonalization()` persiste sessão via `SessionPersistenceProvider` → REST `/sessions`
5. Autosave / finalize geram `preview.png` via `ExportProvider` e salvam no mesmo `saveSession`
6. Cart payload posted to parent → REST `add-to-cart` (mesma sessão atualiza a linha)
7. PDP mostra miniatura oficial + botão **Editar Personalização** (retoma `sessionId`)
8. Carrinho / checkout / pedido reutilizam o mesmo `preview` (sem regenerar PNG)
9. Admin **Reabrir Personalização** loads `CommerceOrderPayload` and reopens the editor with `sessionId`

## Contracts persisted

| Where | Key | Contract |
|-------|-----|----------|
| Cart item | `eko_personalization` | `eko.commerce.cart/1` |
| Order item | `_eko_commerce_order` | `eko.commerce.order/1` |
| Session CPT | `_eko_session_record` / `_eko_session_document` | JSON via `JsonMetaPersistence` only (ADR-0002) |

## JSON meta (ADR-0002)

Never call `update_post_meta(..., $json)` or `add_meta_data(..., wp_json_encode(...))` for JSON.
Use `JsonMetaPersistence` — WordPress `wp_unslash` otherwise corrupts escapes. See repo root `CONTRIBUTING.md`.

## Security

- REST gated by `X-WP-Nonce` (`wp_rest`)
- Order re-open requires `edit_shop_orders`
- Incoming cart payloads validated + sanitized (`PayloadValidator`)
- Never trust browser JSON blindly; size-capped

## Extensibility

WordPress action `eko_ps_event` receives audit events.  
Same commerce contracts power future Shopify / Magento / Nuvemshop plugins.
