<?php
declare(strict_types=1);

namespace EkoPrintStudio\Rest;

use EkoPrintStudio\Config\Settings;
use EkoPrintStudio\Config\TemplateCatalog;
use EkoPrintStudio\Services\AuditLog;
use EkoPrintStudio\Services\PayloadValidator;
use EkoPrintStudio\Services\SessionRepository;
use EkoPrintStudio\Services\SessionToken;
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
		add_filter('rest_pre_serve_request', [$this, 'cors'], 15, 4);
	}

	/**
	 * Allow the editor origin (settings) to call session persistence cross-origin.
	 *
	 * @param bool             $served
	 * @param WP_REST_Response $result
	 * @param WP_REST_Request  $request
	 * @param \WP_REST_Server  $server
	 */
	public function cors($served, $result, $request, $server) {
		unset($result, $server);
		$route = (string) $request->get_route();
		if (strpos($route, '/' . self::NS) !== 0) {
			return $served;
		}
		$origin = (string) Settings::get('target_origin', '*');
		$request_origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
		if ($origin === '*' && $request_origin !== '') {
			header('Access-Control-Allow-Origin: ' . $request_origin);
		} elseif ($origin !== '*' && $request_origin === $origin) {
			header('Access-Control-Allow-Origin: ' . $origin);
		} elseif ($origin === '*') {
			header('Access-Control-Allow-Origin: *');
		}
		header('Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS');
		header('Access-Control-Allow-Headers: Content-Type, X-Eko-Persistence-Token, X-WP-Nonce');
		header('Access-Control-Max-Age: 600');
		if ($request->get_method() === 'OPTIONS') {
			status_header(200);
			exit;
		}
		return $served;
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

		register_rest_route(self::NS, '/templates', [
			'methods'             => 'GET',
			'callback'            => [$this, 'templates'],
			'permission_callback' => [$this, 'can_manage_products'],
		]);

		register_rest_route(self::NS, '/sessions', [
			'methods'             => 'GET',
			'callback'            => [$this, 'list_sessions'],
			'permission_callback' => [$this, 'can_persist'],
		]);

		register_rest_route(self::NS, '/sessions/(?P<id>[a-zA-Z0-9_-]+)', [
			[
				'methods'             => 'GET',
				'callback'            => [$this, 'get_session'],
				'permission_callback' => [$this, 'can_persist'],
			],
			[
				'methods'             => 'PUT',
				'callback'            => [$this, 'put_session'],
				'permission_callback' => [$this, 'can_persist'],
			],
			[
				'methods'             => 'DELETE',
				'callback'            => [$this, 'delete_session'],
				'permission_callback' => [$this, 'can_persist'],
			],
		]);

		register_rest_route(self::NS, '/documents/(?P<id>[a-zA-Z0-9_-]+)', [
			[
				'methods'             => 'GET',
				'callback'            => [$this, 'get_document'],
				'permission_callback' => [$this, 'can_persist'],
			],
			[
				'methods'             => 'PUT',
				'callback'            => [$this, 'put_document'],
				'permission_callback' => [$this, 'can_persist'],
			],
		]);
	}

	public function can_persist(): bool|WP_Error {
		$token = sanitize_text_field((string) ($_SERVER['HTTP_X_EKO_PERSISTENCE_TOKEN'] ?? ''));
		if ($token !== '' && SessionToken::validate($token)) {
			SessionToken::touch($token);
			return true;
		}
		// Same-origin host bridge fallback.
		$nonce = $_SERVER['HTTP_X_WP_NONCE'] ?? ''; // phpcs:ignore
		if (wp_verify_nonce(sanitize_text_field((string) $nonce), 'wp_rest')) {
			return true;
		}
		return new WP_Error('eko_forbidden', __('Invalid persistence token.', 'eko-print-studio'), ['status' => 403]);
	}

	public function list_sessions(WP_REST_Request $request): WP_REST_Response {
		$product_id = sanitize_text_field((string) ($request->get_param('productId') ?: ''));
		return new WP_REST_Response([
			'sessions' => SessionRepository::list_by_product($product_id !== '' ? $product_id : null),
		]);
	}

	public function get_session(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$session_id = sanitize_text_field((string) $request['id']);
		$hit = SessionRepository::get($session_id);
		if (!$hit) {
			return new WP_Error('eko_not_found', __('Session not found.', 'eko-print-studio'), ['status' => 404]);
		}
		return new WP_REST_Response($hit, 200);
	}

	public function put_session(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$body = $request->get_json_params();
		if (!is_array($body) || ($body['schema'] ?? '') !== 'eko.persistence.session/1') {
			return new WP_Error('eko_invalid', __('Invalid session payload.', 'eko-print-studio'), ['status' => 400]);
		}
		$record = $body['record'] ?? null;
		if (!is_array($record) || empty($record['id'])) {
			return new WP_Error('eko_invalid', __('Missing session record.', 'eko-print-studio'), ['status' => 400]);
		}
		$document_json = isset($body['documentJson']) ? (string) $body['documentJson'] : null;
		if (is_string($document_json) && strlen($document_json) > 2000000) {
			return new WP_Error('eko_too_large', __('Document too large.', 'eko-print-studio'), ['status' => 413]);
		}
		$saved = SessionRepository::upsert($record, $document_json);
		AuditLog::record('session.saved', ['sessionId' => $saved['id'] ?? '']);
		return new WP_REST_Response(['record' => $saved], 200);
	}

	public function delete_session(WP_REST_Request $request): WP_REST_Response {
		$session_id = sanitize_text_field((string) $request['id']);
		SessionRepository::delete($session_id);
		return new WP_REST_Response(['ok' => true], 200);
	}

	public function get_document(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$document_id = sanitize_text_field((string) $request['id']);
		$json = SessionRepository::get_document($document_id);
		if ($json === null) {
			return new WP_Error('eko_not_found', __('Document not found.', 'eko-print-studio'), ['status' => 404]);
		}
		return new WP_REST_Response([
			'schema'       => 'eko.persistence.document/1',
			'documentJson' => $json,
		]);
	}

	public function put_document(WP_REST_Request $request): WP_REST_Response|WP_Error {
		$body = $request->get_json_params();
		$document_id = sanitize_text_field((string) $request['id']);
		$document_json = (string) ($body['documentJson'] ?? '');
		if ($document_json === '') {
			return new WP_Error('eko_invalid', __('Missing documentJson.', 'eko-print-studio'), ['status' => 400]);
		}
		if (strlen($document_json) > 2000000) {
			return new WP_Error('eko_too_large', __('Document too large.', 'eko-print-studio'), ['status' => 413]);
		}
		SessionRepository::save_document($document_id, $document_json);
		return new WP_REST_Response([
			'schema'       => 'eko.persistence.document/1',
			'documentJson' => $document_json,
		]);
	}

	public function can_manage_products(): bool|WP_Error {
		if (!current_user_can('edit_products')) {
			return new WP_Error('eko_forbidden', __('Insufficient permissions.', 'eko-print-studio'), ['status' => 403]);
		}
		return true;
	}

	public function templates(): WP_REST_Response {
		return new WP_REST_Response([
			'schema'    => TemplateCatalog::SCHEMA,
			'templates' => TemplateCatalog::published(),
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

		$token = SessionToken::issue($product_id);

		return new WP_REST_Response([
			'product'    => $context,
			'sessionId'  => sanitize_text_field((string) ($request->get_param('session_id') ?: '')),
			'config'     => Settings::public_config(),
			'persistence' => [
				'restUrl' => esc_url_raw(rest_url(self::NS)),
				'token'   => $token,
				'backend' => 'woocommerce',
			],
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

		$session_id = (string) ($cart['sessionId'] ?? '');
		$customization_id = (string) ($cart['customizationId'] ?? $session_id);
		$cart['customizationId'] = $customization_id !== '' ? $customization_id : $session_id;
		$cart['lifecycleStatus'] = 'cart_attached';

		$cart_item_data = [
			Settings::CART_KEY => $cart,
			'unique_key'       => md5($customization_id !== '' ? $customization_id : $session_id),
		];

		$attributes = [];
		if (!empty($cart['product']['attributes']) && is_array($cart['product']['attributes'])) {
			$attributes = $cart['product']['attributes'];
		}

		// Reuse the same cart line when editing an existing customization / session.
		if (($session_id !== '' || $customization_id !== '') && WC()->cart) {
			foreach (WC()->cart->get_cart() as $existing_key => $existing_item) {
				$existing_payload = $existing_item[Settings::CART_KEY] ?? null;
				if (!is_array($existing_payload)) {
					continue;
				}
				$same_session = $session_id !== '' && (string) ($existing_payload['sessionId'] ?? '') === $session_id;
				$same_custom =
					$customization_id !== '' &&
					(string) ($existing_payload['customizationId'] ?? $existing_payload['sessionId'] ?? '') === $customization_id;
				if ($same_session || $same_custom) {
					WC()->cart->cart_contents[ $existing_key ][Settings::CART_KEY] = $cart;
					WC()->cart->cart_contents[ $existing_key ]['quantity'] = $quantity;
					WC()->cart->set_session();
					self::mark_customization_cart_attached($session_id, $cart);
					AuditLog::record('cart.updated', [
						'sessionId'       => $session_id,
						'customizationId' => $customization_id,
						'cart_item_key'   => $existing_key,
						'replaced'        => true,
					]);
					return new WP_REST_Response([
						'ok'              => true,
						'cartItemKey'     => $existing_key,
						'cartUrl'         => wc_get_cart_url(),
						'sessionId'       => $session_id,
						'customizationId' => $customization_id,
						'lifecycleStatus' => 'cart_attached',
						'replaced'        => true,
					], 200);
				}
			}
		}

		$key = WC()->cart->add_to_cart($product_id, $quantity, $variation_id, $attributes, $cart_item_data);
		if (!$key) {
			return new WP_Error('eko_cart_failed', __('Could not add to cart.', 'eko-print-studio'), ['status' => 500]);
		}

		self::mark_customization_cart_attached($session_id, $cart);
		AuditLog::record('cart.updated', [
			'sessionId'       => $session_id,
			'customizationId' => $customization_id,
			'cart_item_key'   => $key,
		]);

		return new WP_REST_Response([
			'ok'              => true,
			'cartItemKey'     => $key,
			'cartUrl'         => wc_get_cart_url(),
			'sessionId'       => $session_id,
			'customizationId' => $customization_id,
			'lifecycleStatus' => 'cart_attached',
		], 200);
	}

	/**
	 * @param array<string,mixed> $cart
	 */
	private static function mark_customization_cart_attached(string $session_id, array $cart): void {
		if ($session_id === '') {
			return;
		}
		$hit = SessionRepository::get($session_id);
		if (!$hit || !is_array($hit['record'] ?? null)) {
			return;
		}
		$record = $hit['record'];
		$record['lifecycle'] = 'cart_attached';
		$record['cartAttachedAt'] = gmdate('c');
		$record['customizationId'] = (string) ($cart['customizationId'] ?? $session_id);
		SessionRepository::upsert($record, $hit['documentJson'] ?? null);
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
