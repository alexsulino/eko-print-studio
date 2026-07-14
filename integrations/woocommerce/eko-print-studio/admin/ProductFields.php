<?php
declare(strict_types=1);

namespace EkoPrintStudio\Admin;

use EkoPrintStudio\Config\Settings;
use EkoPrintStudio\Config\TemplateCatalog;

/**
 * Product → Template Master association via catalog select (IDs stay internal).
 */
final class ProductFields {
	public function register(): void {
		add_action('woocommerce_product_options_general_product_data', [$this, 'fields']);
		add_action('woocommerce_process_product_meta', [$this, 'save']);
		add_action('woocommerce_product_after_variable_attributes', [$this, 'variation_fields'], 10, 3);
		add_action('woocommerce_save_product_variation', [$this, 'save_variation'], 10, 2);
	}

	public function fields(): void {
		global $post;
		$product_id = (int) ($post->ID ?? 0);
		$current = (string) get_post_meta($product_id, Settings::META_TEMPLATE_ID, true);
		$options = TemplateCatalog::with_current_value(TemplateCatalog::select_options(), $current);

		echo '<div class="options_group">';
		woocommerce_wp_select([
			'id'          => Settings::META_TEMPLATE_ID,
			'label'       => __('Template Master', 'eko-print-studio'),
			'options'     => $options,
			'value'       => $current,
			'desc_tip'    => true,
			'description' => __('Selecione o Template Master do Eko Print Studio. O ID interno é gravado automaticamente.', 'eko-print-studio'),
		]);
		woocommerce_wp_select([
			'id'      => Settings::META_TEMPLATE_MODE,
			'label'   => __('Template mode', 'eko-print-studio'),
			'options' => [
				'single'     => __('Unique template', 'eko-print-studio'),
				'variation'  => __('Per variation (prepared)', 'eko-print-studio'),
				'dynamic'    => __('Dynamic (prepared)', 'eko-print-studio'),
				'category'   => __('Category (prepared)', 'eko-print-studio'),
				'collection' => __('Collection (prepared)', 'eko-print-studio'),
			],
		]);
		echo '</div>';
	}

	public function save(int $post_id): void {
		if (isset($_POST[Settings::META_TEMPLATE_ID])) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
			$value = sanitize_text_field(wp_unslash((string) $_POST[Settings::META_TEMPLATE_ID])); // phpcs:ignore
			if ($value === '') {
				delete_post_meta($post_id, Settings::META_TEMPLATE_ID);
			} else {
				update_post_meta($post_id, Settings::META_TEMPLATE_ID, $value);
			}
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
		$current = (string) get_post_meta($variation_id, Settings::META_TEMPLATE_ID, true);
		$options = TemplateCatalog::with_current_value(TemplateCatalog::select_options(), $current);

		woocommerce_wp_select([
			'id'            => Settings::META_TEMPLATE_ID . "_{$loop}",
			'name'          => Settings::META_TEMPLATE_ID . "[{$loop}]",
			'value'         => $current,
			'label'         => __('Template Master', 'eko-print-studio'),
			'options'       => $options,
			'wrapper_class' => 'form-row form-row-full',
		]);
	}

	public function save_variation(int $variation_id, int $loop): void {
		if (!isset($_POST[Settings::META_TEMPLATE_ID][$loop])) { // phpcs:ignore
			return;
		}
		$value = sanitize_text_field(wp_unslash((string) $_POST[Settings::META_TEMPLATE_ID][$loop])); // phpcs:ignore
		if ($value === '') {
			delete_post_meta($variation_id, Settings::META_TEMPLATE_ID);
		} else {
			update_post_meta($variation_id, Settings::META_TEMPLATE_ID, $value);
		}
	}
}
