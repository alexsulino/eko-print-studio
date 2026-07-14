<?php
declare(strict_types=1);

namespace EkoPrintStudio\Rest;

use EkoPrintStudio\Config\Settings;
use EkoPrintStudio\Services\AuditLog;
use EkoPrintStudio\Services\PayloadValidator;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Thin REST surface for host bridge ↔ store — not an editor API.
 */
final class Routes {
	public const NS = 'eko-print/v1';

	public function register(): void {
		add_action('rest_api_init', [$this, 'routes']);
	}

	public function routes(): void {
		register_rest_route(self::NS, '/product-context/(?P<id>\d+)', [
			'methods'             => 'GET',
			'callback'            => [$this, 'product_context'],
			'permission_callback' => '__return_true',
			'args'                => [
				'id' => ['required' => true, 'type' => 'integer'],
			],
		]);

		register_rest_route(self::NS, '/validate-cart', [
			'methods'             => 'POST',
			'callback'            => [$this, 'validate_cart'],
			'permission_callback' => [$this, 'can_shop'],
		]);

		register_rest_route(self::NS, '/add-to-cart', [
			'methods'             => 'POST',
			'callback'            => [$this, 'add_to_cart'],
			'permission_callback' => [$this, 'can_shop'],
		]);

		register_rest_route(self::NS, '/order-payload/(?P<order_id>\d+)/(?P<item_id>\d+)', [
			'methods'             => 'GET',
			'callback'            => [$this, 'order_payload'],
			'permission_callback' => [$this, 'can_manage_orders'],
		]);

		register_rest_route(self::NS, '/audit', [
			'methods'             => 'POST',
			'callback'            => [$this, 'audit'],
			'permission_callback' => [$this, 'can_shop'],
		]);
	}

	public function can_shop(): bool|WP_Error {
		$nonce = $_SERVER['HTTP_X_WP_NONCE'] ?? ''; // phpcs:ignore
		if (!wp_verify_nonce(sanitize_text_field((string) $nonce), 'wp_rest')) {
			return new WP_Error('eko_forbidden', __('Invalid nonce.', 'eko-print-studio'), ['status' => 403]);
		}
		return true;
	}

	public function can_manage_orders(): bool|WP_Error {
		if (!current_user_can('edit_shop_orders')) {
			return new WP_Error('eko_forbidden', __('Insufficient permissions.', 'eko-print-studio'), ['status' => 403]);
		}
		return true;
	}

	public function product_context(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$product_id = (int) $request['id'];
		$product = wc_get_product($product_id);
		if (!$product) {
			return new WP_Error('eko_not_found', __('Product not found.', 'eko-print-studio'), ['status' => 404]);
		}

		$template_id = (string) get_post_meta($product_id, Settings::META_TEMPLATE_ID, true);
		if ($template_id === '') {
			return new WP_Error('eko_no_template', __('No template associated with this product.', 'eko-print-studio'), ['status' => 400]);
		}

		$variation_id = (int) $request->get_param('variation_id');
		$quantity = max(1, (int) ($request->get_param('quantity') ?: 1));
		$attributes = $request->get_param('attributes');
		$attrs = [];
		if (is_array($attributes)) {
			foreach ($attributes as $k => $v) {
				$attrs[sanitize_text_field((string) $k)] = sanitize_text_field((string) $v);
			}
		}

		// Variation-level template override (prepared for dynamic templates).
		if ($variation_id > 0) {
			$variation_template = (string) get_post_meta($variation_id, Settings::META_TEMPLATE_ID, true);
			if ($variation_template !== '') {
				$template_id = $variation_template;
			}
		}

		$context = [
			'productId'   => (string) $product_id,
			'sku'         => (string) $product->get_sku(),
			'variationId' => $variation_id > 0 ? (string) $variation_id : '',
			'attributes'  => $attrs,
			'quantity'    => $quantity,
			'templateId'  => $template_id,
			'productName' => $product->get_name(),
			'currency'    => get_woocommerce_currency(),
			'unitPrice'   => (float) $product->get_price(),
			'locale'      => str_replace('_', '-', get_locale()),
			'hostMeta'    => [
				'storeUrl'     => home_url('/'),
				'environment'  => Settings::get('environment'),
				'customerId'   => get_current_user_id() ?: null,
				'templateMode' => (string) get_post_meta($product_id, Settings::META_TEMPLATE_MODE, true) ?: 'single',
			],
		];

		AuditLog::record('customization.started', ['productId' => $product_id, 'templateId' => $template_id]);

		return new WP_REST_Response([
			'product'    => $context,
			'sessionId'  => sanitize_text_field((string) ($request->get_param('session_id') ?: '')),
			'config'     => Settings::public_config(),
		], 200);
	}

