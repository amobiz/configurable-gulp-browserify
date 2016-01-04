/* eslint consistent-this: 0 */
'use strict';

/**

browserify task
---------------
Bundle JavaScript things with Browserify!

References:

Fast browserify builds with watchify
https://github.com/gulpjs/gulp/blob/master/docs/recipes/fast-browserify-builds-with-watchify.md

Browserify + Globs
https://github.com/gulpjs/gulp/blob/master/docs/recipes/browserify-with-globs.md

Gulp + Browserify: The Everything Post
http://viget.com/extend/gulp-browserify-starter-faq

Speedy Browserifying with Multiple Bundles
https://lincolnloop.com/blog/speedy-browserifying-multiple-bundles/

gulp-starter/gulp/tasks/browserify.js
https://github.com/greypants/gulp-starter/blob/master/gulp/tasks/browserify.js

browserify-handbook
https://github.com/substack/browserify-handbook

partitioning
https://github.com/substack/browserify-handbook#partitioning

gulp + browserify, the gulp-y way
https://medium.com/@sogko/gulp-browserify-the-gulp-y-way-bb359b3f9623

*/

/**
 * Recipe
 * ______
 *
 * browserify
 *
 * Ingredients
 * ___________
 *
 * browser-sync
 * https://github.com/BrowserSync/browser-sync
 *
 * node-browserify
 * https://github.com/substack/node-browserify
 *
 * globby
 * https://github.com/sindresorhus/globby
 *
 * gulp-sourcemaps
 * https://github.com/floridoo/gulp-sourcemaps
 *
 * gulp-uglify
 * https://github.com/terinjokes/gulp-uglify
 *
 * vinyl-source-stream
 * https://github.com/hughsk/vinyl-source-stream
 *
 * vinyl-buffer
 * https://github.com/hughsk/vinyl-buffer
 *
 * watchify
 * https://github.com/substack/watchify
 *
 * Samples
 * -------
 *
 * config: {
 *   // NOTE: options will be injected to each bundles. Put common configuration here.
 *   options: {
 *     require: '',
 *     plugin: [
 *       [tsify, { noImplicitAny: true }],
 *       errorify
 *     ],
 *     transform: [],
 *
 *     // using browserify methods
 *     external: [],
 *
 *     exclude: []
 *     ignore: []
 *
 *     // using browserify-shim
 *     shim: {
 *     }
 *   },
 *   bundles: [{
 *     entries: ['app.js'],
 *     external: '',
 *     require: '',
 *     file: 'app.bundle.js'
 *   }, {
 *     entries: ['console.js'],
 *     file: 'console.bundle.js'
 *   }, {
 *     entries: ['common.js'],
 *     file: 'common.js'
 *   }]
 * }
 *
 * Notes
 * -----
 *
 *   Browserify constructor supports the following options:
 *
 *   entries: string|[string]
 *   noparse|noParse: boolean
 *   basedir: string
 *   browserField: boolean
 *   builtins: boolean|[string]
 *   debug: boolean
 *   detectGlobals: boolean
 *   extensions: []
 *   insertGlobals: boolean
 *      commondir: boolean
 *   insertGlobalVars: boolean
 *   bundleExternal: boolean
 *
 *   ignoreTransform: []
 *   transform: [string|{}|[]]
 *      basedir: string
 *      global: boolean
 *   require: []
 *      file: string
 *      entry: boolean
 *      external
 *      transform
 *      basedir: string
 *      expose: boolean
 *   plugin: [string|{}|[]]
 *      basedir: string
 *
 * References
 * ----------
 *
 * node-browserify/index.js
 * https://github.com/substack/node-browserify/blob/master/index.js
 *
 * browserify-handbook - configuring transforms
 * https://github.com/substack/browserify-handbook#configuring-transforms
 *
 * pull: Make sure entry paths are always full paths #1248
 * https://github.com/substack/node-browserify/pull/1248
 *
 * issues: 8.1.1 fails to resolve modules from "browser" field #1072
 * https://github.com/substack/node-browserify/issues/1072#issuecomment-70323972
 *
 * issues: browser field in package.json no longer works #1250
 * https://github.com/substack/node-browserify/issues/1250
 * https://github.com/substack/node-browserify/issues/1250#issuecomment-99970224
 *
 */
