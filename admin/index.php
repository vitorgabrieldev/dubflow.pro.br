<?php
	$name = "Admin - Siscobe";

	/**
	 * Get the path to a versioned Mix file.
	 *
	 * @param  string $path
	 *
	 * @return mixed
	 */
	function mix($path)
	{
		$manifestPath = __DIR__ . '/mix-manifest.json';

		if( !file_exists($manifestPath) )
		{
			return $path;
		}

		$manifests = @json_decode(file_get_contents($manifestPath), true);

		if( !is_array($manifests) )
		{
			return $path;
		}

		return isset($manifests[$path]) ? $manifests[$path] : $path;
	}
?>
<!DOCTYPE html>
<html>
<head>
	<base href="/">
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	<meta name="viewport" content="width=device-width, initial-scale=1">

	<title><?php echo $name; ?></title>

	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
	<meta name="format-detection" content="telephone=no">
	<meta name="msapplication-tap-highlight" content="no">
	<link rel="shortcut icon" type="image/png" href="images/logos/32x32.png">
	<link rel="apple-touch-icon-precomposed" href="images/logos/57x57.png">
	<link rel="apple-touch-icon-precomposed" sizes="76x76" href="images/logos/76x76.png">
	<link rel="apple-touch-icon-precomposed" sizes="120x120" href="images/logos/120x120.png">
	<link rel="apple-touch-icon-precomposed" sizes="152x152" href="images/logos/152x152.png">
	<link rel="apple-touch-icon-precomposed" sizes="180x180" href="images/logos/180x180.png">

	<meta name="application-name" content="<?php echo $name; ?>">
	<meta name="msapplication-TileColor" content="#ffffff">
	<meta name="msapplication-TileImage" content="images/logos/180x180.png">
	<meta name="msapplication-config" content="none">

	<link href="<?php echo mix('/css/antd.css'); ?>" rel="stylesheet" type="text/css">
	<link href="<?php echo mix('/css/app.css'); ?>" rel="stylesheet" type="text/css">
</head>
<body>
<div id="root"></div>
<script src="<?php echo mix('/js/app.js'); ?>"></script>
</body>
</html>
