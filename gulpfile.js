// Plugins
var gulp       = require('gulp'),
    autoprefix = require('gulp-autoprefixer'),
    minify     = require('gulp-clean-css'),
    combinemq  = require('gulp-combine-mq'),
    imagemin   = require('gulp-imagemin'),
    include    = require('gulp-include'),
    rename     = require('gulp-rename'),
    sass       = require('gulp-sass'),
    strip      = require('gulp-strip-debug'),
    uglify     = require('gulp-uglify'),
    gutil      = require('gulp-util'),

    del        = require('del'),
    ftp        = require('vinyl-ftp'),
    notifier   = require('node-notifier'),
    sequence   = require('run-sequence'),

    hostconfig = require('./hostconfig.json');

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
        '_packaged',
        '_packaged/**',
        'assets/css/*.css',
        'assets/js/*.min.js'
    ]);
});

// Styles
gulp.task('styles', function() {

    var production = ['build'].indexOf(this.seq.slice(-1)[0]) !== -1;

    return gulp.src('assets/sass/**/*.scss')
        .pipe(sass({sourceComments: 'normal'}))
        .on('error', logErrors)
        .pipe(autoprefix({browsers: 'last 4 versions'}))
        .pipe(combinemq())
        .pipe(production ? minify() : gutil.noop())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('assets/css'))
});

// Scripts
gulp.task('scripts', function() {

    var production = ['build'].indexOf(this.seq.slice(-1)[0]) !== -1;

    return gulp.src('assets/js/src/*.js')
        .pipe(include()).on('error', console.log)
        .pipe(production ? strip() : gutil.noop())
        .pipe(production ? uglify() : gutil.noop())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('assets/js'));
});

// Images
gulp.task('images', function(){
    return gulp.src('assets/img/**/*')
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}]
        }))
        .pipe(gulp.dest('assets/img'));
});

// Watch
gulp.task('watch', function() {
    gulp.watch('assets/sass/**/*.scss', ['styles']);
    gulp.watch('assets/js/**/*.js', ['scripts']);
    gulp.watch('assets/img/**/*', ['images']);
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

var build = {

    files: [
        '**/*',
        '!{_packaged,_packaged/**}',
        '!{vendor,vendor/**}',
        '!{assets/sass,assets/sass/**}',
        '!{assets/js/lib,assets/js/lib/**,assets/js/src,assets/js/src/**,assets/js/vendor,assets/js/vendor/**}',
        '!{templates,templates/**}',
        '!{node_modules,node_modules/**}',
        '!package.json',
        '!hostconfig.json',
        '!gulpfile.js',
        '!composer.json',
        '!composer.lock',
        '!README.md'
    ],

    dev: {
        host: hostconfig.dev.host,
        user: hostconfig.dev.user,
        password: hostconfig.dev.password,
        destination: hostconfig.dev.destination,
        log: gutil.log
    },

    production: {
        host: hostconfig.production.host,
        user: hostconfig.production.user,
        password: hostconfig.production.password,
        destination: hostconfig.production.destination,
        log: gutil.log
    }

}

// Package task
// Package build files without uploading
gulp.task('package', ['build'], function() {
    gulp.src(build.files, {base: '.'})
        .pipe(gulp.dest('_build'));
});

// Deploy task
// Deploy build files to server, to either dev or production environment
gulp.task('deploy', function() {

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

    var stream = gulp.src(build.files, { base: '.', buffer: false }),
        config = build[env],
        conn = ftp.create(config);

    stream = stream
        .pipe(conn.newer(config.destination))
        .pipe(conn.dest(config.destination));

    return stream;

})