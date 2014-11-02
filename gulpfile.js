// Dependencies
// ============

var gulp = require('gulp'),

    // CSS stuff
    sass = require('gulp-sass'),
    autoprefix = require('gulp-autoprefixer'),
    minify = require('gulp-minify-css'),

    // Javascript stuff
    uglify = require('gulp-uglify'),
    strip = require('gulp-strip-debug'),
    concat = require('gulp-concat'),

    // Images
    imagemin = require('gulp-imagemin'),
    cache = require('gulp-cache'),

    // Other
    util = require('gulp-util'),
    clean = require('gulp-clean'),
    notify = require('gulp-notify');

// Assets
// ======

var paths = {
    assets: {
        styles: {
            dir: 'assets/styles',
            files: [
                'assets/styles/**/*.scss',
                '!assets/styles/login.scss'
            ],
            login: 'assets/styles/login.scss'
        },
        js: {
            dir: 'assets/js/',
            files: [
                'assets/js/vendor/**/*.js',
                'assets/js/src/**/*.js',
                'assets/js/main.js'
            ],
        },
        img: {
            dir: 'assets/img',
            files: 'assets/img/**/*'
        }
    },
    public: {
        styles: 'public/styles',
        js: 'public/js',
        img: 'public/img',
    }
}

// General Settings
// ================
var settings = {
    autoprefix: {
        versions: 'last 10 version'
    }
}

// Styles task
// ===========
// Grabs everything inside the styles & sprites directories, concantinates
// and compiles scss, builds sprites, and then outputs them to their
// respective target directories.

gulp.task('styles', function() {
    gulp.src(paths.assets.styles.files)
        .pipe(sass())
        .pipe(autoprefix(settings.autoprefix.versions))
        .pipe(gulp.dest(paths.public.styles))
        .pipe(notify('Styles task complete.'));
});

// Login styles task
// =================

gulp.task('login-styles', function() {
    gulp.src(paths.assets.styles.login)
        .pipe(sass())
        .pipe(autoprefix(settings.autoprefix.versions))
        .pipe(gulp.dest(paths.public.styles))
        .pipe(notify('Styles task complete.'));
});

// Javascript task
// ===============
// Grabs everything inside the js directory, concantinates and minifies,
// and then outputs them to the target directory.

gulp.task('js', function() {
    gulp.src(paths.assets.js.files)
        .pipe(concat('main.min.js'))
        .pipe(gulp.dest(paths.public.js))
        .pipe(notify('JS task complete.'));
});

// Image task
// ==========
// Grabs everything inside the img directory, optimises each image,
// and then outputs them to the target directory.

gulp.task('img', function() {
    gulp.src(paths.assets.img.files)
        .pipe(cache(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true })))
        .pipe(gulp.dest(paths.public.img));
});

// Cache-buster task
// =================
// Completely clear the cache to stop image-min outputting oncorrect image names etc

gulp.task('clear', function (done) {
    return cache.clearAll(done);
});

// Cleaner task
// ============
// This simply deletes all of the main assets folders.

gulp.task('clean', function() {
  return gulp.src([paths.public.styles, paths.public.js, paths.public.img], {read: false})
    .pipe(clean())
    .pipe(notify('Cleaning task complete.'));
});

// Watch task
// ==========
// Watches the different directores for changes and then
// runs their relevant tasks and livereloads.

gulp.task('watch', function() {
    // Run the appropriate task when assets change
    gulp.watch(paths.assets.styles.files, ['styles']);
    gulp.watch(paths.assets.js.files, ['js']);
    gulp.watch(paths.assets.img.files, ['img']);
});

// Deploy task
// ===========
// Runs all of the main tasks, without activating livereload.

gulp.task('deploy', ['clean'], function() {
    // Run the styles task, but minify the output
    gulp.src(paths.assets.styles.files)
        .pipe(sass())
        .pipe(autoprefix(settings.autoprefix.versions))
        .pipe(minify())
        .pipe(gulp.dest(paths.public.styles));

    // Login styles
    gulp.src(paths.assets.styles.login)
        .pipe(sass())
        .pipe(autoprefix(settings.autoprefix.versions))
        .pipe(minify())
        .pipe(gulp.dest(paths.public.styles));

    // Run the JS task, but strip out debugging code and the uglify it
    gulp.src(paths.assets.js.files)
        .pipe(concat('main.min.js'))
        .pipe(strip())
        .pipe(uglify())
        .pipe(gulp.dest(paths.public.js));

    // Run the image task
    gulp.start('img');
});

//
// Default task
// ============
// Runs every task, and then watches files for changes.

gulp.task('default', ['clean'], function() {
    gulp.start('styles', 'js', 'img', 'watch');
});