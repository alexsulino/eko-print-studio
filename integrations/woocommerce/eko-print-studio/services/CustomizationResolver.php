<?php
declare(strict_types=1);

namespace EkoPrintStudio\Services;

use EkoPrintStudio\Config\Settings;

/**
 * Resolves the official Customization entity from Woo persistence (session CPT / cart / order).
 * Host-bridge sessionStorage is only an optional UX cache — this is the source of truth.
 */
final class CustomizationResolver {
	/**
	 * Resolve by business customization id (v1: equals session id).
	 *
	 * @return array{
	 *   customizationId: string,
	 *   sessionId: string,
	 *   productId: string,
	 *   templateId: string,
	 *   lifecycle: string,
	 *   preview?: array<string,mixed>|null,
	 *   summary?: array<string,mixed>|null,
	 *   source: string
	 * }|null
	 */
	public static function by_id(string $customization_id): ?array {
		$customization_id = sanitize_text_field($customization_id);
		if ($customization_id === '') {
			return null;
		}

		$hit = SessionRepository::get_by_customization_id($customization_id);
		if (!$hit || !is_array($hit['record'] ?? null)) {
			// Cart may hold the payload even if CPT lookup lagged.
			$from_cart = self::from_cart_by_id($customization_id);
			if ($from_cart) {
				return $from_cart;
			}
			return null;
		}

		return self::view_from_record($hit['record'], 'repository');
	}

	/**
	 * Active customization for a product — prefers WC cart line, then latest non-cancelled session.
	 *
	 * @return array<string,mixed>|null
	 */
	public static function for_product(string $product_id): ?array {
		$product_id = sanitize_text_field($product_id);
		if ($product_id === '') {
			return null;
		}

		$from_cart = self::from_cart_by_product($product_id);
		if ($from_cart) {
			return $from_cart;
		}

		$records = SessionRepository::list_by_product($product_id);
		foreach ($records as $record) {
			if (!is_array($record)) {
				continue;
			}
			$lifecycle = (string) ($record['lifecycle'] ?? '');
			$status = (string) ($record['status'] ?? '');
			if ($lifecycle === 'cancelled' || $status === 'cancelled') {
				continue;
			}
			$view = self::view_from_record($record, 'repository');
			if ($view) {
				return $view;
			}
		}

		return null;
	}

	/**
	 * @return array<string,mixed>|null
	 */
	public static function from_order_item(int $order_id, int $item_id): ?array {
		$order = wc_get_order($order_id);
		if (!$order) {
			return null;
		}
		foreach ($order->get_items() as $item) {
			if ((int) $item->get_id() !== $item_id) {
				continue;
			}
			$customization_id = (string) $item->get_meta(Settings::ORDER_CUSTOMIZATION_KEY, true);
			$session_id = (string) $item->get_meta(Settings::ORDER_SESSION_KEY, true);
			$id = $customization_id !== '' ? $customization_id : $session_id;
			if ($id === '') {
				$raw = $item->get_meta(Settings::ORDER_META_KEY, true);
				$decoded = OrderPersistence::decode_order_meta($raw);
				if (is_array($decoded)) {
					$cart = is_array($decoded['cart'] ?? null) ? $decoded['cart'] : [];
					$id = (string) ($cart['customizationId'] ?? $cart['sessionId'] ?? '');
				}
			}
			if ($id === '') {
				return null;
			}
			$resolved = self::by_id($id);
			if ($resolved) {
				$resolved['source'] = 'order';
				return $resolved;
			}
			// Fallback view from order meta alone (session CPT missing).
			$raw = $item->get_meta(Settings::ORDER_META_KEY, true);
			$decoded = OrderPersistence::decode_order_meta($raw);
			$cart = is_array($decoded['cart'] ?? null) ? $decoded['cart'] : [];
			return [
				'customizationId' => (string) ($cart['customizationId'] ?? $id),
				'sessionId'       => (string) ($cart['sessionId'] ?? $id),
				'productId'       => (string) ($cart['product']['productId'] ?? ''),
				'templateId'      => (string) ($cart['masterId'] ?? $cart['product']['templateId'] ?? ''),
				'lifecycle'       => (string) ($cart['lifecycleStatus'] ?? 'ordered'),
				'preview'         => is_array($cart['preview'] ?? null) ? $cart['preview'] : null,
				'summary'         => is_array($cart['summary'] ?? null) ? $cart['summary'] : null,
				'source'          => 'order_meta',
			];
		}
		return null;
	}

	/**
	 * @return array<string,mixed>|null
	 */
	private static function from_cart_by_product(string $product_id): ?array {
		if (!function_exists('WC') || !WC()->cart) {
			return null;
		}
		foreach (WC()->cart->get_cart() as $item) {
			$payload = $item[Settings::CART_KEY] ?? null;
			if (!is_array($payload)) {
				continue;
			}
			$pid = (string) ($payload['product']['productId'] ?? $item['product_id'] ?? '');
			if ($pid !== $product_id) {
				continue;
			}
			return self::view_from_cart_payload($payload, 'cart');
		}
		return null;
	}

	/**
	 * @return array<string,mixed>|null
	 */
	private static function from_cart_by_id(string $customization_id): ?array {
		if (!function_exists('WC') || !WC()->cart) {
			return null;
		}
		foreach (WC()->cart->get_cart() as $item) {
			$payload = $item[Settings::CART_KEY] ?? null;
			if (!is_array($payload)) {
				continue;
			}
			$cid = (string) ($payload['customizationId'] ?? $payload['sessionId'] ?? '');
			$sid = (string) ($payload['sessionId'] ?? '');
			if ($cid === $customization_id || $sid === $customization_id) {
				return self::view_from_cart_payload($payload, 'cart');
			}
		}
		return null;
	}

	/**
	 * @param array<string,mixed> $payload
	 * @return array<string,mixed>|null
	 */
	private static function view_from_cart_payload(array $payload, string $source): ?array {
		// v1 identity: cart.sessionId === cart.customizationId
		$canonical = sanitize_text_field((string) (
			$payload['sessionId'] ?? $payload['customizationId'] ?? ''
		));
		if ($canonical === '') {
			return null;
		}
		return [
			'customizationId' => $canonical,
			'sessionId'       => $canonical,
			'productId'       => (string) ($payload['product']['productId'] ?? ''),
			'templateId'      => (string) ($payload['masterId'] ?? $payload['product']['templateId'] ?? ''),
			'lifecycle'       => (string) ($payload['lifecycleStatus'] ?? 'cart_attached'),
			'preview'         => is_array($payload['preview'] ?? null) ? $payload['preview'] : null,
			'summary'         => is_array($payload['summary'] ?? null) ? $payload['summary'] : null,
			'source'          => $source,
		];
	}

	/**
	 * @param array<string,mixed> $record
	 * @return array<string,mixed>|null
	 */
	private static function view_from_record(array $record, string $source): ?array {
		// v1 identity: sessionId === customizationId === record.id
		$canonical = sanitize_text_field((string) ($record['id'] ?? $record['customizationId'] ?? ''));
		if ($canonical === '') {
			return null;
		}
		return [
			'customizationId' => $canonical,
			'sessionId'       => $canonical,
			'productId'       => (string) ($record['product']['productId'] ?? ''),
			'templateId'      => (string) ($record['masterId'] ?? $record['product']['templateId'] ?? ''),
			'lifecycle'       => (string) ($record['lifecycle'] ?? 'editing'),
			'preview'         => is_array($record['preview'] ?? null) ? $record['preview'] : null,
			'summary'         => null,
			'source'          => $source,
		];
	}
}
