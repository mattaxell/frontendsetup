// Plugins
var fs 		    = require('fs'),
	gulp        = require('gulp'),
	autoprefix  = require('gulp-autoprefixer'),
	minify      = require('gulp-clean-css'),
	imagemin    = require('gulp-imagemin'),
	include     = require('gulp-include'),
	rename      = require('gulp-rename'),
	sass        = require('gulp-sass'),
	sourcemaps  = require('gulp-sourcemaps'),
	strip       = require('gulp-strip-debug'),
	uglify      = require('gulp-uglify'),
	gutil       = require('gulp-util'),
	browserSync = require('browser-sync'),
	del         = require('del'),
	ftp         = require('vinyl-ftp'),
	notifier    = require('node-notifier'),
	sequence    = require('run-sequence');

	if(fs.existsSync('./hostconfig.json')) {
		hostconfig = require('./hostconfig.json');
	}

// Current root project folder
// Personal workflow, used for creating proxy in BrowserSync task
// Hostname must match that of directory directly inside either '__pp' or '__wp' folder
var path = __dirname;
var dir = path.match(/(\/__[a-z]{2}\/)([^\/]*)/)[2];

// Errors
var logErrors = function (error) {
	notifier.notify({
		title: 'Gulp Task Error',
		message: 'Check the console.'
	});

	console.log('------------------------------------------------------------');
	console.log('Description: ' + error.messageOriginal);
	console.log('In file: ' + error.relativePath + ', on line: ' + error.line );
	console.log('------------------------------------------------------------');

	this.emit('end');
}

/* -------------------------
	Tasks
------------------------- */

gulp.task('clean', function(){
	return del([
		'__packaged',
		'__packaged/**',
		'assets/**',
	]);
});

// Styles
gulp.task('styles', function() {

	var production = this.seq.indexOf('build') != -1;

	return gulp.src('build/styles/**/*.scss')
		.pipe(production ? gutil.noop() : sourcemaps.init())
		.pipe(sass({outputStyle: 'compact'})).on('error', logErrors)
		.pipe(autoprefix({browsers: ['last 2 versions', '> 5%', 'Firefox ESR']}))
		.pipe(production ? minify() : gutil.noop())
		.pipe(production ? gutil.noop() : sourcemaps.write())
		.pipe(gulp.dest('assets/css'))
});

// Scripts
gulp.task('scripts', function() {

	var production = this.seq.indexOf('build') != -1;

	return gulp.src('build/js/*.js')
		.pipe(include()).on('error', console.log)
		.pipe(production ? strip() : gutil.noop())
		.pipe(production ? uglify() : gutil.noop())
		.pipe(gulp.dest('assets/js'));
});

// Images
gulp.task('images', function(){
	return gulp.src('build/img/**/*')
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [{removeViewBox: false}]
		}))
		.pipe(gulp.dest('assets/img'));
});

// Watch
gulp.task('watch', function() {
	gulp.watch('build/styles/**/*.scss', ['styles']);
	gulp.watch('build/js/**/*.js', ['scripts']);
	gulp.watch('build/img/**/*', ['images']);
});

// Default
gulp.task('default', function(callback) {
	sequence(
		['styles', 'scripts', 'images'],
		'watch',
		callback
	);
});

/* -------------------------
	BrowserSync
------------------------- */

gulp.task('reload-styles', ['styles'], function() {
	browserSync.reload('assets/css/main.css')
});

gulp.task('reload-scripts', ['scripts'], function() {
	browserSync.reload('assets/scripts/functions.js')
});

gulp.task('serve', ['styles'], function() {

	browserSync.init({
		// server: {
		// 	baseDir: "./"
		// }
		proxy: dir + ".dev"
	});

	gulp.watch("build/styles/**/*.scss", ['reload-styles'])
	gulp.watch("build/js/**/*.js", ['reload-scripts'])
	gulp.watch("*.php").on('change', browserSync.reload)
});

/* -------------------------
	Build
------------------------- */

gulp.task('build', function(callback) {
	sequence(
		'clean',
		['styles', 'scripts', 'images'],
		callback
	);
});

/* -------------------------
	Deployment
------------------------- */

var deploy = {

	files: [
		'**/*',
		'!{__packaged,__packaged/**}',
		'!{vendor,vendor/**}',
		'!{build,build/**}',
		'!{templates,templates/**}',
		'!{node_modules,node_modules/**}',
		'!package.json',
		'!hostconfig.json',
		'!gulpfile.js',
		'!composer.json',
		'!composer.lock',
		'!README.md'
	]

	// dev: {
	// 	host: hostconfig.dev.host,
	// 	user: hostconfig.dev.user,
	// 	password: hostconfig.dev.password,
	// 	destination: hostconfig.dev.destination,
	// 	log: gutil.log
	// },

	// production: {
	// 	host: hostconfig.production.host,
	// 	user: hostconfig.production.user,
	// 	password: hostconfig.production.password,
	// 	destination: hostconfig.production.destination,
	// 	log: gutil.log
	// }

}

// Package task
// Package build files without uploading
gulp.task('package', ['build'], function() {
	gulp.src(deploy.files, {base: '.'})
		.pipe(gulp.dest('__packaged'));
});

// Deploy task
// Deploy build files to server, to either dev or production environment
gulp.task('deploy', ['build'], function() {

	// Must run with flag to define environment [dev|production]
	if(gutil.env.production) {
		env = 'production';
	} else if(gutil.env.dev) {
		env = 'dev';
	} else {
		throw new gutil.PluginError({
			plugin: 'Environment',
			message: 'Please define development environment (dev|production)'
		});
	}

	var stream = gulp.src(deploy.files, { base: '.', buffer: false }),
		config = deploy[env],
		conn = ftp.create(config);

	stream = stream
		.pipe(conn.newer(config.destination))
		.pipe(conn.dest(config.destination));

	return stream;

})