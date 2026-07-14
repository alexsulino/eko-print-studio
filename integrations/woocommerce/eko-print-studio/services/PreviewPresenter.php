<?php
declare(strict_types=1);

namespace EkoPrintStudio\Services;

/**
 * Presents ExportProvider preview refs in Woo surfaces — no export / raster generation.
 * Consumes only cart/order `preview` payloads produced by the SDK.
 */
final class PreviewPresenter {
	/**
	 * @param mixed $preview
	 */
	public static function is_raster($preview): bool {
		if (!is_array($preview) || empty($preview['data'])) {
			return false;
		}
		$data = (string) $preview['data'];
		$mime = (string) ($preview['mimeType'] ?? '');
		$fidelity = (string) ($preview['fidelity'] ?? '');
		$filename = (string) ($preview['filename'] ?? '');

		if ($fidelity === 'raster') {
			return true;
		}
		if ($filename === 'preview.png') {
			return true;
		}
		if (str_starts_with($data, 'data:image')) {
			return true;
		}
		return str_contains($mime, 'image');
	}

	/**
	 * @param array<string,mixed> $preview
	 */
	public static function img_html(array $preview, string $class = 'eko-ps-preview-thumb', int $max_width = 96): string {
		if (!self::is_raster($preview)) {
			return '';
		}
		$alt = (string) ($preview['filename'] ?? 'preview.png');
		return sprintf(
			'<img class="%1$s" src="%2$s" alt="%3$s" loading="lazy" style="max-width:%4$dpx;height:auto;border-radius:6px;" />',
			esc_attr($class),
			esc_url((string) $preview['data']),
			esc_attr($alt !== '' ? $alt : 'preview.png'),
			max(32, $max_width)
		);
	}

	/**
	 * @param array<string,mixed> $cart CommerceCartPayload-like
	 */
	public static function document_name(array $cart): string {
		$name = (string) ($cart['summary']['documentName'] ?? '');
		return $name !== '' ? $name : __('Personalização', 'eko-print-studio');
	}
}
