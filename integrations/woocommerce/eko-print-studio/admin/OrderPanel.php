<?php
declare(strict_types=1);

namespace EkoPrintStudio\Admin;

use EkoPrintStudio\Config\Settings;

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
		unset($product);
		if (!is_object($item) || !method_exists($item, 'get_meta')) {
			return;
		}

		$raw = $item->get_meta(Settings::ORDER_META_KEY, true);
		if (!$raw) {
			return;
		}

		$payload = is_string($raw) ? json_decode($raw, true) : null;
		if (!is_array($payload)) {
			return;
		}

		$cart = is_array($payload['cart'] ?? null) ? $payload['cart'] : [];
		$session_id = (string) ($cart['sessionId'] ?? $item->get_meta(Settings::ORDER_SESSION_KEY, true));
		$template_id = (string) ($cart['masterId'] ?? $item->get_meta(Settings::ORDER_TEMPLATE_KEY, true));
		$preview = is_array($cart['preview'] ?? null) ? $cart['preview'] : [];
		if ($preview === []) {
			$raw_preview = $item->get_meta(Settings::ORDER_PREVIEW_KEY, true);
			$decoded_preview = is_string($raw_preview) ? json_decode($raw_preview, true) : null;
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

		include EKO_PS_PATH . 'views/admin-order-item.php';
	}
}
