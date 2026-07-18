<?php
declare(strict_types=1);

namespace EkoPrintStudio\Frontend;

use EkoPrintStudio\Config\Settings;

/**
 * Lazy-load host bridge assets on product / cart / checkout / editor pages.
 */
final class Assets {
	public function register(): void {
		add_action('wp_enqueue_scripts', [$this, 'maybe_enqueue']);
	}

	public function maybe_enqueue(): void {
		// Bridge opens editor from PDP, cart, checkout, and dedicated editor shell.
		$needs_bridge = is_product() || is_cart() || is_checkout() || $this->is_editor_page();
		$needs_preview_css = $needs_bridge;

		if (!$needs_preview_css) {
			return;
		}

		$product = is_product() ? wc_get_product(get_the_ID()) : null;
		$template_id = $product ? (string) get_post_meta($product->get_id(), Settings::META_TEMPLATE_ID, true) : '';

		if (is_product() && $template_id === '') {
			return;
		}

		wp_enqueue_style(
			'eko-ps-frontend',
			EKO_PS_URL . 'assets/css/frontend.css',
			[],
			EKO_PS_VERSION
		);

		if (!$needs_bridge) {
			return;
		}

		wp_enqueue_script(
			'eko-ps-host',
			EKO_PS_URL . 'assets/js/host-bridge.js',
			[],
			EKO_PS_VERSION,
			true
		);

		wp_localize_script('eko-ps-host', 'EkoPsHost', [
			'config'     => Settings::public_config(),
			'restUrl'    => esc_url_raw(rest_url('eko-print/v1')),
			'nonce'      => wp_create_nonce('wp_rest'),
			'productId'  => $product ? (string) $product->get_id() : '',
			'templateId' => $template_id,
			'i18n'       => [
				'personalize' => (string) Settings::get('button_label'),
				'edit'        => __('Editar Personalização', 'eko-print-studio'),
				'completed'   => __('Personalização concluída', 'eko-print-studio'),
				'updatedAt'   => __('Última atualização:', 'eko-print-studio'),
				'personalized'=> __('Personalizado', 'eko-print-studio'),
				'viewCart'    => __('Ver carrinho', 'eko-print-studio'),
				'saving'      => __('Salvando personalização…', 'eko-print-studio'),
				'error'       => __('Não foi possível abrir o editor.', 'eko-print-studio'),
				'added'       => __('Personalização adicionada ao carrinho.', 'eko-print-studio'),
			],
			'cartUrl'    => wc_get_cart_url(),
		]);
	}

	private function is_editor_page(): bool {
		return (bool) get_query_var('eko_ps_editor', false);
	}
}