	public function validate_cart(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$body = $request->get_json_params();
		$result = PayloadValidator::validate_cart($body['cart'] ?? $body);
		if (!$result['ok']) {
			return new WP_Error('eko_invalid_cart', $result['error'] ?? 'Invalid', ['status' => 400]);
		}
		return new WP_REST_Response(['ok' => true, 'cart' => $result['payload']], 200);
	}

	public function add_to_cart(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$body = $request->get_json_params();
		$result = PayloadValidator::validate_cart($body['cart'] ?? null);
		if (!$result['ok'] || empty($result['payload'])) {
			return new WP_Error('eko_invalid_cart', $result['error'] ?? 'Invalid', ['status' => 400]);
		}

		$cart = $result['payload'];
		$product_id = (int) ($cart['product']['productId'] ?? 0);
		$variation_id = (int) ($cart['product']['variationId'] ?? 0);
		$quantity = max(1, (int) ($cart['product']['quantity'] ?? 1));

		if ($product_id <= 0 || !wc_get_product($product_id)) {
			return new WP_Error('eko_bad_product', __('Invalid product.', 'eko-print-studio'), ['status' => 400]);
		}

		$cart_item_data = [
			Settings::CART_KEY => $cart,
			'unique_key'       => md5((string) $cart['sessionId']),
		];

		$attributes = [];
		if (!empty($cart['product']['attributes']) && is_array($cart['product']['attributes'])) {
			$attributes = $cart['product']['attributes'];
		}

		$key = WC()->cart->add_to_cart($product_id, $quantity, $variation_id, $attributes, $cart_item_data);
		if (!$key) {
			return new WP_Error('eko_cart_failed', __('Could not add to cart.', 'eko-print-studio'), ['status' => 500]);
		}

		AuditLog::record('cart.updated', ['sessionId' => $cart['sessionId'], 'cart_item_key' => $key]);

		return new WP_REST_Response([
			'ok'          => true,
			'cartItemKey' => $key,
			'cartUrl'     => wc_get_cart_url(),
			'sessionId'   => $cart['sessionId'],
		], 200);
	}

	public function order_payload(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$order_id = (int) $request['order_id'];
		$item_id = (int) $request['item_id'];
		$order = wc_get_order($order_id);
		if (!$order) {
			return new WP_Error('eko_not_found', __('Order not found.', 'eko-print-studio'), ['status' => 404]);
		}

		foreach ($order->get_items() as $item) {
			if ((int) $item->get_id() !== $item_id) {
				continue;
			}
			$raw = $item->get_meta(Settings::ORDER_META_KEY, true);
			$decoded = is_string($raw) ? json_decode($raw, true) : null;
			if (!is_array($decoded)) {
				return new WP_Error('eko_no_payload', __('No personalization on this item.', 'eko-print-studio'), ['status' => 404]);
			}
			$decoded['recoveredAt'] = gmdate('c');
			return new WP_REST_Response($decoded, 200);
		}

		return new WP_Error('eko_not_found', __('Line item not found.', 'eko-print-studio'), ['status' => 404]);
	}

	public function audit(WP_REST_Request $request): WP_REST_Response {
		$body = $request->get_json_params();
		$event = sanitize_text_field((string) ($body['event'] ?? 'unknown'));
		$context = is_array($body['context'] ?? null) ? $body['context'] : [];
		AuditLog::record($event, $context);
		return new WP_REST_Response(['ok' => true], 200);
	}
}
