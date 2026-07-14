<?php
declare(strict_types=1);

namespace EkoPrintStudio\Config;

/**
 * Plugin settings consumed by the host bridge / SDK embed — never Core.
 */
final class Settings {
	public const OPTION_KEY = 'eko_ps_settings';

	public const META_TEMPLATE_ID = '_eko_template_id';
	public const META_TEMPLATE_MODE = '_eko_template_mode';
	public const CART_KEY = 'eko_personalization';
	public const ORDER_META_KEY = '_eko_commerce_order';
	public const ORDER_SESSION_KEY = '_eko_session_id';
	public const ORDER_PREVIEW_KEY = '_eko_preview';
	public const ORDER_TEMPLATE_KEY = '_eko_template_id';
	public const ORDER_VERSION_KEY = '_eko_contract_version';

	/** @return array<string, mixed> */
	public static function defaults(): array {
		return [
			'editor_url'       => '',
			'embed_mode'       => 'modal', // modal | iframe | page
			'language'         => 'pt-BR',
			'theme'            => 'canva',
			'debug'            => false,
			'timeout_ms'       => 30000,
			'autosave_ms'      => 15000,
			'preview_enabled'  => true,
			'environment'      => 'production', // development | production
			'target_origin'    => '*',
			'button_label'     => 'Personalizar',
			'require_custom'   => false,
		];
	}

	/** @return array<string, mixed> */
	public static function all(): array {
		$stored = get_option(self::OPTION_KEY, []);
		if (!is_array($stored)) {
			$stored = [];
		}
		return array_merge(self::defaults(), $stored);
	}

	public static function get(string $key, mixed $fallback = null): mixed {
		$all = self::all();
		return $all[$key] ?? $fallback;
	}

	/** @param array<string, mixed> $input */
	public static function sanitize(array $input): array {
		$defaults = self::defaults();
		$out      = $defaults;

		$out['editor_url'] = esc_url_raw((string) ($input['editor_url'] ?? ''));
		$mode = (string) ($input['embed_mode'] ?? 'modal');
		$out['embed_mode'] = in_array($mode, ['modal', 'iframe', 'page'], true) ? $mode : 'modal';
		$out['language'] = sanitize_text_field((string) ($input['language'] ?? 'pt-BR'));
		$theme = (string) ($input['theme'] ?? 'canva');
		$out['theme'] = in_array($theme, ['canva', 'light', 'dark'], true) ? $theme : 'canva';
		$out['debug'] = !empty($input['debug']);
		$out['timeout_ms'] = max(1000, (int) ($input['timeout_ms'] ?? 30000));
		$out['autosave_ms'] = max(0, (int) ($input['autosave_ms'] ?? 15000));
		$out['preview_enabled'] = !empty($input['preview_enabled']);
		$env = (string) ($input['environment'] ?? 'production');
		$out['environment'] = in_array($env, ['development', 'production'], true) ? $env : 'production';
		$out['target_origin'] = sanitize_text_field((string) ($input['target_origin'] ?? '*'));
		$out['button_label'] = sanitize_text_field((string) ($input['button_label'] ?? 'Personalizar'));
		$out['require_custom'] = !empty($input['require_custom']);

		return $out;
	}

	public static function init(): void {
		// Reserved for future runtime hooks.
	}

	/**
	 * Public config for the host bridge (safe for wp_localize_script).
	 *
	 * @return array<string, mixed>
	 */
	public static function public_config(): array {
		$all = self::all();
		return [
			'editorUrl'      => (string) $all['editor_url'],
			'embedMode'      => (string) $all['embed_mode'],
			'language'       => (string) $all['language'],
			'theme'          => (string) $all['theme'],
			'debug'          => (bool) $all['debug'],
			'timeoutMs'      => (int) $all['timeout_ms'],
			'autosaveMs'     => (int) $all['autosave_ms'],
			'previewEnabled' => (bool) $all['preview_enabled'],
			'environment'    => (string) $all['environment'],
			'targetOrigin'   => (string) $all['target_origin'],
			'buttonLabel'    => (string) $all['button_label'],
			'requireCustom'  => (bool) $all['require_custom'],
			'contractVersion'=> 'eko.commerce.cart/1',
		];
	}
}
