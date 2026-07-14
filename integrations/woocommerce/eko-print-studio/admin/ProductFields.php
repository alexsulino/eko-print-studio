<?php
declare(strict_types=1);

namespace EkoPrintStudio\Admin;

use EkoPrintStudio\Config\Settings;

/**
 * Product → Template association (single / variation-ready).
 */
final class ProductFields {
	public function register(): void {
		add_action('woocommerce_product_options_general_product_data', [$this, 'fields']);
		add_action('woocommerce_process_product_meta', [$this, 'save']);
		add_action('woocommerce_product_after_variable_attributes', [$this, 'variation_fields'], 10, 3);
		add_action('woocommerce_save_product_variation', [$this, 'save_variation'], 10, 2);
	}

	public function fields(): void {
		echo '<div class="options_group">';
		woocommerce_wp_text_input([
			'id'          => Settings::META_TEMPLATE_ID,
			'label'       => __('Eko Template ID', 'eko-print-studio'),
			'desc_tip'    => true,
			'description' => __('Master template id from Eko Print Studio (DocumentProvider).', 'eko-print-studio'),
		]);
		woocommerce_wp_select([
			'id'      => Settings::META_TEMPLATE_MODE,
			'label'   => __('Template mode', 'eko-print-studio'),
			'options' => [
				'single'    => __('Unique template', 'eko-print-studio'),
				'variation' => __('Per variation (prepared)', 'eko-print-studio'),
				'dynamic'   => __('Dynamic (prepared)', 'eko-print-studio'),
				'category'  => __('Category (prepared)', 'eko-print-studio'),
				'collection'=> __('Collection (prepared)', 'eko-print-studio'),
			],
		]);
		echo '</div>';
	}

	public function save(int $post_id): void {
		if (isset($_POST[Settings::META_TEMPLATE_ID])) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
			update_post_meta(
				$post_id,
				Settings::META_TEMPLATE_ID,
				sanitize_text_field(wp_unslash((string) $_POST[Settings::META_TEMPLATE_ID])) // phpcs:ignore
			);
		}
		if (isset($_POST[Settings::META_TEMPLATE_MODE])) { // phpcs:ignore
			update_post_meta(
				$post_id,
				Settings::META_TEMPLATE_MODE,
				sanitize_text_field(wp_unslash((string) $_POST[Settings::META_TEMPLATE_MODE])) // phpcs:ignore
			);
		}
	}

	/**
	 * @param array<string,mixed> $variation_data
	 * @param \WP_Post $variation
	 */
	public function variation_fields(int $loop, array $variation_data, $variation): void {
		unset($variation_data);
		$variation_id = (int) $variation->ID;
		woocommerce_wp_text_input([
			'id'            => Settings::META_TEMPLATE_ID . "_{$loop}",
			'name'          => Settings::META_TEMPLATE_ID . "[{$loop}]",
			'value'         => (string) get_post_meta($variation_id, Settings::META_TEMPLATE_ID, true),
			'label'         => __('Eko Template ID', 'eko-print-studio'),
			'wrapper_class' => 'form-row form-row-full',
		]);
	}

	public function save_variation(int $variation_id, int $loop): void {
		if (!isset($_POST[Settings::META_TEMPLATE_ID][$loop])) { // phpcs:ignore
			return;
		}
		update_post_meta(
			$variation_id,
			Settings::META_TEMPLATE_ID,
			sanitize_text_field(wp_unslash((string) $_POST[Settings::META_TEMPLATE_ID][$loop])) // phpcs:ignore
		);
	}
}
