// Dependencies
// ============

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

    // Images
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant');

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

// Assets
// ======

var paths = {
    assets: {
        styles: {
            dir: 'assets/styles',
            files: 'assets/styles/**/*.scss'
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
            files: 'assets/img/**/*',
            ico: 'assets/img/**/*.ico'
        }
    },
    public: {
        styles: 'public/styles',
        js: 'public/js',
        img: 'public/img'
    }
}

// General Settings
// ================

var settings = {
    autoprefix: {
        versions: 'last 4 versions'
    }
}

// Package Project
// ===============
// Package files for output either for use in deploy task
// or for managing the files manually.

var packaged = {

    // Ignore files we don't need
    files: [
        '**/*',
        '!{_package,_package/**}',
        '!{vendor,vendor/**}',
        '!{assets,assets/**}',
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

var deployment = {

    staging: {
        host: hostconfig.staging.host,
        user: hostconfig.staging.user,
        password: hostconfig.staging.password,
        destination: hostconfig.staging.destination,
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

// Errors
// ======
// Handle errors and continue to run Gulp

var logErrors = function(error) {
    console.log("An error has occured:");
    console.log(error.toString());

    notifier.notify({message: 'Errors occured - check log'});

    util.log(error);
    this.emit('end');
};

// Styles
// ======
// Grabs everything inside the styles & sprites
// directories, concantinates and compiles scss,
// builds sprites, and then outputs them to their
// respective target directories.

gulp.task('styles', function() {
    return gulp.src(paths.assets.styles.files)
        .pipe(sass({sourceComments: 'normal'}))
        .on('error', logErrors)
        .pipe(autoprefix({browsers: settings.autoprefix.versions}))
        .pipe(gulp.dest(paths.public.styles))
});

// Scripts
// =======
// Grabs everything inside the js directory,
// concantinates and minifies, and then outputs
// them to the target directory.

gulp.task('scripts', function() {
    return gulp.src(paths.assets.js.files)
        .pipe(concat('main.min.js'))
        .pipe(gulp.dest(paths.public.js));
});

// Images
// ======
// Grabs everything inside the img directory,
// optimises each image, and then outputs them to
// the target directory.

gulp.task('images', function() {
    return gulp.src(paths.assets.img.files)
        .pipe(gulp.dest(paths.public.img));
});

// Cache-buster
// ============
// Completely clear the cache to stop image-min
// outputting oncorrect image names etc.

gulp.task('clear', function (done) {
    return cache.clearAll(done);
});

// Cleaner
// =======
// Deletes all the public asset folders.

gulp.task('clean', function(cb) {
    return del([
        paths.public.styles,
        paths.public.js,
        paths.public.img
    ], cb);
});

// Watcher
// =======
// Watches the different directores for changes and then
// runs their relevant tasks and livereloads.

gulp.task('watch', function() {
    // Run the appropriate task when assets change
    gulp.watch(paths.assets.styles.files, ['styles']);
    gulp.watch(paths.assets.js.files, ['scripts']);
    gulp.watch(paths.assets.img.files, ['images']);
});

// Production assets
// =================
// Goes through all our assets and readies them for production.
// - Minification
// - Concatenation
// - Debug stripping

gulp.task('production', ['clean'], function() {

    // Styles
    var styles = gulp.src(paths.assets.styles.files)
        .pipe(sass({sourceComments: 'normal'}))
        .on('error', logErrors)
        .pipe(autoprefix({browsers: settings.autoprefix.versions}))
        .pipe(combinemq())
        .pipe(minify())
        .pipe(gulp.dest(paths.public.styles));

    // Scripts
    var scripts = gulp.src(paths.assets.js.files)
        .pipe(concat('main.min.js'))
        .pipe(strip())
        .pipe(uglify())
        .pipe(gulp.dest(paths.public.js));

    // Compress all images.
    var images = gulp.src(paths.assets.img.files)
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
        .pipe(gulp.dest(paths.public.img))

    // ICOs
    var icos = gulp.src(paths.assets.img.ico)
        .pipe(gulp.dest(paths.public.img));

    // Return the streams in one combined stream
    return merge(styles, scripts, images, icos);
});

// Package
// =======
// Package up the deployment files
// but create a local instead of uploading

gulp.task('package', ['production'], function() {

    gulp.src(packaged.files, {base: '.'})
        .pipe(gulp.dest('_package'));

});

gulp.task('environment', function(){
    // Define development environment based on task flag (dev/production)
    if(util.env.production) {
        env = 'production';
    } else if(util.env.staging) {
        env = 'staging';
    } else {
        throw new util.PluginError({
            plugin: 'Environment',
            message: 'Please define development environment (staging|production)'
        });
    }
});

// Deployment
// ==========
// This task runs 'production' and then grabs all the files
// we want to upload and does so via FTP.

gulp.task('deploy', ['environment', 'production'], function() {

    var stream = gulp.src(packaged.files, { base: '.', buffer: false }),
        config = deployment[env],
        conn = ftp.create(config);

    stream = stream
        .pipe(conn.newer(config.destination))
        .pipe(conn.dest(config.destination));

    return stream;

})

// Default
// =======
// Runs every task, and then watches the project  for changes.

gulp.task('default', function(callback) {
    sequence(
        'clean',
        ['styles', 'scripts', 'images'],
        'watch',
        callback);

    notifier.notify({message: 'Tasks complete'});
});
