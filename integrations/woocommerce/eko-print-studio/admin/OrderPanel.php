<?php
declare(strict_types=1);

namespace EkoPrintStudio\Admin;

use EkoPrintStudio\Config\Settings;
use EkoPrintStudio\Services\OrderPersistence;

/**
 * Order admin panel — reopen personalization via SDK host (no PHP editing).
 */
final class OrderPanel {
	public function register(): void {
		add_action('woocommerce_after_order_itemmeta', [$this, 'render_item_panel'], 10, 3);
		add_action('admin_enqueue_scripts', [$this, 'assets']);
	}

	public function assets(string $hook): void {
		if ($hook !== 'post.php' && $hook !== 'woocommerce_page_wc-orders') {
			return;
		}
		wp_enqueue_style(
			'eko-ps-admin',
			EKO_PS_URL . 'assets/css/admin.css',
			[],
			EKO_PS_VERSION
		);
		wp_enqueue_script(
			'eko-ps-admin-reopen',
			EKO_PS_URL . 'assets/js/admin-reopen.js',
			[],
			EKO_PS_VERSION,
			true
		);
		wp_localize_script('eko-ps-admin-reopen', 'EkoPsAdmin', [
			'editorUrl'    => Settings::get('editor_url'),
			'embedMode'    => Settings::get('embed_mode'),
			'targetOrigin' => Settings::get('target_origin'),
			'restUrl'      => esc_url_raw(rest_url('eko-print/v1')),
			'nonce'        => wp_create_nonce('wp_rest'),
		]);
	}

	/**
	 * @param \WC_Order_Item $item
	 * @param \WC_Product|bool $product
	 */
	public function render_item_panel(int $item_id, $item, $product): void {
		if (!is_object($item) || !method_exists($item, 'get_meta')) {
			return;
		}

		$raw = $item->get_meta(Settings::ORDER_META_KEY, true);
		$payload = OrderPersistence::decode_order_meta($raw);

		// Fallback: scalar metas alone (same ids the cart edit button uses).
		if ($payload === null) {
			$payload = $this->payload_from_scalar_metas($item);
		}
		if ($payload === null) {
			return;
		}

		$cart = is_array($payload['cart'] ?? null) ? $payload['cart'] : [];
		$customization_id = (string) (
			$cart['customizationId']
				?? $item->get_meta(Settings::ORDER_CUSTOMIZATION_KEY, true)
				?? ''
		);
		$session_id = (string) ($cart['sessionId'] ?? $item->get_meta(Settings::ORDER_SESSION_KEY, true) ?? '');
		if ($customization_id === '' && $session_id !== '') {
			$customization_id = $session_id;
		}
		if ($session_id === '' && $customization_id !== '') {
			$session_id = $customization_id;
		}
		if ($customization_id === '' && $session_id === '') {
			return;
		}

		$template_id = (string) ($cart['masterId'] ?? $item->get_meta(Settings::ORDER_TEMPLATE_KEY, true) ?? '');
		// Same product id source chain as cart edit button.
		$product_id = '';
		if (is_object($product) && method_exists($product, 'get_id')) {
			$product_id = (string) $product->get_id();
		}
		if ($product_id === '' && !empty($cart['product']['productId'])) {
			$product_id = (string) $cart['product']['productId'];
		}
		if ($product_id === '' && method_exists($item, 'get_product_id')) {
			$product_id = (string) $item->get_product_id();
		}
		$preview = is_array($cart['preview'] ?? null) ? $cart['preview'] : [];
		if ($preview === []) {
			$raw_preview = $item->get_meta(Settings::ORDER_PREVIEW_KEY, true);
			$decoded_preview = OrderPersistence::decode_order_meta($raw_preview);
			if (is_array($decoded_preview)) {
				$preview = $decoded_preview;
			}
		}
		$version = (string) ($item->get_meta(Settings::ORDER_VERSION_KEY, true) ?: ($cart['schema'] ?? ''));
		$saved_at = (string) ($cart['savedAt'] ?? '');
		$status = !empty($payload['allowAdminReedit']) ? 'reopenable' : 'locked';

		$order_id = 0;
		if (method_exists($item, 'get_order_id')) {
			$order_id = (int) $item->get_order_id();
		}
		if ($order_id <= 0 && method_exists($item, 'get_order')) {
			$order = $item->get_order();
			if (is_object($order) && method_exists($order, 'get_id')) {
				$order_id = (int) $order->get_id();
			}
		}

		include EKO_PS_PATH . 'views/admin-order-item.php';
	}

	/**
	 * Rebuild a minimal order payload view from scalar order-item metas.
	 * Same identity fields used by cart "Editar Personalização".
	 *
	 * @param object $item
	 * @return array<string,mixed>|null
	 */
	private function payload_from_scalar_metas(object $item): ?array {
		if (!method_exists($item, 'get_meta')) {
			return null;
		}
		$session_id = (string) $item->get_meta(Settings::ORDER_SESSION_KEY, true);
		$customization_id = (string) $item->get_meta(Settings::ORDER_CUSTOMIZATION_KEY, true);
		if ($customization_id === '' && $session_id === '') {
			return null;
		}
		if ($customization_id === '') {
			$customization_id = $session_id;
		}
		if ($session_id === '') {
			$session_id = $customization_id;
		}
		$preview = [];
		$raw_preview = $item->get_meta(Settings::ORDER_PREVIEW_KEY, true);
		$decoded_preview = OrderPersistence::decode_order_meta($raw_preview);
		if (is_array($decoded_preview)) {
			$preview = $decoded_preview;
		}
		return [
			'schema'           => 'eko.commerce.order/1',
			'allowAdminReedit' => true,
			'cart'             => [
				'sessionId'       => $session_id,
				'customizationId' => $customization_id,
				'masterId'        => (string) $item->get_meta(Settings::ORDER_TEMPLATE_KEY, true),
				'preview'         => $preview,
				'lifecycleStatus' => (string) ($item->get_meta(Settings::ORDER_LIFECYCLE_KEY, true) ?: 'ordered'),
			],
		];
	}
}
