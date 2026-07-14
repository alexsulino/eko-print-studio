<?php
declare(strict_types=1);

namespace EkoPrintStudio\Services;

/**
 * Short-lived HMAC tokens for cross-origin editor → REST persistence.
 * Avoids relying on cookies inside the editor iframe on another subdomain.
 */
final class SessionToken {
	private const TRANSIENT_PREFIX = 'eko_ps_tok_';
	private const TTL = 12 * HOUR_IN_SECONDS;

	public static function issue(int $product_id = 0): string {
		$token = wp_generate_password(40, false, false);
		set_transient(
			self::TRANSIENT_PREFIX . hash('sha256', $token),
			[
				'productId' => $product_id,
				'userId'    => get_current_user_id(),
				'issuedAt'  => time(),
			],
			self::TTL
		);
		return $token;
	}

	public static function validate(string $token): bool {
		if ($token === '') {
			return false;
		}
		$payload = get_transient(self::TRANSIENT_PREFIX . hash('sha256', $token));
		return is_array($payload);
	}

	/** Extend TTL on successful use. */
	public static function touch(string $token): void {
		$key = self::TRANSIENT_PREFIX . hash('sha256', $token);
		$payload = get_transient($key);
		if (is_array($payload)) {
			set_transient($key, $payload, self::TTL);
		}
	}
}
