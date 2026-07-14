<?php
declare(strict_types=1);

if (!defined('ABSPATH')) {
	return;
}

use EkoPrintStudio\Services\PreviewPresenter;

/** @var string $session_id */
/** @var string $template_id */
/** @var string $version */
/** @var string $saved_at */
/** @var string $status */
/** @var array<string,mixed> $preview */
/** @var int $order_id */
/** @var int $item_id */

$is_raster = PreviewPresenter::is_raster($preview);
$document_name = '';
if (!empty($preview['domainData']) && is_string($preview['domainData'])) {
	$decoded = json_decode($preview['domainData'], true);
	if (is_array($decoded) && !empty($decoded['metadata']['name'])) {
		$document_name = (string) $decoded['metadata']['name'];
	}
}
?>
<div class="eko-ps-order-panel">
	<strong><?php esc_html_e('Eko Print Studio', 'eko-print-studio'); ?></strong>
	<ul>
		<li><?php esc_html_e('Sessão:', 'eko-print-studio'); ?> <code><?php echo esc_html($session_id); ?></code></li>
		<li><?php esc_html_e('Template:', 'eko-print-studio'); ?> <code><?php echo esc_html($template_id); ?></code></li>
		<li><?php esc_html_e('Versão:', 'eko-print-studio'); ?> <code><?php echo esc_html($version); ?></code></li>
		<li><?php esc_html_e('Salvo em:', 'eko-print-studio'); ?> <?php echo esc_html($saved_at); ?></li>
		<li><?php esc_html_e('Status:', 'eko-print-studio'); ?> <?php echo esc_html($status); ?></li>
		<?php if ($document_name !== '') : ?>
			<li><?php esc_html_e('Arte:', 'eko-print-studio'); ?> <?php echo esc_html($document_name); ?></li>
		<?php endif; ?>
	</ul>
	<?php if ($is_raster) : ?>
		<p class="eko-ps-order-preview">
			<?php echo PreviewPresenter::img_html($preview, 'eko-ps-order-thumb', 140); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</p>
		<p class="description"><?php esc_html_e('Miniatura oficial (preview.png) — sem regeneração no admin.', 'eko-print-studio'); ?></p>
	<?php else : ?>
		<p class="description"><?php esc_html_e('Preview legado (domínio). Pedidos novos incluem preview.png raster.', 'eko-print-studio'); ?></p>
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
