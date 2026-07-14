<?php
/**
 * Dedicated editor shell page — loads remote editor URL with commerce query params.
 * No editor logic; host/bridge only.
 */
declare(strict_types=1);

if (!defined('ABSPATH')) {
	exit;
}

$config = \EkoPrintStudio\Config\Settings::public_config();
$editor = (string) ($config['editorUrl'] ?? '');
$session = isset($_GET['sessionId']) ? sanitize_text_field(wp_unslash((string) $_GET['sessionId'])) : ''; // phpcs:ignore
$template = isset($_GET['templateId']) ? sanitize_text_field(wp_unslash((string) $_GET['templateId'])) : ''; // phpcs:ignore
$product = isset($_GET['productId']) ? sanitize_text_field(wp_unslash((string) $_GET['productId'])) : ''; // phpcs:ignore

$query = http_build_query(array_filter([
	'embed'      => 'page',
	'sessionId'  => $session,
	'templateId' => $template,
	'productId'  => $product,
	'theme'      => $config['theme'] ?? 'canva',
	'lang'       => $config['language'] ?? 'pt-BR',
	'hostOrigin' => home_url('/'),
]));

$src = $editor !== '' ? (rtrim($editor, '/') . (str_contains($editor, '?') ? '&' : '?') . $query) : '';
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo('charset'); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title><?php esc_html_e('Personalizar · Eko Print Studio', 'eko-print-studio'); ?></title>
	<style>
		html, body, iframe { margin: 0; height: 100%; width: 100%; border: 0; }
		.eko-ps-shell-missing { font-family: system-ui, sans-serif; padding: 2rem; }
	</style>
</head>
<body>
<?php if ($src === '') : ?>
	<div class="eko-ps-shell-missing">
		<p><?php esc_html_e('Configure a URL do Editor em WooCommerce → Eko Print Studio.', 'eko-print-studio'); ?></p>
	</div>
<?php else : ?>
	<iframe
		id="eko-ps-editor-frame"
		title="<?php esc_attr_e('Eko Print Studio', 'eko-print-studio'); ?>"
		src="<?php echo esc_url($src); ?>"
		allow="clipboard-read; clipboard-write"
	></iframe>
<?php endif; ?>
</body>
</html>
