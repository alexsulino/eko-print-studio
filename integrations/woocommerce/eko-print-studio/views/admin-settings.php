<?php
declare(strict_types=1);

if (!defined('ABSPATH') || !current_user_can('manage_woocommerce')) {
	return;
}

/** @var array<string,mixed> $settings */
$settings = $settings ?? \EkoPrintStudio\Config\Settings::all();
/** @var list<array{id:string,name:string,category?:string,status:string}> $templates */
$templates = $templates ?? \EkoPrintStudio\Config\TemplateCatalog::published();
$sync_flag = isset($_GET['eko_sync']) ? (string) $_GET['eko_sync'] : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
?>
<div class="wrap">
	<h1><?php echo esc_html__('Eko Print Studio', 'eko-print-studio'); ?></h1>
	<p><?php echo esc_html__('Configure apenas a ponte comercial. A inteligência do editor fica no SDK.', 'eko-print-studio'); ?></p>

	<?php if ($sync_flag === '1') : ?>
		<div class="notice notice-success is-dismissible"><p>
			<?php
			echo esc_html(sprintf(
				/* translators: %d: template count */
				__('Catálogo sincronizado: %d template(s) Master.', 'eko-print-studio'),
				(int) ($_GET['eko_sync_count'] ?? 0) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			));
			?>
		</p></div>
	<?php elseif ($sync_flag === '0') : ?>
		<div class="notice notice-error is-dismissible"><p>
			<?php
			echo esc_html(sprintf(
				/* translators: %s: error message */
				__('Falha ao sincronizar templates: %s', 'eko-print-studio'),
				sanitize_text_field(rawurldecode((string) ($_GET['eko_sync_error'] ?? ''))) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			));
			?>
		</p></div>
	<?php endif; ?>

	<form method="post" action="options.php">
		<?php settings_fields('eko_ps_settings_group'); ?>
		<table class="form-table" role="presentation">
			<tr>
				<th scope="row"><label for="eko_editor_url"><?php esc_html_e('URL do Editor', 'eko-print-studio'); ?></label></th>
				<td>
					<input name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[editor_url]" id="eko_editor_url" type="url" class="regular-text" value="<?php echo esc_attr((string) $settings['editor_url']); ?>" placeholder="https://editor.seudominio.com" />
					<p class="description"><?php esc_html_e('URL pública do app Eko Print Studio (React).', 'eko-print-studio'); ?></p>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e('Modo de abertura', 'eko-print-studio'); ?></th>
				<td>
					<select name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[embed_mode]">
						<?php foreach (['modal' => 'Modal', 'iframe' => 'Iframe', 'page' => 'Página dedicada'] as $value => $label) : ?>
							<option value="<?php echo esc_attr($value); ?>" <?php selected((string) $settings['embed_mode'], $value); ?>><?php echo esc_html($label); ?></option>
						<?php endforeach; ?>
					</select>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="eko_language"><?php esc_html_e('Idioma', 'eko-print-studio'); ?></label></th>
				<td><input name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[language]" id="eko_language" type="text" value="<?php echo esc_attr((string) $settings['language']); ?>" /></td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e('Tema', 'eko-print-studio'); ?></th>
				<td>
					<select name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[theme]">
						<?php foreach (['canva', 'light', 'dark'] as $theme) : ?>
							<option value="<?php echo esc_attr($theme); ?>" <?php selected((string) $settings['theme'], $theme); ?>><?php echo esc_html($theme); ?></option>
						<?php endforeach; ?>
					</select>
				</td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e('Ambiente', 'eko-print-studio'); ?></th>
				<td>
					<select name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[environment]">
						<option value="production" <?php selected((string) $settings['environment'], 'production'); ?>><?php esc_html_e('Production', 'eko-print-studio'); ?></option>
						<option value="development" <?php selected((string) $settings['environment'], 'development'); ?>><?php esc_html_e('Development', 'eko-print-studio'); ?></option>
					</select>
				</td>
			</tr>
			<tr>
				<th scope="row"><label for="eko_timeout"><?php esc_html_e('Timeout (ms)', 'eko-print-studio'); ?></label></th>
				<td><input name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[timeout_ms]" id="eko_timeout" type="number" min="1000" value="<?php echo esc_attr((string) $settings['timeout_ms']); ?>" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="eko_autosave"><?php esc_html_e('Autosave (ms)', 'eko-print-studio'); ?></label></th>
				<td><input name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[autosave_ms]" id="eko_autosave" type="number" min="0" value="<?php echo esc_attr((string) $settings['autosave_ms']); ?>" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="eko_origin"><?php esc_html_e('Target Origin (postMessage)', 'eko-print-studio'); ?></label></th>
				<td><input name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[target_origin]" id="eko_origin" type="text" class="regular-text" value="<?php echo esc_attr((string) $settings['target_origin']); ?>" /></td>
			</tr>
			<tr>
				<th scope="row"><label for="eko_btn"><?php esc_html_e('Texto do botão', 'eko-print-studio'); ?></label></th>
				<td><input name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[button_label]" id="eko_btn" type="text" value="<?php echo esc_attr((string) $settings['button_label']); ?>" /></td>
			</tr>
			<tr>
				<th scope="row"><?php esc_html_e('Opções', 'eko-print-studio'); ?></th>
				<td>
					<label><input type="checkbox" name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[preview_enabled]" value="1" <?php checked(!empty($settings['preview_enabled'])); ?> /> <?php esc_html_e('Preview habilitado', 'eko-print-studio'); ?></label><br />
					<label><input type="checkbox" name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[require_custom]" value="1" <?php checked(!empty($settings['require_custom'])); ?> /> <?php esc_html_e('Exigir personalização no checkout', 'eko-print-studio'); ?></label><br />
					<label><input type="checkbox" name="<?php echo esc_attr(\EkoPrintStudio\Config\Settings::OPTION_KEY); ?>[debug]" value="1" <?php checked(!empty($settings['debug'])); ?> /> <?php esc_html_e('Debug / auditoria', 'eko-print-studio'); ?></label>
				</td>
			</tr>
		</table>
		<?php submit_button(__('Salvar configurações', 'eko-print-studio')); ?>
	</form>

	<hr />

	<h2><?php echo esc_html__('Templates Master', 'eko-print-studio'); ?></h2>
	<p><?php echo esc_html__('A lista abaixo alimenta o seletor no produto. Preferência: sincronizar do editor público (`/templates/catalog.json`). Sem sincronização, usa o catálogo embutido no plugin.', 'eko-print-studio'); ?></p>

	<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin-bottom:1em;">
		<input type="hidden" name="action" value="eko_ps_sync_templates" />
		<?php wp_nonce_field('eko_ps_sync_templates'); ?>
		<?php submit_button(__('Sincronizar templates do editor', 'eko-print-studio'), 'secondary', 'submit', false); ?>
	</form>

	<?php if ($templates === []) : ?>
		<p><em><?php echo esc_html__('Nenhum Template Master disponível.', 'eko-print-studio'); ?></em></p>
	<?php else : ?>
		<table class="widefat striped" style="max-width:720px;">
			<thead>
				<tr>
					<th><?php echo esc_html__('Nome', 'eko-print-studio'); ?></th>
					<th><?php echo esc_html__('Categoria', 'eko-print-studio'); ?></th>
					<th><?php echo esc_html__('Status', 'eko-print-studio'); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ($templates as $template) : ?>
					<tr>
						<td><?php echo esc_html((string) $template['name']); ?></td>
						<td><?php echo esc_html((string) ($template['category'] ?? '—')); ?></td>
						<td><?php echo esc_html((string) ($template['status'] ?? 'published')); ?></td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
	<?php endif; ?>
</div>
