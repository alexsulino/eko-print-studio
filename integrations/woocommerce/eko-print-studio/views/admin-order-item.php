<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
	return;
}

/** @var string $session_id */
/** @var string $template_id */
/** @var string $version */
/** @var string $saved_at */
/** @var string $status */
/** @var array<string,mixed> $preview */
/** @var int $order_id */
/** @var int $item_id */
?>
<div class="eko-ps-order-panel">
	<strong><?php esc_html_e('Eko Print Studio', 'eko-print-studio'); ?></strong>
	<ul>
		<li><?php esc_html_e('Sessão:', 'eko-print-studio'); ?> <code><?php echo esc_html($session_id); ?></code></li>
		<li><?php esc_html_e('Template:', 'eko-print-studio'); ?> <code><?php echo esc_html($template_id); ?></code></li>
		<li><?php esc_html_e('Versão:', 'eko-print-studio'); ?> <code><?php echo esc_html($version); ?></code></li>
		<li><?php esc_html_e('Salvo em:', 'eko-print-studio'); ?> <?php echo esc_html($saved_at); ?></li>
		<li><?php esc_html_e('Status:', 'eko-print-studio'); ?> <?php echo esc_html($status); ?></li>
	</ul>
	<?php if (!empty($preview['data']) && (str_starts_with((string) $preview['data'], 'data:image') || str_contains((string) ($preview['mimeType'] ?? ''), 'image'))) : ?>
		<p><img src="<?php echo esc_url((string) $preview['data']); ?>" alt="" style="max-width:120px;height:auto;border:1px solid #ddd;" /></p>
	<?php else : ?>
		<p class="description"><?php esc_html_e('Preview de domínio disponível via SDK generateProductionPreview().', 'eko-print-studio'); ?></p>
	<?php endif; ?>
	<p>
		<button
			type="button"
			class="button button-primary eko-ps-reopen"
			data-order-id="<?php echo esc_attr((string) $order_id); ?>"
			data-item-id="<?php echo esc_attr((string) $item_id); ?>"
			data-session-id="<?php echo esc_attr($session_id); ?>"
		>
			<?php esc_html_e('Reabrir Personalização', 'eko-print-studio'); ?>
		</button>
		<button
			type="button"
			class="button eko-ps-open-editor"
			data-session-id="<?php echo esc_attr($session_id); ?>"
			data-template-id="<?php echo esc_attr($template_id); ?>"
		>
			<?php esc_html_e('Abrir Editor', 'eko-print-studio'); ?>
		</button>
	</p>
</div>
