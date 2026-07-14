<?php
declare(strict_types=1);

if (!defined('ABSPATH') || !current_user_can('manage_woocommerce')) {
	return;
}

/** @var array<string,mixed> $settings */
$settings = $settings ?? \EkoPrintStudio\Config\Settings::all();
?>
<div class="wrap">
	<h1><?php echo esc_html__('Eko Print Studio', 'eko-print-studio'); ?></h1>
	<p><?php echo esc_html__('Configure apenas a ponte comercial. A inteligência do editor fica no SDK.', 'eko-print-studio'); ?></p>

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
</div>
