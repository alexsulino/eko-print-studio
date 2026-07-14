<?php
declare(strict_types=1);

namespace EkoPrintStudio\Services;

use EkoPrintStudio\Config\Settings;
use WC_Order_Item_Product;

/**
 * Persists CommerceOrderPayload on order line items for admin reopen / production.
 */
final class OrderPersistence {
	public function register(): void {
		add_action('woocommerce_checkout_create_order_line_item', [$this, 'attach_to_order_item'], 10, 4);
		add_action('woocommerce_checkout_order_processed', [$this, 'order_created'], 10, 1);
	}

	/**
	 * @param array<string,mixed> $values
	 */
	public function attach_to_order_item(
		WC_Order_Item_Product $item,
		string $cart_item_key,
		array $values,
		\WC_Order $order
	): void {
		unset($cart_item_key);
		if (empty($values[Settings::CART_KEY]) || !is_array($values[Settings::CART_KEY])) {
			return;
		}

		$cart = $values[Settings::CART_KEY];
		$order_payload = [
			'schema'           => PayloadValidator::ORDER_SCHEMA,
			'orderId'          => (string) $order->get_id(),
			'lineItemId'       => '',
			'cart'             => $cart,
			'allowAdminReedit' => true,
		];

		$item->add_meta_data(Settings::ORDER_META_KEY, wp_json_encode($order_payload), true);
		$item->add_meta_data(Settings::ORDER_SESSION_KEY, (string) ($cart['sessionId'] ?? ''), true);
		$item->add_meta_data(Settings::ORDER_TEMPLATE_KEY, (string) ($cart['masterId'] ?? ''), true);
		$item->add_meta_data(Settings::ORDER_VERSION_KEY, PayloadValidator::CART_SCHEMA, true);

		if (!empty($cart['preview'])) {
			$item->add_meta_data(Settings::ORDER_PREVIEW_KEY, wp_json_encode($cart['preview']), true);
		}

		AuditLog::record('order.item.attached', [
			'order_id'  => $order->get_id(),
			'sessionId' => $cart['sessionId'] ?? '',
		]);
	}

	public function order_created(int $order_id): void {
		AuditLog::record('order.created', ['order_id' => $order_id]);
		do_action('eko_ps_order_created', $order_id);
	}
}
