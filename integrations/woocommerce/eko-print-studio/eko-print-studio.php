<?php
/**
 * Plugin Name:       Eko Print Studio for WooCommerce
 * Plugin URI:        https://github.com/alexsulino/eko-print-studio
 * Description:       Thin commercial adapter — personalize WooCommerce products with Eko Print Studio SDK. No editor logic inside WordPress.
 * Version:           0.8.1
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * Author:            Eko Print Studio
 * Text Domain:       eko-print-studio
 * WC requires at least: 7.0
 * WC tested up to:   9.0
 *
 * @package EkoPrintStudio
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
	exit;
}

define('EKO_PS_VERSION', '0.8.1');
define('EKO_PS_FILE', __FILE__);
define('EKO_PS_PATH', plugin_dir_path(__FILE__));
define('EKO_PS_URL', plugin_dir_url(__FILE__));
define('EKO_PS_BASENAME', plugin_basename(__FILE__));

/**
 * Architecture:
 * WooCommerce → this plugin → WooCommerce Adapter / Host Bridge → Eko Print Studio SDK → Core
 * This plugin never implements editor logic and never touches Core internals.
 */
require_once EKO_PS_PATH . 'bootstrap/autoload.php';

add_action('plugins_loaded', static function (): void {
	if (!class_exists('WooCommerce')) {
		add_action('admin_notices', static function (): void {
			echo '<div class="notice notice-error"><p>';
			echo esc_html__('Eko Print Studio requires WooCommerce to be active.', 'eko-print-studio');
			echo '</p></div>';
		});
		return;
	}

	\EkoPrintStudio\Bootstrap\Plugin::instance()->boot();
});

register_activation_hook(__FILE__, static function (): void {
	\EkoPrintStudio\Bootstrap\Activator::activate();
});

register_deactivation_hook(__FILE__, static function (): void {
	\EkoPrintStudio\Bootstrap\Activator::deactivate();
});
