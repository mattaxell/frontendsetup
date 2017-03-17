/* -------------------------
	Plugins
------------------------- */

var fs 		      = require('fs'),
	gulp          = require('gulp'),
	autoprefixer  = require('gulp-autoprefixer'),
	cache		  = require('gulp-cache'),
	minify        = require('gulp-clean-css'),
	imagemin      = require('gulp-imagemin'),
	include       = require('gulp-include'),
	notify        = require('gulp-notify'),
	rename        = require('gulp-rename'),
	sass          = require('gulp-sass'),
	sourcemaps    = require('gulp-sourcemaps'),
	strip         = require('gulp-strip-debug'),
	uglify        = require('gulp-uglify'),
	gutil         = require('gulp-util'),
	browserSync   = require('browser-sync'),
	del           = require('del');

/* -------------------------
	General
------------------------- */

// Current root project folder
// Personal workflow, used for creating proxy in BrowserSync task
// Hostname must match that of directory directly inside either '__pp' or '__wp' folder
var path = __dirname;
var dir = path.match(/(\/__[a-z]{2}\/)([^\/]*)/)[2];

// Errors
var reportError = function (error) {
	var lineNumber = (error.lineNumber) ? 'LINE ' + error.lineNumber + ' -- ' : '';

	notify({
		title: 'Task Failed [' + error.plugin + ']',
		message: lineNumber + 'See console.',
		sound: 'Sosumi' // See: https://github.com/mikaelbr/node-notifier#all-notification-options-with-their-defaults
	}).write(error);

	gutil.beep(); // Beep 'sosumi' again

	// Inspect the error object
	//console.log(error);

	// Easy error reporting
	//console.log(error.toString());

	// Pretty error reporting
	var report = '';
	var chalk = gutil.colors.white.bgRed;

	report += '------------------------------------------------------------\n';
	report += chalk('TASK:') + ' [' + error.plugin + ']\n';
	report += chalk('PROB:') + ' ' + error.messageOriginal + '\n';
	report += chalk('FILE:') + ' ' + error.relativePath + '\n';
	report += chalk('LINE:') + ' ' + error.line + '\n';
	report += '------------------------------------------------------------';
	if (error.lineNumber) { report += chalk('LINE:') + ' ' + error.lineNumber + '\n'; }
	if (error.fileName)   { report += chalk('FILE:') + ' ' + error.fileName + '\n'; }
	console.error(report);

	// Prevent the 'watch' task from stopping
	this.emit('end');
}

/* -------------------------
	Tasks
------------------------- */

// Clean
gulp.task('clean', function(){
	return del([
		'__packaged',
		'__packaged/**',
		'dist/**',
	]);
});

// Styles
gulp.task('styles', function() {

	var production = this.seq.indexOf('build') != -1;

	return gulp.src('src/styles/**/*.scss')
		.pipe(production ? gutil.noop() : sourcemaps.init())
		.pipe(sass({outputStyle: 'compact'})).on('error', reportError)
		.pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
		.pipe(production ? minify() : gutil.noop())
		.pipe(production ? gutil.noop() : sourcemaps.write())
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(gulp.dest('dist/css'))
		.pipe(notify({ message: 'Styles task complete' }));
});

// Scripts
gulp.task('scripts', function() {

	var production = this.seq.indexOf('build') != -1;

	return gulp.src('src/js/*.js')
		.pipe(include()).on('error', console.log)
		.pipe(production ? strip() : gutil.noop())
		.pipe(production ? uglify() : gutil.noop())
		.pipe(gulp.dest('dist/js'))
		.pipe(notify({ message: 'Scripts task complete' }));
});

// Images
gulp.task('images', function(){
	return gulp.src('src/img/**/*')
		.pipe(cache(imagemin({
			optimizationLevel: 5,
			progressive: true,
			interlaced: true,
			svgoPlugins: [{removeViewBox: false}]
		})))
		.pipe(gulp.dest('dist/img'))
		.pipe(notify({ message: 'Image task complete' }));
});

// Watch
gulp.task('watch', function() {
	gulp.watch('src/styles/**/*.scss', ['styles']);
	gulp.watch('src/js/**/*.js', ['scripts']);
	gulp.watch('src/img/**/*', ['images']);
});

// Default
gulp.task('default', ['styles', 'scripts', 'images'], function() {
	gulp.start('watch');
});

/* -------------------------
	BrowserSync
------------------------- */

gulp.task('reload-styles', ['styles'], function() {
	browserSync.reload('dist/css/main.css')
});

gulp.task('reload-scripts', ['scripts'], function() {
	browserSync.reload('dist/scripts/functions.js')
});

gulp.task('serve', ['styles'], function() {

	browserSync.init({
		// server: {
		// 	baseDir: "./"
		// }
		proxy: dir + ".dev"
	});

	gulp.watch("src/styles/**/*.scss", ['reload-styles'])
	gulp.watch("src/js/**/*.js", ['reload-scripts'])
	gulp.watch("*.php").on('change', browserSync.reload)
});

/* -------------------------
	Build
------------------------- */

gulp.task('build', ['clean'], function() {
	gulp.start('styles', 'scripts', 'images');
});

/* -------------------------
	Deployment
------------------------- */

var deploy = {

	files: [
		'**/*',
		'!{__packaged,__packaged/**}',
		'!{vendor,vendor/**}',
		'!{src,src/**}',
		'!{templates,templates/**}',
		'!{node_modules,node_modules/**}',
		'!package.json',
		'!hostconfig.json',
		'!gulpfile.js',
		'!composer.json',
		'!composer.lock',
		'!README.md'
	]

}

// Package task
// Package build files ready for uploading
gulp.task('package', ['build'], function() {
	gulp.src(deploy.files, {base: '.'})
		.pipe(gulp.dest('__packaged'));
});