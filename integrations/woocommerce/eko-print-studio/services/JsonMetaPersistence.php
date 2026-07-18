<?php
declare(strict_types=1);

namespace EkoPrintStudio\Services;

/**
 * Official WordPress JSON meta persistence helper.
 *
 * ADR: docs/architecture/ADR-0002-wordpress-json-persistence.md
 *
 * WordPress `update_metadata()` always runs `wp_unslash()` on values before
 * storage. Raw `wp_json_encode()` output therefore loses JSON escapes and
 * becomes undecodable. Every JSON meta write in this plugin MUST go through
 * this class — never call `update_post_meta($id, $key, $json)` directly.
 */
final class JsonMetaPersistence {
	/**
	 * Encode a PHP value to JSON, rejecting encode failures.
	 *
	 * @param mixed $value
	 * @throws \RuntimeException
	 */
	public static function encode(mixed $value): string {
		$json = wp_json_encode($value);
		if (!is_string($json) || $json === '') {
			throw new \RuntimeException(
				'JsonMetaPersistence::encode failed — ' . json_last_error_msg()
			);
		}
		self::assert_decodable($json, 'encode');
		return $json;
	}

	/**
	 * Prepare a JSON string for any WP metadata API that applies wp_unslash
	 * (post meta, order item meta via update_metadata, etc.).
	 *
	 * @throws \RuntimeException
	 */
	public static function prepare_for_metadata(string $json): string {
		self::assert_decodable($json, 'prepare_for_metadata');
		return wp_slash($json);
	}

	/**
	 * Encode + slash in one step for add_meta_data / update_metadata callers
	 * that cannot re-read immediately.
	 *
	 * @param mixed $value
	 * @throws \RuntimeException
	 */
	public static function encode_for_metadata(mixed $value): string {
		return self::prepare_for_metadata(self::encode($value));
	}

	/**
	 * Persist a PHP value as JSON post meta with slash-safe round-trip invariant.
	 *
	 * Invariant: encode → update_post_meta → get_post_meta → json_decode ≡ value
	 * (for array/object payloads used by this plugin).
	 *
	 * @param mixed $value
	 * @throws \RuntimeException On encode, store divergence, or decode failure.
	 */
	public static function persist_post_meta(int $post_id, string $meta_key, mixed $value): string {
		return self::persist_post_meta_string($post_id, $meta_key, self::encode($value));
	}

	/**
	 * Persist an already-encoded JSON string as post meta (e.g. documentJson).
	 *
	 * @throws \RuntimeException
	 */
	public static function persist_post_meta_string(int $post_id, string $meta_key, string $json): string {
		self::assert_decodable($json, 'persist_post_meta_string');

		update_post_meta($post_id, $meta_key, wp_slash($json));

		$stored = (string) get_post_meta($post_id, $meta_key, true);
		if ($stored !== $json) {
			throw new \RuntimeException(
				'JsonMetaPersistence: stored meta diverged from encode output for ' . $meta_key
			);
		}
		self::assert_decodable($stored, 'post-read ' . $meta_key);

		$decoded = json_decode($stored, true);
		$original = json_decode($json, true);
		if ($decoded !== $original) {
			throw new \RuntimeException(
				'JsonMetaPersistence: round-trip integrity failed for ' . $meta_key
			);
		}

		return $stored;
	}

	/**
	 * @throws \RuntimeException
	 */
	private static function assert_decodable(string $json, string $stage): void {
		$decoded = json_decode($json, true);
		if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
			throw new \RuntimeException(
				'JsonMetaPersistence: json_decode failed at ' . $stage . ' — ' . json_last_error_msg()
			);
		}
		// Plugin JSON metas are objects/arrays; reject scalar-only accidental payloads.
		if (!is_array($decoded)) {
			throw new \RuntimeException(
				'JsonMetaPersistence: expected JSON object/array at ' . $stage
			);
		}
	}
}
