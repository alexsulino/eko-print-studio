<?php
declare(strict_types=1);

namespace EkoPrintStudio\Services;

use EkoPrintStudio\Config\Settings;

/**
 * Persists CommerceCartPayload on cart items — no editor / export logic.
 * Renders official ExportProvider preview when fidelity is raster.
 */
final class CartPersistence {
	public function register(): void {
		add_filter('woocommerce_add_cart_item_data', [$this, 'add_cart_item_data'], 10, 3);
		add_filter('woocommerce_get_cart_item_from_session', [$this, 'from_session'], 10, 2);
		add_filter('woocommerce_get_item_data', [$this, 'display_item_data'], 10, 2);
		add_filter('woocommerce_cart_item_thumbnail', [$this, 'cart_thumbnail'], 10, 3);
		add_filter('woocommerce_cart_item_name', [$this, 'cart_item_name'], 10, 3);
		add_action('woocommerce_before_calculate_totals', [$this, 'maybe_block_without_custom'], 20);
	}

	/**
	 * @param array<string,mixed> $cart_item_data
	 * @return array<string,mixed>
	 */
	public function add_cart_item_data(array $cart_item_data, int $product_id, int $variation_id): array {
		if (empty($_REQUEST[Settings::CART_KEY])) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return $cart_item_data;
		}

		$raw = wp_unslash((string) $_REQUEST[Settings::CART_KEY]); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$decoded = json_decode($raw, true);
		$result = PayloadValidator::validate_cart($decoded);
		if (!$result['ok'] || empty($result['payload'])) {
			AuditLog::record('cart.payload.rejected', ['error' => $result['error'] ?? 'unknown', 'product_id' => $product_id]);
			return $cart_item_data;
		}

		$cart_item_data[Settings::CART_KEY] = $result['payload'];
		$unique = (string) ($result['payload']['customizationId'] ?? $result['payload']['sessionId'] ?? '');
		$cart_item_data['unique_key'] = md5($unique !== '' ? $unique : (string) $result['payload']['sessionId']);

		AuditLog::record('cart.updated', [
			'sessionId'       => $result['payload']['sessionId'],
			'customizationId' => $result['payload']['customizationId'] ?? $result['payload']['sessionId'],
			'product_id'      => $product_id,
			'variation'       => $variation_id,
		]);

		return $cart_item_data;
	}

	/**
	 * @param array<string,mixed> $cart_item
	 * @param array<string,mixed> $values
	 * @return array<string,mixed>
	 */
	public function from_session(array $cart_item, array $values): array {
		if (isset($values[Settings::CART_KEY])) {
			$cart_item[Settings::CART_KEY] = $values[Settings::CART_KEY];
		}
		return $cart_item;
	}

	/**
	 * @param array<int,array<string,string>> $item_data
	 * @param array<string,mixed> $cart_item
	 * @return array<int,array<string,string>>
	 */
	public function display_item_data(array $item_data, array $cart_item): array {
		if (empty($cart_item[Settings::CART_KEY]) || !is_array($cart_item[Settings::CART_KEY])) {
			return $item_data;
		}
		$payload = $cart_item[Settings::CART_KEY];
		$item_data[] = [
			'key'   => __('Personalização', 'eko-print-studio'),
			'value' => esc_html__('Personalizado', 'eko-print-studio'),
		];
		$item_data[] = [
			'key'   => __('Arte', 'eko-print-studio'),
			'value' => esc_html(PreviewPresenter::document_name($payload)),
		];
		return $item_data;
	}

	/**
	 * @param string $name
	 * @param array<string,mixed> $cart_item
	 */
	public function cart_item_name(string $name, array $cart_item, string $cart_item_key): string {
		unset($cart_item_key);
		if (empty($cart_item[Settings::CART_KEY]) || !is_array($cart_item[Settings::CART_KEY])) {
			return $name;
		}
		$payload = $cart_item[Settings::CART_KEY];
		$art = PreviewPresenter::document_name($payload);
		$badge = '<span class="eko-ps-cart-preview-badge">' . esc_html__('Personalizado', 'eko-print-studio') . '</span>';
		$customization_id = (string) ($payload['customizationId'] ?? $payload['sessionId'] ?? '');
		$session_id = (string) ($payload['sessionId'] ?? $customization_id);
		$product_id = (string) ($payload['product']['productId'] ?? $cart_item['product_id'] ?? '');
		$edit = '';
		if ($customization_id !== '' && $product_id !== '') {
			$edit = sprintf(
				' <button type="button" class="button eko-ps-edit-customization" data-eko-edit-customization data-customization-id="%1$s" data-session-id="%2$s" data-product-id="%3$s">%4$s</button>',
				esc_attr($customization_id),
				esc_attr($session_id),
				esc_attr($product_id),
				esc_html__('Editar Personalização', 'eko-print-studio')
			);
		}
		return $name . ' <span class="eko-ps-cart-art-name">(' . esc_html($art) . ')</span> ' . $badge . $edit;
	}

	/**
	 * @param string $thumbnail
	 * @param array<string,mixed> $cart_item
	 */
	public function cart_thumbnail(string $thumbnail, array $cart_item, string $cart_item_key): string {
		unset($cart_item_key);
		if (empty($cart_item[Settings::CART_KEY]['preview']) || !is_array($cart_item[Settings::CART_KEY]['preview'])) {
			return $thumbnail;
		}
		$preview = $cart_item[Settings::CART_KEY]['preview'];
		if (PreviewPresenter::is_raster($preview)) {
			$img = PreviewPresenter::img_html($preview, 'eko-ps-cart-thumb', 72);
			return $img !== '' ? $img : $thumbnail;
		}
		// Legacy domain-only preview — badge, never invent a placeholder image.
		return $thumbnail . '<span class="eko-ps-cart-preview-badge">' . esc_html__('Personalizado', 'eko-print-studio') . '</span>';
	}

	public function maybe_block_without_custom(): void {
		if (!Settings::get('require_custom')) {
			return;
		}
		if (is_admin() && !defined('DOING_AJAX')) {
			return;
		}
		foreach (WC()->cart?->get_cart() ?? [] as $item) {
			$product_id = (int) ($item['product_id'] ?? 0);
			$template = get_post_meta($product_id, Settings::META_TEMPLATE_ID, true);
			if (!$template) {
				continue;
			}
			if (empty($item[Settings::CART_KEY])) {
				wc_add_notice(
					__('Personalize o produto antes de finalizar a compra.', 'eko-print-studio'),
					'error'
				);
				break;
			}
		}
	}
}
