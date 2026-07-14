<?php
declare(strict_types=1);

namespace EkoPrintStudio\Services;

/**
 * Validates commerce payloads from the browser — never trust raw client data.
 */
final class PayloadValidator {
	public const CART_SCHEMA = 'eko.commerce.cart/1';
	public const ORDER_SCHEMA = 'eko.commerce.order/1';

	/**
	 * @param mixed $data
	 * @return array{ok:bool,payload?:array<string,mixed>,error?:string}
	 */
	public static function validate_cart(mixed $data): array {
		if (!is_array($data)) {
			return ['ok' => false, 'error' => 'Cart payload must be an object.'];
		}

		if (($data['schema'] ?? '') !== self::CART_SCHEMA) {
			return ['ok' => false, 'error' => 'Unsupported cart contract version.'];
		}

		$required = ['sessionId', 'documentId', 'masterId', 'product', 'documentJson', 'preview', 'savedAt', 'summary'];
		foreach ($required as $key) {
			if (!array_key_exists($key, $data)) {
				return ['ok' => false, 'error' => "Missing cart field: {$key}"];
			}
		}

		if (!is_array($data['product']) || empty($data['product']['productId']) || empty($data['product']['templateId'])) {
			return ['ok' => false, 'error' => 'Invalid product context.'];
		}

		if (!is_string($data['sessionId']) || $data['sessionId'] === '') {
			return ['ok' => false, 'error' => 'Invalid sessionId.'];
		}

		if (!is_array($data['preview']) || empty($data['preview']['data'])) {
			return ['ok' => false, 'error' => 'Invalid preview.'];
		}

		if (!is_array($data['summary'])) {
			return ['ok' => false, 'error' => 'Invalid summary.'];
		}

		// Size guard — huge documents should live in PersistenceProvider, not cart meta forever.
		$json = wp_json_encode($data);
		if (is_string($json) && strlen($json) > 1_500_000) {
			return ['ok' => false, 'error' => 'Cart payload exceeds size limit.'];
		}

		return ['ok' => true, 'payload' => self::sanitize_cart($data)];
	}

	/**
	 * @param array<string,mixed> $data
	 * @return array<string,mixed>
	 */
	private static function sanitize_cart(array $data): array {
		$product = is_array($data['product']) ? $data['product'] : [];
		$preview = is_array($data['preview']) ? $data['preview'] : [];
		$summary = is_array($data['summary']) ? $data['summary'] : [];

		$attrs = [];
		if (!empty($product['attributes']) && is_array($product['attributes'])) {
			foreach ($product['attributes'] as $k => $v) {
				$attrs[sanitize_text_field((string) $k)] = sanitize_text_field((string) $v);
			}
		}

		return [
			'schema'       => self::CART_SCHEMA,
			'sessionId'    => sanitize_text_field((string) $data['sessionId']),
			'documentId'   => sanitize_text_field((string) $data['documentId']),
			'masterId'     => sanitize_text_field((string) $data['masterId']),
			'product'      => [
				'productId'   => sanitize_text_field((string) ($product['productId'] ?? '')),
				'sku'         => sanitize_text_field((string) ($product['sku'] ?? '')),
				'variationId' => sanitize_text_field((string) ($product['variationId'] ?? '')),
				'attributes'  => $attrs,
				'quantity'    => max(1, (int) ($product['quantity'] ?? 1)),
				'templateId'  => sanitize_text_field((string) ($product['templateId'] ?? '')),
				'productName' => sanitize_text_field((string) ($product['productName'] ?? '')),
				'currency'    => sanitize_text_field((string) ($product['currency'] ?? '')),
				'locale'      => sanitize_text_field((string) ($product['locale'] ?? '')),
			],
			'documentJson' => (string) $data['documentJson'],
			'preview'      => [
				'format'      => sanitize_text_field((string) ($preview['format'] ?? 'json')),
				'mimeType'    => sanitize_text_field((string) ($preview['mimeType'] ?? 'application/json')),
				'data'        => (string) ($preview['data'] ?? ''),
				'widthPx'     => (int) ($preview['widthPx'] ?? 0),
				'heightPx'    => (int) ($preview['heightPx'] ?? 0),
				'generatedAt' => sanitize_text_field((string) ($preview['generatedAt'] ?? '')),
				'fidelity'    => sanitize_text_field((string) ($preview['fidelity'] ?? 'domain')),
			],
			'savedAt'      => sanitize_text_field((string) $data['savedAt']),
			'summary'      => [
				'documentName' => sanitize_text_field((string) ($summary['documentName'] ?? '')),
				'elementCount' => (int) ($summary['elementCount'] ?? 0),
				'pageCount'    => (int) ($summary['pageCount'] ?? 1),
			],
		];
	}
}
