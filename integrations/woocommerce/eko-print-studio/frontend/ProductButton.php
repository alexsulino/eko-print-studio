<?php
declare(strict_types=1);

namespace EkoPrintStudio\Frontend;

use EkoPrintStudio\Config\Settings;

/**
 * Injects “Personalizar” + PDP personalization status shell on the product page.
 */
final class ProductButton {
	public function register(): void {
		add_action('woocommerce_after_add_to_cart_button', [$this, 'render'], 20);
		add_shortcode('eko_personalize', [$this, 'shortcode']);
		add_action('init', [$this, 'editor_endpoint']);
		add_filter('query_vars', static function (array $vars): array {
			$vars[] = 'eko_ps_editor';
			return $vars;
		});
		add_filter('template_include', [$this, 'editor_template'], 99);
	}

	public function editor_endpoint(): void {
		add_rewrite_rule('^eko-print-studio/editor/?$', 'index.php?eko_ps_editor=1', 'top');
	}

	public function editor_template(string $template): string {
		if (!get_query_var('eko_ps_editor')) {
			return $template;
		}
		$path = EKO_PS_PATH . 'templates/editor-shell.php';
		return is_readable($path) ? $path : $template;
	}

	public function render(): void {
		global $product;
		if (!$product || !is_a($product, 'WC_Product')) {
			return;
		}
		$template_id = (string) get_post_meta($product->get_id(), Settings::META_TEMPLATE_ID, true);
		if ($template_id === '') {
			return;
		}

		echo self::markup((string) $product->get_id(), $template_id, (string) Settings::get('button_label'));
	}

	/** @param array<string,string> $atts */
	public function shortcode(array $atts = []): string {
		$atts = shortcode_atts([
			'product_id' => (string) get_the_ID(),
			'label'      => (string) Settings::get('button_label'),
		], $atts, 'eko_personalize');

		$product_id = (int) $atts['product_id'];
		$template_id = (string) get_post_meta($product_id, Settings::META_TEMPLATE_ID, true);
		if ($template_id === '') {
			return '';
		}

		return self::markup((string) $product_id, $template_id, (string) $atts['label']);
	}

	private static function markup(string $product_id, string $template_id, string $label): string {
		return sprintf(
			'<div class="eko-ps-pdp" data-eko-pdp data-product-id="%1$s" data-template-id="%2$s">' .
			'<button type="button" class="button alt eko-ps-personalize-btn" data-eko-personalize data-product-id="%1$s" data-template-id="%2$s">%3$s</button>' .
			'<div class="eko-ps-pdp-status" data-eko-pdp-status hidden></div>' .
			'<div id="eko-ps-host-root" class="eko-ps-host-root" hidden></div>' .
			'</div>',
			esc_attr($product_id),
			esc_attr($template_id),
			esc_html($label)
		);
	}
}
