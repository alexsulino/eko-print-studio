<?php
declare(strict_types=1);

namespace EkoPrintStudio\Services;

/**
 * Server-side personalization session store (custom post type).
 * Persists record JSON + document JSON for resume across devices.
 */
final class SessionRepository {
	public const POST_TYPE = 'eko_ps_session';

	public static function register_post_type(): void {
		register_post_type(self::POST_TYPE, [
			'labels'          => [
				'name'          => __('Eko Sessions', 'eko-print-studio'),
				'singular_name' => __('Eko Session', 'eko-print-studio'),
			],
			'public'          => false,
			'show_ui'         => false,
			'show_in_rest'    => false,
			'supports'        => ['title'],
			'capability_type' => 'post',
			'map_meta_cap'    => true,
		]);
	}

	/**
	 * @param array<string,mixed> $record
	 * @return array{record: array<string,mixed>, documentJson?: string}|null
	 */
	public static function get(string $session_id): ?array {
		$post_id = self::find_post_id($session_id);
		if (!$post_id) {
			return null;
		}
		$record_raw = (string) get_post_meta($post_id, '_eko_session_record', true);
		$document_json = (string) get_post_meta($post_id, '_eko_session_document', true);
		$record = json_decode($record_raw, true);
		if (!is_array($record)) {
			return null;
		}
		// Migrate session-only records → Customization identity (transparent).
		if (empty($record['customizationId']) && !empty($record['id'])) {
			$record['customizationId'] = (string) $record['id'];
		}
		$out = ['record' => $record];
		if ($document_json !== '') {
			$out['documentJson'] = $document_json;
		}
		return $out;
	}

	/**
	 * @param array<string,mixed> $record
	 * @return array<string,mixed>
	 */
	public static function upsert(array $record, ?string $document_json = null): array {
		$session_id = sanitize_text_field((string) ($record['id'] ?? ''));
		if ($session_id === '') {
			return $record;
		}

		$post_id = self::find_post_id($session_id);
		if (!$post_id) {
			$post_id = wp_insert_post([
				'post_type'   => self::POST_TYPE,
				'post_status' => 'private',
				'post_title'  => $session_id,
			], true);
			if (is_wp_error($post_id) || !$post_id) {
				return $record;
			}
			update_post_meta((int) $post_id, '_eko_session_id', $session_id);
		}

		// Transparent Customization identity (v1: customizationId === session id).
		if (empty($record['customizationId'])) {
			$record['customizationId'] = $session_id;
		}
		$customization_id = sanitize_text_field((string) $record['customizationId']);

		update_post_meta((int) $post_id, '_eko_session_record', wp_json_encode($record));
		update_post_meta((int) $post_id, '_eko_customization_id', $customization_id);
		if (!empty($record['lifecycle'])) {
			update_post_meta((int) $post_id, '_eko_lifecycle', sanitize_text_field((string) $record['lifecycle']));
		}
		if ($document_json !== null) {
			update_post_meta((int) $post_id, '_eko_session_document', $document_json);
			$document_id = sanitize_text_field((string) ($record['documentId'] ?? ''));
			if ($document_id !== '') {
				self::save_document($document_id, $document_json);
			}
		}
		$product_id = sanitize_text_field((string) ($record['product']['productId'] ?? ''));
		if ($product_id !== '') {
			update_post_meta((int) $post_id, '_eko_product_id', $product_id);
		}
		update_post_meta((int) $post_id, '_eko_session_updated', gmdate('c'));

		return $record;
	}

	public static function delete(string $session_id): void {
		$post_id = self::find_post_id($session_id);
		if ($post_id) {
			wp_delete_post($post_id, true);
		}
	}

	/**
	 * @return list<array<string,mixed>>
	 */
	public static function list_by_product(?string $product_id = null): array {
		$args = [
			'post_type'      => self::POST_TYPE,
			'post_status'    => 'private',
			'posts_per_page' => 100,
			'fields'         => 'ids',
			'orderby'        => 'modified',
			'order'          => 'DESC',
		];
		if ($product_id) {
			$args['meta_key']   = '_eko_product_id';
			$args['meta_value'] = sanitize_text_field($product_id);
		}
		$ids = get_posts($args);
		$out = [];
		foreach ($ids as $id) {
			$raw = (string) get_post_meta((int) $id, '_eko_session_record', true);
			$record = json_decode($raw, true);
			if (is_array($record)) {
				$out[] = $record;
			}
		}
		return $out;
	}

	public static function save_document(string $document_id, string $document_json): string {
		$document_id = sanitize_text_field($document_id);
		$key = 'eko_ps_doc_' . md5($document_id);
		set_transient($key, $document_json, 7 * DAY_IN_SECONDS);
		return $document_json;
	}

	public static function get_document(string $document_id): ?string {
		$document_id = sanitize_text_field($document_id);
		$key = 'eko_ps_doc_' . md5($document_id);
		$hit = get_transient($key);
		return is_string($hit) && $hit !== '' ? $hit : null;
	}

	private static function find_post_id(string $session_id): int {
		$posts = get_posts([
			'post_type'      => self::POST_TYPE,
			'post_status'    => 'private',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_key'       => '_eko_session_id',
			'meta_value'     => sanitize_text_field($session_id),
		]);
		return $posts ? (int) $posts[0] : 0;
	}
}
