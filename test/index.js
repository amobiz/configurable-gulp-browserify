'use strict';

var	Chai = require('chai'),
	Promised = require("chai-as-promised"),
	expect = Chai.expect;

Chai.use(Promised);

var _ = require('lodash');

var browserify = require('./');

var testCases = {
	'Accepts multiple bundles': {
		config: {
			src: 'test/_fixtures/app/modules',
			dest: 'dist',
			bundles: [{
				entries: ['directives/index.js'],
				file: 'directives.js',
			}, {
				entries: ['services/index.js'],
				file: 'services.js',
			}]
		},
		expected: {

		}
	}
};

describe('browserify()', function () {
	it('should...', function () {
		//var tasks;
        //
		//_.forEach(testCases, function (testCase, title) {
		//	it(title, function () {
		//		browserify(gulp, testCase.config, null);
		//	});
		//});

		//var stream = gulp.src('non-existent');
		//expect(stream).to.be.an.instanceof(Stream);
		//expect(stream).to.have.property('on');
	});
});
