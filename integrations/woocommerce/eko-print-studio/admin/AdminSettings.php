<?php
declare(strict_types=1);

namespace EkoPrintStudio\Admin;

use EkoPrintStudio\Config\Settings;
use EkoPrintStudio\Config\TemplateCatalog;

final class AdminSettings {
	public function register(): void {
		add_action('admin_menu', [$this, 'menu']);
		add_action('admin_init', [$this, 'settings']);
		add_action('admin_post_eko_ps_sync_templates', [$this, 'sync_templates']);
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

	public function sync_templates(): void {
		if (!current_user_can('manage_woocommerce')) {
			wp_die(esc_html__('Insufficient permissions.', 'eko-print-studio'), 403);
		}
		check_admin_referer('eko_ps_sync_templates');

		$result = TemplateCatalog::sync_from_editor();
		$redirect = add_query_arg(
			[
				'page'            => 'eko-print-studio',
				'eko_sync'        => $result['ok'] ? '1' : '0',
				'eko_sync_count'  => (string) ($result['count'] ?? 0),
				'eko_sync_error'  => $result['ok'] ? '' : rawurlencode((string) ($result['error'] ?? 'error')),
			],
			admin_url('admin.php')
		);
		wp_safe_redirect($redirect);
		exit;
	}

	public function render(): void {
		if (!current_user_can('manage_woocommerce')) {
			return;
		}
		$settings = Settings::all();
		$templates = TemplateCatalog::published();
		include EKO_PS_PATH . 'views/admin-settings.php';
	}
}
