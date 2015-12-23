// Plugins
var gulp = require('gulp'),

    // Styles
    sass = require('gulp-sass'),
    autoprefix = require('gulp-autoprefixer'),
    minify = require('gulp-minify-css'),
    rename = require('gulp-rename'),

    // Scripts
    uglify = require('gulp-uglify'),
    strip = require('gulp-strip-debug'),
    concat = require('gulp-concat'),
    include = require('gulp-include'),

    // Images
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),

    // Other
    util = require('gulp-util'),
    del = require('del'),
    notify = require('gulp-notify'),
    notifier = require('node-notifier'),
    merge = require('merge-stream'),
    sequence = require('run-sequence'),
    combinemq = require('gulp-combine-media-queries'),
    ftp = require('vinyl-ftp'),
    hostconfig = require('./hostconfig.json');

// Errors
var logErrors = function(error) {
    console.log("An error has occured:");
    console.log(error.toString());

    notifier.notify({message: 'Errors occured - check log'});

    util.log(error);
    this.emit('end');
};

/* -------------------------
    Tasks
------------------------- */

// Styles
gulp.task('styles', function() {

    var production = ['build','deploy'].indexOf(this.seq.slice(-1)[0]) !== -1;

    return gulp.src('assets/sass/**/*.scss')
        .pipe(sass({sourceComments: 'normal'}))
        .on('error', logErrors)
        .pipe(autoprefix({browsers: 'last 4 versions'}))
        .pipe(production ? combinemq() : util.noop())
        .pipe(production ? minify() : util.noop())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('assets/css'))
});

// Scripts
gulp.task('scripts', function() {

    var production = ['build','deploy'].indexOf(this.seq.slice(-1)[0]) !== -1;

    return gulp.src('assets/js/src/*.js')
        .pipe(include()).on('error', console.log)
        .pipe(production ? strip() : util.noop())
        .pipe(production ? uglify() : util.noop())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('assets/js'));
});

// Images
gulp.task('images', function(){
    return gulp.src('assets/img/**/*')
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
        .pipe(gulp.dest('assets/img'));
});

// Watch
gulp.task('watch', function() {
    gulp.watch('assets/sass', ['styles']);
    gulp.watch('assets/js', ['scripts']);
});

// Default
gulp.task('default', function(callback) {

    sequence(
        ['styles', 'scripts'],
        'watch',
        callback);

    notifier.notify({message: 'Tasks complete'});
});

/* -------------------------
    Build
------------------------- */

// Define build files
var build = {

    // Ignore files we don't need
    files: [
        '**/*',
        '!{_build,_build/**}',
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

}

// Build task
gulp.task('build', ['styles', 'scripts', 'images'], function() {
    gulp.src(build.files, {base: '.'})
        .pipe(gulp.dest('_build'));
});

/* -------------------------
    Deployment
------------------------- */

var deployment = {

    dev: {
        host: hostconfig.dev.host,
        user: hostconfig.dev.user,
        password: hostconfig.dev.password,
        destination: hostconfig.dev.destination,
        log: util.log
    },

    production: {
        host: hostconfig.production.host,
        user: hostconfig.production.user,
        password: hostconfig.production.password,
        destination: hostconfig.production.destination,
        log: util.log
    }

}

// Deploy task
gulp.task('deploy', ['styles', 'scripts', 'images'], function() {

    // Must run with flag to define environment [dev|production]
    if(util.env.production) {
        env = 'production';
    } else if(util.env.dev) {
        env = 'dev';
    } else {
        throw new util.PluginError({
            plugin: 'Environment',
            message: 'Please define development environment (dev|production)'
        });
    }

    var stream = gulp.src(build.files, { base: '.', buffer: false }),
        config = deployment[env],
        conn = ftp.create(config);

    stream = stream
        .pipe(conn.newer(config.destination))
        .pipe(conn.dest(config.destination));

    return stream;

})