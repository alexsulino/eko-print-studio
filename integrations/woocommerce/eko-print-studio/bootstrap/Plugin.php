<?php
declare(strict_types=1);

namespace EkoPrintStudio\Bootstrap;

use EkoPrintStudio\Admin\AdminSettings;
use EkoPrintStudio\Admin\OrderPanel;
use EkoPrintStudio\Admin\ProductFields;
use EkoPrintStudio\Config\Settings;
use EkoPrintStudio\Frontend\Assets;
use EkoPrintStudio\Frontend\ProductButton;
use EkoPrintStudio\Rest\Routes;
use EkoPrintStudio\Services\AuditLog;
use EkoPrintStudio\Services\CartPersistence;
use EkoPrintStudio\Services\OrderPersistence;
use EkoPrintStudio\Services\SessionRepository;

/**
 * Wires WooCommerce hooks — thin orchestration only.
 */
final class Plugin {
	private static ?self $instance = null;

	public static function instance(): self {
		return self::$instance ??= new self();
	}

	public function boot(): void {
		Settings::init();
		AuditLog::init();
		add_action('init', [SessionRepository::class, 'register_post_type']);

		(new Routes())->register();
		(new CartPersistence())->register();
		(new OrderPersistence())->register();
		(new Assets())->register();
		(new ProductButton())->register();

		if (is_admin()) {
			(new AdminSettings())->register();
			(new ProductFields())->register();
			(new OrderPanel())->register();
		}

		add_action('before_woocommerce_init', static function (): void {
			if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
				\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
					'custom_order_tables',
					EKO_PS_FILE,
					true
				);
			}
		});
	}
}
