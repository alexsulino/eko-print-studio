<?php
declare(strict_types=1);

namespace EkoPrintStudio\Adapters;

/**
 * Marker namespace — the production JS adapter lives in the main Eko Print Studio package
 * (`src/adapters/woocommerce`). This plugin only hosts WooCommerce ↔ postMessage/REST glue.
 *
 * Future storefronts (Shopify, Magento, …) get their own thin plugins with the same pattern.
 */
final class Bridge {
	public const PLATFORM = 'woocommerce';
	public const CART_CONTRACT = 'eko.commerce.cart/1';
	public const ORDER_CONTRACT = 'eko.commerce.order/1';
}
