<?php
declare(strict_types=1);

namespace EkoPrintStudio\Config;

/**
 * Host-side Template Master catalog for admin selects.
 * Mirrors the editor Template Registry public catalog — never invents IDs.
 *
 * Resolution order:
 * 1. Synced option (from editor URL /templates/catalog.json)
 * 2. Bundled config/template-catalog.json
 */
final class TemplateCatalog {
	public const OPTION_KEY = 'eko_ps_template_catalog';
	public const SCHEMA = 'eko.templates.catalog/1';

	/**
	 * @return list<array{id:string,name:string,category?:string,thumbnail?:string,status:string}>
	 */
	public static function entries(): array {
		$synced = get_option(self::OPTION_KEY, null);
		if (is_array($synced) && ($synced['schema'] ?? '') === self::SCHEMA && !empty($synced['templates']) && is_array($synced['templates'])) {
			return self::normalize_list($synced['templates']);
		}
		return self::bundled();
	}

	/**
	 * Published templates only — for product <select>.
	 *
	 * @return list<array{id:string,name:string,category?:string,thumbnail?:string,status:string}>
	 */
	public static function published(): array {
		return array_values(array_filter(
			self::entries(),
			static fn(array $t): bool => ($t['status'] ?? '') === 'published' && ($t['id'] ?? '') !== ''
		));
	}

	/**
	 * id => label for WooCommerce form fields.
	 *
	 * @return array<string, string>
	 */
	public static function select_options(): array {
		$options = ['' => __('— Selecione um Template Master —', 'eko-print-studio')];
		foreach (self::published() as $template) {
			$label = (string) $template['name'];
			$category = trim((string) ($template['category'] ?? ''));
			if ($category !== '') {
				$label = $category . ' — ' . $label;
			}
			$options[(string) $template['id']] = $label;
		}
		return $options;
	}

	/**
	 * Ensure a stored meta id still appears in the select (legacy / unknown masters).
	 *
	 * @param array<string, string> $options
	 * @return array<string, string>
	 */
	public static function with_current_value(array $options, string $current_id): array {
		if ($current_id === '' || isset($options[$current_id])) {
			return $options;
		}
		$options[$current_id] = sprintf(
			/* translators: %s: template master id */
			__('Template atual (%s)', 'eko-print-studio'),
			$current_id
		);
		return $options;
	}

	/**
	 * Fetch catalog from the editor public URL and persist under OPTION_KEY.
	 *
	 * @return array{ok:bool,count?:int,error?:string}
	 */
	public static function sync_from_editor(): array {
		$editor_url = (string) Settings::get('editor_url', '');
		if ($editor_url === '') {
			return ['ok' => false, 'error' => 'editor_url missing'];
		}

		$base = untrailingslashit($editor_url);
		$url = $base . '/templates/catalog.json';
		$response = wp_remote_get($url, [
			'timeout' => 15,
			'headers' => ['Accept' => 'application/json'],
		]);

		if (is_wp_error($response)) {
			return ['ok' => false, 'error' => $response->get_error_message()];
		}

		$code = (int) wp_remote_retrieve_response_code($response);
		$body = (string) wp_remote_retrieve_body($response);
		if ($code < 200 || $code >= 300 || $body === '') {
			return ['ok' => false, 'error' => 'HTTP ' . $code];
		}

		$parsed = json_decode($body, true);
		if (!is_array($parsed) || ($parsed['schema'] ?? '') !== self::SCHEMA || !is_array($parsed['templates'] ?? null)) {
			return ['ok' => false, 'error' => 'Invalid catalog schema'];
		}

		$payload = [
			'schema'    => self::SCHEMA,
			'syncedAt'  => gmdate('c'),
			'source'    => $url,
			'templates' => self::normalize_list($parsed['templates']),
		];
		update_option(self::OPTION_KEY, $payload, false);

		return ['ok' => true, 'count' => count($payload['templates'])];
	}

	/**
	 * @return list<array{id:string,name:string,category?:string,thumbnail?:string,status:string}>
	 */
	public static function bundled(): array {
		$path = EKO_PS_PATH . 'config/template-catalog.json';
		if (!is_readable($path)) {
			return [];
		}
		$raw = file_get_contents($path);
		if ($raw === false) {
			return [];
		}
		$parsed = json_decode($raw, true);
		if (!is_array($parsed) || !is_array($parsed['templates'] ?? null)) {
			return [];
		}
		return self::normalize_list($parsed['templates']);
	}

	/**
	 * @param mixed $list
	 * @return list<array{id:string,name:string,category?:string,thumbnail?:string,status:string}>
	 */
	private static function normalize_list($list): array {
		if (!is_array($list)) {
			return [];
		}
		$out = [];
		foreach ($list as $row) {
			if (!is_array($row)) {
				continue;
			}
			$id = sanitize_text_field((string) ($row['id'] ?? ''));
			$name = sanitize_text_field((string) ($row['name'] ?? ''));
			if ($id === '' || $name === '') {
				continue;
			}
			$entry = [
				'id'     => $id,
				'name'   => $name,
				'status' => sanitize_text_field((string) ($row['status'] ?? 'published')) ?: 'published',
			];
			if (!empty($row['category'])) {
				$entry['category'] = sanitize_text_field((string) $row['category']);
			}
			if (!empty($row['thumbnail'])) {
				$entry['thumbnail'] = esc_url_raw((string) $row['thumbnail']);
			}
			$out[] = $entry;
		}
		usort(
			$out,
			static fn(array $a, array $b): int => strcasecmp((string) $a['name'], (string) $b['name'])
		);
		return $out;
	}
}
