<?php
declare(strict_types=1);

namespace EkoPrintStudio\Services;

/**
 * Server-side personalization session store (custom post type).
 *
 * Identity contract (v1):
 *   record.id === customizationId === _eko_session_id === _eko_customization_id
 * Resume / product-context / GET /sessions/{id} all resolve the same canonical id.
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
	 * Resolve by canonical personalization id (sessionId === customizationId in v1).
	 *
	 * @return array{record: array<string,mixed>, documentJson?: string}|null
	 */
	public static function get_by_customization_id(string $customization_id): ?array {
		return self::get($customization_id);
	}

	/**
	 * Lookup by canonical id — same path used by GET /sessions/{id} and resume().
	 *
	 * @return array{record: array<string,mixed>, documentJson?: string}|null
	 */
	public static function get(string $session_id): ?array {
		$post_id = self::find_post_id($session_id);
		if (!$post_id) {
			return null;
		}
		return self::load_post($post_id);
	}

	/**
	 * @return array{record: array<string,mixed>, documentJson?: string}|null
	 */
	private static function load_post(int $post_id): ?array {
		if ($post_id <= 0) {
			return null;
		}
		$record_raw = (string) get_post_meta($post_id, '_eko_session_record', true);
		$document_json = (string) get_post_meta($post_id, '_eko_session_document', true);
		$record = json_decode($record_raw, true);
		if (!is_array($record)) {
			return null;
		}

		$session_meta = sanitize_text_field((string) get_post_meta($post_id, '_eko_session_id', true));
		$custom_meta = sanitize_text_field((string) get_post_meta($post_id, '_eko_customization_id', true));
		$record_id = sanitize_text_field((string) ($record['id'] ?? ''));
		$record_custom = sanitize_text_field((string) ($record['customizationId'] ?? ''));

		// Canonical id: prefer record.id (what product-context / cart echo), else metas.
		$canonical = $record_id !== '' ? $record_id : ($session_meta !== '' ? $session_meta : $custom_meta);
		if ($canonical === '') {
			$canonical = $record_custom;
		}
		if ($canonical === '') {
			return null;
		}

		$needs_heal =
			$session_meta !== $canonical
			|| $custom_meta !== $canonical
			|| $record_id !== $canonical
			|| $record_custom !== $canonical;

		$record['id'] = $canonical;
		$record['customizationId'] = $canonical;

		if ($needs_heal) {
			self::write_identity_metas($post_id, $canonical, $record);
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
	 * @throws \RuntimeException When the CPT cannot be created or verified.
	 */
	public static function upsert(array $record, ?string $document_json = null): array {
		$session_id = sanitize_text_field((string) ($record['id'] ?? ''));
		if ($session_id === '') {
			throw new \RuntimeException('SessionRepository::upsert: missing session id');
		}

		// Force v1 identity — no partial / divergent writes.
		$record['id'] = $session_id;
		$record['customizationId'] = $session_id;

		$post_id = self::find_post_id($session_id);
		if (!$post_id) {
			$post_id = wp_insert_post([
				'post_type'   => self::POST_TYPE,
				'post_status' => 'private',
				'post_title'  => $session_id,
			], true);
			if (is_wp_error($post_id)) {
				throw new \RuntimeException(
					'SessionRepository::upsert: wp_insert_post failed — ' . $post_id->get_error_message()
				);
			}
			if (!$post_id) {
				throw new \RuntimeException('SessionRepository::upsert: wp_insert_post returned empty id');
			}
		}

		self::write_identity_metas((int) $post_id, $session_id, $record);

		if (!empty($record['lifecycle'])) {
			update_post_meta((int) $post_id, '_eko_lifecycle', sanitize_text_field((string) $record['lifecycle']));
		}
		if ($document_json !== null) {
			JsonMetaPersistence::persist_post_meta_string(
				(int) $post_id,
				'_eko_session_document',
				$document_json
			);
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

		$verified = self::get($session_id);
		if ($verified === null || !is_array($verified['record'] ?? null)) {
			throw new \RuntimeException(
				'SessionRepository::upsert: persist verification failed for ' . $session_id
			);
		}
		if ((string) ($verified['record']['id'] ?? '') !== $session_id) {
			throw new \RuntimeException(
				'SessionRepository::upsert: stored session id mismatch for ' . $session_id
			);
		}
		if ((string) ($verified['record']['customizationId'] ?? '') !== $session_id) {
			throw new \RuntimeException(
				'SessionRepository::upsert: stored customization id mismatch for ' . $session_id
			);
		}
		$stored_session_meta = (string) get_post_meta((int) $post_id, '_eko_session_id', true);
		$stored_custom_meta = (string) get_post_meta((int) $post_id, '_eko_customization_id', true);
		if ($stored_session_meta !== $session_id || $stored_custom_meta !== $session_id) {
			throw new \RuntimeException(
				'SessionRepository::upsert: identity metas out of sync for ' . $session_id
			);
		}
		if ($document_json !== null && (string) ($verified['documentJson'] ?? '') === '') {
			throw new \RuntimeException(
				'SessionRepository::upsert: document meta missing for ' . $session_id
			);
		}

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
			// load_post heals identity metas so product-context and GET /sessions agree.
			$loaded = self::load_post((int) $id);
			if ($loaded && is_array($loaded['record'] ?? null)) {
				$out[] = $loaded['record'];
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

	/**
	 * Resolve CPT by any identity surface that must carry the same canonical id.
	 */
	private static function find_post_id(string $id): int {
		$id = sanitize_text_field($id);
		if ($id === '') {
			return 0;
		}

		foreach (['_eko_session_id', '_eko_customization_id'] as $meta_key) {
			$posts = get_posts([
				'post_type'      => self::POST_TYPE,
				'post_status'    => 'private',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'meta_key'       => $meta_key,
				'meta_value'     => $id,
			]);
			if ($posts) {
				return (int) $posts[0];
			}
		}

		// Creation sets post_title = canonical id.
		$by_title = get_posts([
			'post_type'      => self::POST_TYPE,
			'post_status'    => 'private',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'title'          => $id,
		]);
		return $by_title ? (int) $by_title[0] : 0;
	}

	/**
	 * Atomic identity write — always keeps metas + JSON + title aligned.
	 *
	 * JSON record meta MUST go through {@see JsonMetaPersistence} (ADR-0002).
	 *
	 * @param array<string,mixed> $record
	 * @throws \RuntimeException When JSON persistence invariants fail.
	 */
	private static function write_identity_metas(int $post_id, string $canonical_id, array $record): void {
		$record['id'] = $canonical_id;
		$record['customizationId'] = $canonical_id;

		update_post_meta($post_id, '_eko_session_id', $canonical_id);
		update_post_meta($post_id, '_eko_customization_id', $canonical_id);

		JsonMetaPersistence::persist_post_meta($post_id, '_eko_session_record', $record);

		wp_update_post([
			'ID'         => $post_id,
			'post_title' => $canonical_id,
		]);
	}
}