function browserifyTask() {
	// lazy loading required modules.
	var Glob = require('glob');
	var globjoin = require('globjoin');
	var Browserify = require('browserify');
	var browserSync = require('browser-sync');
	var buffer = require('vinyl-buffer');
	var globby = require('globby');
	var log = require('gulp-util').log;
	var merge = require('merge-stream');
	var notify = require('gulp-notify');
	var sourcemaps = require('gulp-sourcemaps');
	var uglify = require('gulp-uglify');
	var vinylify = require('vinyl-source-stream');
	var watchify = require('watchify');
	var _ = require('lodash');
	var EntryResolver = require('model-chainify')(flatten, join, resolve);

	var context = this;
	var gulp = this.gulp;
	var config = this.config;

	// Start bundling with Browserify for each bundle config specified
	return merge(_.map(config.bundles, browserifyThis));

	function browserifyThis(bundleConfig) {
		var options, transform, browserify;

		options = realizeOptions();
		if (options.debug) {
			// Add watchify args
			_.defaults(options, watchify.args);
			// A watchify require/external bug that prevents proper recompiling,
			// so (for now) we'll ignore these options during development. Running
			// `gulp browserify` directly will properly require and externalize.
			options = _.omit(options, ['external', 'require']);
		}

		// Transform must be registered after plugin.
		// (tsify use transform internally, so make sure it registered first.)
		if (options.plugin && options.transform) {
			transform = options.transform;
			delete options.transform;
		}

		browserify = new Browserify(options).on('log', log);

		if (transform) {
			browserify.transform(transform);
		}

		if (options.debug) {
			// Wrap with watchify and rebundle on changes
			browserify = watchify(browserify);
			// Rebundle on update
			browserify.on('update', bundle);
			// bundleLogger.watch(bundleConfig.file);
		} else if (options.external) {
			// NOTE: options.require is processed properly in constructor of browserify.
			//   No need further process here.
			//
			// Sort out shared dependencies.
			// browserify.require exposes modules externally
			// if (bundleConfig.require) {
			//     browserify.require(bundleConfig.require);
			// }

			// browserify.external excludes modules from the bundle,
			// and expects they'll be available externally
			browserify.external(options.external);
		}

		return bundle();

		function bundle() {
			// Log when bundling starts
			// bundleLogger.start(bundleConfig.file);

			var stream = browserify
				.bundle()
				// Report compile errors
				.on('error', handleErrors)
				// Use vinyl-source-stream to make the stream gulp compatible.
				// Specify the desired output filename here.
				.pipe(vinylify(options.file))
				// optional, remove if you don't need to buffer file contents
				.pipe(buffer());

			if (options.sourcemap) {
				// Loads map from browserify file
				stream = stream.pipe(sourcemaps.init({
					loadMaps: true
				}));
			}

			if (!config.debug) {
				stream = stream.pipe(uglify());
			}

			if (options.sourcemap) {
				// Prepares sourcemaps, either internal or external.
				stream = stream.pipe(sourcemaps.write(options.sourcemap === 'external' ? '.' : null));
			}

			// Specify the output destination
			return stream
				.pipe(gulp.dest((options.dest || config.dest).path, (options.dest || config.dest).options))
				.pipe(browserSync.reload({
					stream: true
				}));
		}

		function realizeOptions() {
			var src, entries, result;

			src = resolveSrc();
			entries = resolveEntries(src, bundleConfig.entries);
			result = _.defaults({
				entries: entries
			}, bundleConfig, config);

			// add sourcemap option
			if (result.sourcemap) {
				// browserify use 'debug' option for sourcemaps,
				// but sometimes we want sourcemaps even in production mode.
				result.debug = true;
			}

			return result;
		}

		function resolveSrc() {
			var src;

			src = context.helper.resolveSrc(bundleConfig, config);
			return src && src.globs || '';
		}

		function resolveEntries(src, entries) {
			return new EntryResolver(entries)
				.flatten()
				.join(src)
				.resolve()
				.get();
		}

		function handleErrors() {
			var args = Array.prototype.slice.call(arguments);

			// Send error to notification center with gulp-notify
			notify.onError({
				title: 'Browserify Error',
				message: '<%= error %>'
			}).apply(this, args);

			this.emit('end');
		}
	}

	// flatten entry property.
	function flatten(entries) {
		return entries.map(function (entry) {
			return entry.file || entry;
		});
	}

	// join paths.
	function join(entries, src) {
		return globjoin(src, entries);
	}

	// resolve globs to files.
	function resolve(entries) {
		return entries.reduce(function (result, entry) {
			if (Glob.hasMagic(entry)) {
				return result.concat(globby.sync(entry));
			}
			return result.concat(entry);
		}, []);
	}
}

browserifyTask.schema = {
	title: 'browserify',
	description: 'Bundle JavaScript things with Browserify.',
	definitions: {
		options: {
			properties: {
				extensions: {
					description: '',
					alias: ['extension'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				require: {
					description: '',
					alias: ['requires'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				external: {
					description: '',
					alias: ['externals'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				plugin: {
					description: '',
					alias: ['plugins'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				transform: {
					description: '',
					alias: ['transforms'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				exclude: {
					description: '',
					alias: ['excludes'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				ignore: {
					description: '',
					alias: ['ignores'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				shim: {
					description: 'which library to shim?',
					alias: ['shims', 'browserify-shim', 'browserify-shims'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				sourcemap: {
					description: 'generate sourcemap file or not?',
					alias: ['sourcemaps'],
					enum: [
						'inline', 'external', false
					],
					default: false
				}
			}
		}
	},
	properties: {
		options: {
			description: 'common options for all bundles',
			type: 'object',
			extends: { $ref: '#/definitions/options' }
		},
		bundles: {
			description: '',
			alias: ['bundle'],
			type: 'array',
			items: {
				description: 'bundle settings',
				type: 'object',
				extends: { $ref: '#/definitions/options' },
				properties: {
					file: {
						description: '',
						type: 'string'
					},
					entries: {
						description: '',
						alias: ['entry'],
						type: 'array',
						items: {
							type: 'string'
						}
					},
					options: {
						description: 'options for this bundle',
						type: 'object',
						extends: { $ref: '#/definitions/options' }
					}
				},
				required: ['file', 'entries']
			}
		}
	},
	required: ['bundles']
};

browserifyTask.type = 'task';

module.exports = browserifyTask;
