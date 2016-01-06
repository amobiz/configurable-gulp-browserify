/* eslint consistent-this: 0, camelcase: 0 */
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
	var shim = require('browserify-shim');
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

	var EXCERPTS = ['externals', 'plugins', 'requires', 'shims', 'transforms'];

	var context = this;
	var gulp = this.gulp;
	var config = this.config;

	// Start bundling with Browserify for each bundle config specified
	return merge(_.map(config.bundles, browserifyThis));

	function browserifyThis(bundleConfig) {
		var options, excerpts, browserify;

		options = realizeOptions();
		excerpts = _.pick(options, EXCERPTS);
		options = _.omit(options, EXCERPTS);
		options = prewatch(options);

		browserify = new Browserify(options).on('log', log);

		watch();
		plugins();
		transforms();
		shims();
		requires();
		externals();
		return bundle();

		// Add watchify args
		function prewatch(theOptions) {
			if (config.watch) {
				return _.defaults(theOptions, watchify.args);
			}
			return theOptions;
		}

		function watch() {
			if (config.watch) {
				// Wrap with watchify and rebundle on changes
				browserify = watchify(browserify, typeof config.watch === 'object' && config.watch);
				// Rebundle on update
				browserify.on('update', bundle);
				// bundleLogger.watch(bundleConfig.file);
			}
		}

		// Transform must be registered after plugin
		function plugins() {
			if (excerpts.plugins) {
				browserify.plugin(excerpts.plugins);
			}
		}

		// NOTE: tsify plugin use transform internally,
		// so make sure transforms are registered right after browserify initialized.
		function transforms() {
			if (excerpts.transforms) {
				browserify.transform(excerpts.transforms);
			}
		}

		function shims() {
			if (excerpts.shims) {
				browserify = shim(browserify, excerpts.shims);
			}
		}

		// Sort out shared dependencies.
		// browserify.require() exposes modules externally.
		// NOTE: Although the options `require` is processed properly in constructor of browserify,
		//   we still process it explicitly for clarity.
		function requires() {
			if (excerpts.requires) {
				browserify.require(excerpts.requires);
			}
		}

		// browserify.external() excludes modules from the bundle,
		// and expects they'll be available externally.
		function externals() {
			if (excerpts.externals) {
				browserify.external(excerpts.externals);
			}
		}

		function bundle() {
			var stream, dest;
			// Log when bundling starts
			// bundleLogger.start(bundleConfig.file);

			stream = browserify
				.bundle()
				// Report compile errors
				.on('error', handleErrors)
				// Use vinyl-source-stream to make the stream gulp compatible.
				// Specify the desired output filename here.
				.pipe(vinylify(options.file))
				// optional, remove if you don't need to buffer file contents
				.pipe(buffer());

			if (options.sourcemaps) {
				// Loads map from browserify file
				stream = stream.pipe(sourcemaps.init({
					loadMaps: true
				}));
			}

			if (config.uglify) {
				stream = stream.pipe(uglify());
			}

			// Prepares sourcemaps, either internal or external.
			if (options.sourcemaps === 'internal') {
				stream = stream.pipe(sourcemaps.write());
			} else if (options.sourcemaps === 'external') {
				stream = stream.pipe(sourcemaps.write('.'));
			}

			// Specify the output destination
			dest = options.dest || config.dest;
			return stream
				.pipe(gulp.dest(dest.path, dest.options))
				.pipe(browserSync.reload({
					stream: true
				}));
		}

		function realizeOptions() {
			var src, entries, result;

			src = resolveSrc();
			entries = resolveEntries(src, bundleConfig.entries);
			result = { entries: entries };
			result = _.defaults(result, _.omit(bundleConfig, ['options']), bundleConfig.options, config.options);

			// add sourcemap option
			if (result.sourcemaps) {
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
				basedir: {
					description: 'The directory that browserify starts bundling from for filenames that start with.',
					type: 'path'
				},
				builtins: {
					description: 'Sets the list of built-ins to use, which by default is set in lib/builtins.js in this distribution.',
					type: 'array',
					items: {
						type: 'string'
					}
				},
				bundleExternal: {
					description: 'Boolean option to set if external modules should be bundled. Defaults to true.',
					type: 'boolean',
					default: true
				},
				commondir: {
					description: 'Sets the algorithm used to parse out the common paths. Use false to turn this off, otherwise it uses the commondir module.',
					type: ['string', 'boolean']
				},
				detectGlobals: {
					description: 'Scan all files for process, global, __filename, and __dirname, defining as necessary. With this option npm modules are more likely to work but bundling takes longer. Default true.',
					type: 'boolean',
					default: true
				},
				excludes: {
					note: 'Browserify options do not support `excludes`, we forward this to browserify.exclude().',
					description: 'Prevent the module name or file at file from showing up in the output bundle.',
					alias: ['exclude'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				extensions: {
					description: 'An array of optional extra extensions for the module lookup machinery to use when the extension has not been specified. By default browserify considers only .js and .json files in such cases.',
					alias: ['extension'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				externals: {
					note: 'Browserify options do not support `externals`, we forward this to browserify.external().',
					description: 'Prevent the module or bundle from being loaded into the current bundle, instead referencing from another bundle.',
					alias: ['external'],
					type: 'array',
					items: {
						anyOf: [{
							type: 'string'
						}, {
							type: 'object',
							properties: {
								basedir: {
									type: 'path'
								},
								file: {
									type: 'string'
								}
							}
						}]
					}
				},
				externalRequireName: {
					description: 'Defaults to `require` in expose mode but you can use another name.',
					type: 'string',
					default: 'require'
				},
				fullpaths: {
					description: 'Disables converting module ids into numerical indexes. This is useful for preserving the original paths that a bundle was generated with.'
				},
				ignores: {
					note: 'Browserify options do not support `ignores`, we forward this to browserify.ignore().',
					description: 'Prevent the module name or file at file from showing up in the output bundle.',
					alias: ['ignore'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				insertGlobals: {
					description: 'Insert `process`, `global`, `__filename`, and `__dirname` without analyzing the AST for faster builds but larger output bundles. Default false.',
					type: 'boolean',
					default: false
				},
				insertGlobalVars: {
					description: 'Override the default inserted variables, or set `insertGlobalVars[name]` to `undefined` to not insert a variable which would otherwise be inserted.'
				},
				noParse: {
					description: "An array which will skip all `requires` and global parsing for each file in the array. Use this for giant libs like jQuery or threejs that don't have any requires or node-style globals but take forever to parse.",
					alias: ['noparse']
				},
				paths: {
					description: 'An array of directories that browserify searches when looking for modules which are not referenced using relative path. Can be absolute or relative to basedir.',
					alias: ['path'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				plugins: {
					note: 'Browserify options accept `plugin`. But we want to make sure plugins are registered before transforms, so, normalize `plugin` to `plugins`.',
					description: '',
					alias: ['plugin'],
					type: 'array',
					items: {
						type: 'string'
					}
				},
				requires: {
					note: 'Browserify options accept `require`. But we need to process the `options`, so, normalize `require` to `requires`.',
					description: "Make module available from outside the bundle. The module name is anything that can be resolved by require.resolve(). Use an object with `file` and `expose` property to specify a custom dependency name. `{ file: './vendor/angular/angular.js', options: { expose: 'angular' } }` enables `require('angular')`",
					alias: ['require'],
					type: 'array',
					items: {
						anyOf: [{
							type: 'string'
						}, {
							type: 'object',
							properties: {
								file: {
									type: 'string'
								},
								options: {
									type: 'object',
									properties: {
										basedir: {
											description: 'The directory that starts searching from for filenames that start with.',
											type: 'path'
										},
										entry: {
											description: 'Make the module an entry.',
											type: 'boolean',
											default: false
										},
										expose: {
											description: 'Specify a custom dependency name for the module.',
											type: 'string'
										},
										external: {
											note: 'Distingish this option with browserify.external().',
											description: 'Prevent the module from being loaded into the current bundle, instead referencing from another bundle.',
											type: 'boolean',
											default: false
										},
										transform: {
											note: 'Distingish this option with browserify.option.transform.',
											description: 'Allow the module to be transformed.',
											type: 'boolean',
											default: true
										}
									}
								}
							}
						}]
					}
				},
				shims: {
					note: 'Browserify options do not support `shims`, we forward this to browserify-shim().',
					description: 'Which library to shim? (not yet implemented.)',
					alias: ['shim', 'browserify-shims', 'browserify-shim'],
					type: 'object',
					patternProperties: {
						'.+': {
							type: 'object',
							properties: {
								path: {
									description: 'The path relative to your build script or a full path.',
									type: 'string'
								},
								exports: {
									description: 'The name under which the module attaches itself to the window or its execution context.',
									type: 'string'
								},
								depends: {
									description: 'Other libraries to depend that attached their exports to the window.',
									type: 'object',
									patternProperties: {
										'.+': {
											type: 'string'
										}
									}
								}
							}
						}
					}
				},
				sourcemaps: {
					note: 'Browserify options do not support `sourcemaps`, it uses `debug` for this, we make this clear by name it `sourcemaps` and add option to write external source map file.',
					description: 'Add a source map inline to the end of the bundle or separate source map to external file. This makes debugging easier because you can see all the original files if you are in a modern enough browser.',
					alias: ['sourcemap'],
					enum: [
						'inline', 'external', false
					],
					default: false
				},
				standalone: {
					description: 'Create a standalone module with this given name and a umd wrapper. You can use namespaces in the standalone global export using a . in the string name as a separator, for example `A.B.C`. The global export will be sanitized and camel cased.',
					type: 'string'
				},
				transforms: {
					note: 'Browserify options accept `transform`. But we want to make sure plugins are registered before transforms, so, normalize `transform` to `transforms`.',
					description: '',
					alias: ['transform'],
					type: 'array',
					items: {
						type: 'string'
					}
				}
			}
		}
	},
	properties: {
		bundles: {
			description: '',
			alias: ['bundle'],
			type: 'array',
			items: {
				description: 'Settings for this bundle.',
				type: 'object',
				extends: { $ref: '#/definitions/options' },
				properties: {
					file: {
						description: 'The name of file to write to disk.',
						type: 'string'
					},
					entries: {
						description: 'String, file object, or array of those types (they may be mixed) specifying entry file(s).',
						alias: ['entry'],
						type: 'array',
						items: {
							type: 'string'
						}
					},
					options: {
						description: 'Options for this bundle.',
						type: 'object',
						extends: { $ref: '#/definitions/options' }
					}
				},
				required: ['entries', 'file']
			}
		},
		options: {
			description: 'Common options for all bundles.',
			type: 'object',
			extends: { $ref: '#/definitions/options' }
		},
		uglify: {
			description: 'Uglify bundle file.',
			anyOf: [{
				type: 'boolean',
				default: false
			}, {
				type: 'object',
				properties: {
					mangle: {
						description: 'Pass false to skip mangling names.',
						type: 'boolean',
						default: true
					},
					output: {
						description: 'Pass an object if you wish to specify additional output options. The defaults are optimized for best compression.',
						type: 'object',
						properties: {
							sequences: {
								description: 'Join consecutive statemets with the "comma operator".',
								type: 'boolean',
								default: true
							},
							properties: {
								description: 'Optimize property access: a["foo"] → a.foo.',
								type: 'boolean',
								default: true
							},
							dead_code: {
								description: 'Discard unreachable code.',
								type: 'boolean',
								default: true
							},
							drop_debugger: {
								description: 'Discard "debugger" statements.',
								type: 'boolean',
								default: true
							},
							unsafe: {
								description: 'Some unsafe optimizations (see below).',
								type: 'boolean',
								default: false
							},
							conditionals: {
								description: 'Optimize if-s and conditional expressions.',
								type: 'boolean',
								default: true
							},
							comparisons: {
								description: 'Optimize comparisons.',
								type: 'boolean',
								default: true
							},
							evaluate: {
								description: 'Evaluate constant expressions.',
								type: 'boolean',
								default: true
							},
							booleans: {
								description: 'Optimize boolean expressions.',
								type: 'boolean',
								default: true
							},
							loops: {
								description: 'Optimize loops.',
								type: 'boolean',
								default: true
							},
							unused: {
								description: 'Drop unused variables/functions.',
								type: 'boolean',
								default: true
							},
							hoist_funs: {
								description: 'Hoist function declarations.',
								type: 'boolean',
								default: true
							},
							hoist_vars: {
								description: 'Hoist variable declarations.',
								type: 'boolean',
								default: false
							},
							if_return: {
								description: 'Optimize if-s followed by return/continue.',
								type: 'boolean',
								default: true
							},
							join_vars: {
								description: 'Join var declarations.',
								type: 'boolean',
								default: true
							},
							cascade: {
								description: 'Try to cascade `right` into `left` in sequences.',
								type: 'boolean',
								default: true
							},
							side_effects: {
								description: 'Drop side-effect-free statements.',
								type: 'boolean',
								default: true
							},
							warnings: {
								description: 'Warn about potentially dangerous optimizations/code.',
								type: 'boolean',
								default: true
							},
							global_defs: {
								description: 'Global definitions.',
								type: 'array',
								items: {
									type: 'object'
								}
							}
						}
					},
					preserveComments: {
						description: 'A convenience option for options.output.comments. Defaults to preserving no comments.',
						enum: ['all', 'license']
					}
				}
			}]
		},
		watch: {
			description: 'Update any source file and your browserify bundle will be recompiled on the spot.',
			anyOf: [{
				type: 'boolean',
				default: false
			}, {
				type: 'object',
				properties: {
					delay: {
						description: 'The amount of time in milliseconds to wait before emitting an "update" event after a change. Defaults to 100.',
						type: 'integer',
						default: 100
					},
					ignoreWatch: {
						description: 'Ignores monitoring files for changes. If set to true, then **/node_modules/** will be ignored. For other possible values see Chokidar\'s documentation on "ignored".',
						type: ['boolean', 'string']
					},
					poll: {
						description: 'Enables polling to monitor for changes. If set to true, then a polling interval of 100ms is used. If set to a number, then that amount of milliseconds will be the polling interval. For more info see Chokidar\'s documentation on "usePolling" and "interval".',
						type: ['boolean', 'integer']
					}
				}
			}]
		}
	},
	required: ['bundles']
};

browserifyTask.type = 'task';

module.exports = browserifyTask;
