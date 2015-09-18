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
    colors = require('colors'),
    notify = require('gulp-notify'),
    notifier = require('node-notifier'),
    merge = require('merge-stream'),
    sequence = require('run-sequence'),
    combinemq = require('gulp-combine-media-queries'),
    ftp = require('vinyl-ftp');

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
        },
        fonts: {
            dir: 'assets/fonts',
            files: 'assets/fonts/**/*'
        }
    },
    public: {
        styles: 'public/styles',
        js: 'public/js',
        img: 'public/img',
        fonts: 'public/fonts'
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
        '!{vendor,vendor/**}',
        '!{assets,assets/**}',
        '!{templates,templates/**}',
        '!{node_modules,node_modules/**}',
        '!package.json',
        '!gulpfile.js',
        '!composer.json',
        '!composer.lock',
        '!README.md'
    ],

}

var deployment = {

    // FTP credentials
    host: '',
    user: '',
    password: '',

    // The remote folder to upload them to
    destination: ''

}

// Errors
// ======
// Handle errors and continue to run Gulp

var logErrors = function(error) {

    // Remove project directory path
    // from outputted error file path
    var errorFilePath = error.fileName.toString(),
        projectDir = __dirname,
        errorFile = errorFilePath.replace(projectDir, '');

    // Nicely formatted console log error, including a description and location of error
    console.log('-----------------------------------------------------------------------');
    console.log('ERROR!'.red + ' ' + error.message.toString().yellow + ' on line ' + error.lineNumber.toString() + ' of ' + errorFile.underline);
    console.log('-----------------------------------------------------------------------');

    // Also display occurance of error as notification
    notifier.notify({
        title: 'Gulp Task Error',
        message: 'Check the console.'
    });

    // util.log(error);
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

// Fonts
// =====
// Grabs any self hosted font files in the asset
// folder and moves them to public. No optimization takes
// place but it saves committing the font folder in the
// public directory.

gulp.task('fonts', function() {
    return gulp.src(paths.assets.fonts.files)
        .pipe(gulp.dest(paths.public.fonts));
})

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

    var fonts = gulp.src(paths.assets.fonts.files)
        .pipe(gulp.dest(paths.public.fonts));

    // Return the streams in one combined stream
    return merge(styles, scripts, images, icos, fonts);
});

// Package
// =======
// Package up the deployment files
// but create a local instead of uploading

gulp.task('package', ['production'], function() {

    gulp.src(packaged.files, {base: '.'})
        .pipe(gulp.dest('_package'));

});

// Deployment
// ==========
// This task runs 'production' and then grabs all the files
// we want to upload and does so via FTP.

gulp.task('deploy', ['production'], function() {

    var conn = ftp.create({
        host: deployment.host,
        user: deployment.user,
        password: deployment.password
    });

    return gulp.src(packaged.files, { base: '.', buffer: false })
        .pipe(conn.newer(deployment.destination))
        .pipe(conn.dest(deployment.destination));

})

// Default
// =======
// Runs every task, and then watches the project  for changes.

gulp.task('default', function(callback) {
    sequence(
        'clean',
        ['styles', 'scripts', 'images', 'fonts'],
        'watch',
        callback);

    notifier.notify({message: 'Tasks complete'});
});