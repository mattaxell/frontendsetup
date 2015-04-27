#Front End Setup

My typical starting point/structure for use when beginning front end projects written in `sass`. File structure inspired by [@HugoGiraudel](https://github.com/HugoGiraudel)'s [Sass Guidelines](http://sass-guidelin.es). Using `gulp` to compile/minify assets.

#####Styles Folder Structure

```
├── base
│   ├── _reset.scss
│   └── _typography.scss
├── components
│   ├── _buttons.scss
│   ├── _forms.scss
│   ├── _lists.scss
│   └── _tables.scss
├── main.scss
├── pages
│   └── _home.scss
├── partials
│   ├── _footer.scss
│   ├── _header.scss
│   ├── _layout.scss
│   └── _navigation.scss
├── utils
│   ├── _functions.scss
│   ├── _helpers.scss
│   ├── _mixins.scss
│   └── _variables.scss
└── vendor
    ├── _font-awesome.scss
    └── jeet
        ├── _functions.scss
        ├── _grid.scss
        ├── _index.scss
        └── _settings.scss
```

#####Gulp Task

######Dependencies
- `del`
- `gulp`
- `gulp-autoprefixer`
- `gulp-buster`
- `gulp-cache`
- `gulp-concat`
- `gulp-hash`
- `gulp-minify-css`
- `gulp-notify`
- `gulp-rename`
- `gulp-rev`
- `gulp-sass`
- `gulp-strip-debug`
- `gulp-uglify`
- `gulp-util`
- `imagemin-gifsicle`
- `imagemin-jpegtran`
- `imagemin-optipng`
- `merge-stream`
- `node-notifier`
- `run-sequence`

######Tasks
- `gulp` - Default task, runs all sub tasks without minifying and watches for changes.
- `gulp production` - Runs all sub tasks inluding minification, doesn't watch for changes.
- `gulp-deploy` - Run production task and package all deployable files in preparation to upload to server

#####Vendor

- [Jeet Grid System](http://jeet.gs/)
- [Font Awesome](http://fontawesome.io/)