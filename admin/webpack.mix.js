const mix         = require('laravel-mix');
const public_path = './';

// Default config
mix.options({
	processCssUrls: false
});

mix.webpackConfig({
	watchOptions: {
		ignored: /node_modules/
	}
});

mix.babelConfig({
	'plugins': ['@babel/plugin-proposal-class-properties']
});

// Set public path
mix.setPublicPath(public_path);

// Disable success notifications
mix.disableNotifications();

// Show config
//console.log(mix.config);

const assets_path = {
	source: 'assets/',
	css   : 'css/',
	js    : 'js/',
	fonts : 'fonts/',
	images: 'images/',
};

/*
 |--------------------------------------------------------------------------
 | Mix Asset Management
 |--------------------------------------------------------------------------
 |
 | Mix provides a clean, fluent API for defining some Webpack build steps
 | for your Laravel application. By default, we are compiling the Sass
 | file for your application, as well as bundling up your JS files.
 |
 */

mix
.less(assets_path.source + 'less/antd.less', assets_path.css + 'antd.css', {
	javascriptEnabled: true
})

.sass(assets_path.source + 'sass/app.scss', assets_path.css + 'app.css')

.react([
	assets_path.source + 'js/app.js',
], assets_path.js + 'app.js')

// Copy font's folder
.copyDirectory(assets_path.source + 'fonts/', assets_path.fonts)

// Copy images's folder
.copyDirectory(assets_path.source + 'images/', assets_path.images)

// Copy iconfont
.copy(assets_path.source + 'icons/iconfont/iconfont.js', assets_path.js + 'iconfont.js')

.browserSync({
	proxy: process.env.REACT_APP_PROXY_URL,
	files: [
		assets_path.js + '**/*.js',
		assets_path.css + '**/*.css'
	],
	open: false
});

if( mix.inProduction() )
{
	mix.version();
}
