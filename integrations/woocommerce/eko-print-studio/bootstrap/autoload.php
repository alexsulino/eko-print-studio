<?php
declare(strict_types=1);

namespace EkoPrintStudio\Bootstrap;

/**
 * Simple PSR-4-ish autoload for the plugin namespace.
 */
spl_autoload_register(static function (string $class): void {
	$prefix = 'EkoPrintStudio\\';
	if (strncmp($prefix, $class, strlen($prefix)) !== 0) {
		return;
	}

	$relative = substr($class, strlen($prefix));
	$relative_path = str_replace('\\', DIRECTORY_SEPARATOR, $relative) . '.php';

	$map = [
		'Bootstrap' => 'bootstrap',
		'Admin'     => 'admin',
		'Frontend'  => 'frontend',
		'Rest'      => 'rest',
		'Includes'  => 'includes',
		'Services'  => 'services',
		'Config'    => 'config',
		'Adapters'  => 'adapters',
	];

	$parts = explode(DIRECTORY_SEPARATOR, $relative_path, 2);
	$root  = $parts[0] ?? '';
	$rest  = $parts[1] ?? '';

	if (!isset($map[$root])) {
		$path = EKO_PS_PATH . 'includes' . DIRECTORY_SEPARATOR . $relative_path;
	} else {
		$path = EKO_PS_PATH . $map[$root] . DIRECTORY_SEPARATOR . $rest;
	}

	if (is_readable($path)) {
		require_once $path;
	}
});
