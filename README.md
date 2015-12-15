#Front End Setup

My typical starting point/structure for use when beginning front end projects written in `sass`. File structure inspired by [@HugoGiraudel](https://github.com/HugoGiraudel)'s [Sass Guidelines](http://sass-guidelin.es). Using `gulp` to compile/minify assets.

#####Styles Folder Structure

```
.
├── base
│   ├── _reset.scss
│   └── _typography.scss
├── components
│   ├── _alerts.scss
│   ├── _buttons.scss
│   ├── _forms.scss
│   ├── _lists.scss
│   └── _tables.scss
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
│   └── _theme.scss
│   └── _variables.scss
└── vendor
    ├── _font-awesome.scss
    └── jeet
        ├── _functions.scss
        ├── _grid.scss
        ├── _index.scss
        └── _settings.scss
├── main.scss
```

#####Vendor

- [Jeet Grid System](http://jeet.gs/)
- [Font Awesome](http://fontawesome.io/)

Optional use of Jeet for a sass grid system and Font Awesome as a default icon set.

#####Gulp Setup

######Tasks
- `gulp` - Default task, runs all sub tasks without minifying and watches for changes.
- `gulp production` - Runs all sub tasks including minification, doesn't watch for changes.
- `gulp package` - Runs production task and makes a copy of deployable files in `/_package` directory, without uploading to any server.
- `gulp deploy` - Requires flag to determine dev environment [staging|production]
- `gulp deploy --staging` - Runs `production` then uploads deployable files to staging server (requires hostconfig.json)
- `gulp deploy --production` - Runs `production` then uploads deployable files to live server (requires hostconfig.json)

######Host Config
`deploy` tasks require hosting credentials stored in a file named `hostconfig.json` in the route of the project. This file should be ignored by git repository to prevent secure logins being accessed without authorisation.

It can contain host information of 'staging' and 'production' servers, in the following format:

```
{
    "staging": {
        "host": "",
        "user": "",
        "password": "",
        "destination": ""
    },
    "production": {
        "host": "",
        "user": "",
        "password": "",
        "destination": ""
    }
}
```