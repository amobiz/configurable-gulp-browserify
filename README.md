# gulp-ccr-browserify

Bundle JavaScript things with Browserify. A cascading configurable gulp recipe for [gulp-chef](https://github.com/gulp-cookery/gulp-chef).

## Install

``` bash
$ npm install --save-dev gulp-chef gulp-ccr-browserify
```

## Recipe

browserify

## Ingredients

* [browser-sync](https://github.com/BrowserSync/browser-sync)

* [node-browserify](https://github.com/substack/node-browserify)

* [globby](https://github.com/sindresorhus/globby)

* [gulp-sourcemaps](https://github.com/floridoo/gulp-sourcemaps)

* [gulp-uglify](https://github.com/terinjokes/gulp-uglify)

* [vinyl-source-stream](https://github.com/hughsk/vinyl-source-stream)

* [vinyl-buffer](https://github.com/hughsk/vinyl-buffer)

* [watchify](https://github.com/substack/watchify)

## API

### config.options

Options for all bundles.

### config.watch

Update any source file and your browserify bundle will be recompiled on the spot.

### config.bundles

Bundle or array of bundles.

#### bundle.entries

String, or array of strings. Specifying entry file(s).

#### bundle.file

The name of file to write to disk.

#### bundle.options

Options for this bundle. See [documentation](https://github.com/substack/node-browserify#browserifyfiles--opts) for options.

## Usage

``` javascript
var gulp = require('gulp');
var chef = require('gulp-chef');

var meals = chef({
    src: 'src/',
    dest: 'dist/',
    browserify: {
        bundles: [{
            entries: [
                'services.ts'
            ]
        }, {
            entries: [
                'main.ts'
            ]
        }],
        options: {
            transforms: ['tsify']
        }
    }
});

gulp.registry(meals);
```

## References

* [browserify-handbook](https://github.com/substack/browserify-handbook)

* [partitioning](https://github.com/substack/browserify-handbook#partitioning)

* [Fast browserify builds with watchify](https://github.com/gulpjs/gulp/blob/master/docs/recipes/fast-browserify-builds-with-watchify.md)

* [browserify-handbook - configuring transforms](https://github.com/substack/browserify-handbook#configuring-transforms)

* [Browserify + Globs](https://github.com/gulpjs/gulp/blob/master/docs/recipes/browserify-with-globs.md)

* [Gulp + Browserify: The Everything Post](http://viget.com/extend/gulp-browserify-starter-faq)

* [gulp-starter/gulp/tasks/browserify.js](https://github.com/greypants/gulp-starter/blob/master/gulp/tasks/browserify.js)

* [Speedy Browserifying with Multiple Bundles](https://lincolnloop.com/blog/speedy-browserifying-multiple-bundles/)

* [gulp + browserify, the gulp-y way](https://medium.com/@sogko/gulp-browserify-the-gulp-y-way-bb359b3f9623)

* [node-browserify/index.js](https://github.com/substack/node-browserify/blob/master/index.js)

* [pull: Make sure entry paths are always full paths #1248](https://github.com/substack/node-browserify/pull/1248)

* [issues: 8.1.1 fails to resolve modules from "browser" field #1072](https://github.com/substack/node-browserify/issues/1072#issuecomment-70323972)

* [issues: browser field in package.json no longer works #1250](https://github.com/substack/node-browserify/issues/1250)

* [issues: browser field in package.json no longer works #1250 comment](https://github.com/substack/node-browserify/issues/1250#issuecomment-99970224)
