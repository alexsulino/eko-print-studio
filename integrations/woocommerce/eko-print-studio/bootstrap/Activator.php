<?php
declare(strict_types=1);

namespace EkoPrintStudio\Bootstrap;

use EkoPrintStudio\Config\Settings;

final class Activator {
	public static function activate(): void {
		$defaults = Settings::defaults();
		if (get_option(Settings::OPTION_KEY, null) === null) {
			add_option(Settings::OPTION_KEY, $defaults, '', false);
		}

		if (!wp_next_scheduled('eko_ps_cleanup_transients')) {
			wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', 'eko_ps_cleanup_transients');
		}

		flush_rewrite_rules();
	}

	public static function deactivate(): void {
		wp_clear_scheduled_hook('eko_ps_cleanup_transients');
		flush_rewrite_rules();
	}
}
