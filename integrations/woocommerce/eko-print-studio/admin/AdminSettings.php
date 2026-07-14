<?php
declare(strict_types=1);

namespace EkoPrintStudio\Admin;

use EkoPrintStudio\Config\Settings;

final class AdminSettings {
	public function register(): void {
		add_action('admin_menu', [$this, 'menu']);
		add_action('admin_init', [$this, 'settings']);
	}

	public function menu(): void {
		add_submenu_page(
			'woocommerce',
			__('Eko Print Studio', 'eko-print-studio'),
			__('Eko Print Studio', 'eko-print-studio'),
			'manage_woocommerce',
			'eko-print-studio',
			[$this, 'render']
		);
	}

	public function settings(): void {
		register_setting('eko_ps_settings_group', Settings::OPTION_KEY, [
			'type'              => 'array',
			'sanitize_callback' => [Settings::class, 'sanitize'],
			'default'           => Settings::defaults(),
		]);
	}

	public function render(): void {
		if (!current_user_can('manage_woocommerce')) {
			return;
		}
		$settings = Settings::all();
		include EKO_PS_PATH . 'views/admin-settings.php';
	}
}
