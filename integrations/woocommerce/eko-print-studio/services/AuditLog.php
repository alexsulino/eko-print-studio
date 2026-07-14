<?php
declare(strict_types=1);

namespace EkoPrintStudio\Services;

use EkoPrintStudio\Config\Settings;

/**
 * Lightweight event audit for extensions — mirrors SDK EventBus names.
 */
final class AuditLog {
	public const OPTION_KEY = 'eko_ps_audit_log';

	public static function init(): void {
		add_action('eko_ps_cleanup_transients', [self::class, 'cleanup']);
	}

	/** @param array<string,mixed> $context */
	public static function record(string $event, array $context = []): void {
		if (!Settings::get('debug') && !apply_filters('eko_ps_force_audit', false)) {
			// Still fire WP action for extensions.
			do_action('eko_ps_event', $event, $context);
			return;
		}

		$entry = [
			'event'     => sanitize_text_field($event),
			'context'   => $context,
			'timestamp' => gmdate('c'),
			'user_id'   => get_current_user_id(),
		];

		$log = get_option(self::OPTION_KEY, []);
		if (!is_array($log)) {
			$log = [];
		}
		$log[] = $entry;
		$log = array_slice($log, -200);
		update_option(self::OPTION_KEY, $log, false);

		do_action('eko_ps_event', $event, $context);
	}

	public static function cleanup(): void {
		$log = get_option(self::OPTION_KEY, []);
		if (is_array($log) && count($log) > 200) {
			update_option(self::OPTION_KEY, array_slice($log, -100), false);
		}
	}
}
