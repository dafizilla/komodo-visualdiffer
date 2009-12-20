/*
 * Copyright 2004 ThoughtWorks, Inc
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

// 29/mar/2008 Added globCaseContains by davide ficano <davide.ficano@gmail.com>

if (typeof(extensions) == 'undefined') {
    var extensions = {};
}

if (typeof(extensions.dafizilla) == 'undefined') {
    extensions.dafizilla = {};
}

if (typeof(extensions.dafizilla.visualdiffer) == 'undefined') {
    extensions.dafizilla.visualdiffer = {};
}

extensions.dafizilla.visualdiffer.stringUtils = {};

(function() {
    this.PatternMatcher = function(pattern) {
        this.selectStrategy(pattern);
    };
    this.PatternMatcher.prototype = {

        selectStrategy: function(pattern) {
            this.pattern = pattern;
            var strategyName = 'glob'; // by default
            if (/^([a-z-]+):(.*)/.test(pattern)) {
                strategyName = RegExp.$1;
                pattern = RegExp.$2;
            }
            var matchStrategy = extensions.dafizilla.visualdiffer.stringUtils.PatternMatcher.strategies[strategyName];
            if (!matchStrategy) {
                throw new SeleniumError("cannot find PatternMatcher.strategies." + strategyName);
            }
            this.strategy = matchStrategy;
            this.matcher = new matchStrategy(pattern);
        },

        matches: function(actual) {
            return this.matcher.matches(actual + '');
            // Note: appending an empty string avoids a Konqueror bug
        }
    };

    /**
     * A "static" convenience method for easy matching
     */
    this.PatternMatcher.matches = function(pattern, actual) {
        return new extensions.dafizilla.visualdiffer.stringUtils.PatternMatcher(pattern).matches(actual);
    };

    this.PatternMatcher.strategies = {

        /**
         * Exact matching, e.g. "exact:***"
         */
        exact: function(expected) {
            this.expected = expected;
            this.matches = function(actual) {
                return actual == this.expected;
            };
        },

        /**
         * Match by regular expression, e.g. "regexp:^[0-9]+$"
         */
        regexp: function(regexpString) {
            this.regexp = new RegExp(regexpString);
            this.matches = function(actual) {
                return this.regexp.test(actual);
            };
        },

        /**
         * "globContains" (aka "wildmat") patterns, e.g. "glob:one,two,*",
         * but don't require a perfect match; instead succeed if actual
         * contains something that matches globString.
         * Making this distinction is motivated by a bug in IE6 which
         * leads to the browser hanging if we implement *TextPresent tests
         * by just matching against a regular expression beginning and
         * ending with ".*".  The globcontains strategy allows us to satisfy
         * the functional needs of the *TextPresent ops more efficiently
         * and so avoid running into this IE6 freeze.
         */
        globContains: function(globString) {
            this.regexp = new RegExp(extensions.dafizilla.visualdiffer.stringUtils.PatternMatcher.regexpFromGlobContains(globString));
            this.matches = function(actual) {
                return this.regexp.test(actual);
            };
        },

        /**
         * Identical to globContains but allows case insensitive search
         * 29/Mar/2008 Added by davide ficano <davide.ficano@gmail.com>
         */
        globCaseContains: function(globString, matchCase) {
            if (matchCase) {
              this.regexp = new RegExp(extensions.dafizilla.visualdiffer.stringUtils.PatternMatcher.regexpFromGlobContains(globString));
            } else {
              this.regexp = new RegExp(extensions.dafizilla.visualdiffer.stringUtils.PatternMatcher.regexpFromGlobContains(globString), "i");
            }
            this.matches = function(actual) {
                return this.regexp.test(actual);
            };
        },

	/**
	 * Identical to glob but allows case insensitive search
	 * 18/May/2008 Added by davide ficano <davide.ficano@gmail.com>
	 */
	globCase: function(globString, matchesCase) {
	    if (matchesCase) {
	      this.regexp = new RegExp(extensions.dafizilla.visualdiffer.stringUtils.PatternMatcher.regexpFromGlob(globString));
	    } else {
	      this.regexp = new RegExp(extensions.dafizilla.visualdiffer.stringUtils.PatternMatcher.regexpFromGlob(globString), "i");
	    }
	    this.matches = function(actual) {
		return this.regexp.test(actual);
	    };
	},

        /**
         * "glob" (aka "wildmat") patterns, e.g. "glob:one,two,*"
         */
        glob: function(globString) {
            this.regexp = new RegExp(extensions.dafizilla.visualdiffer.stringUtils.PatternMatcher.regexpFromGlob(globString));
            this.matches = function(actual) {
                return this.regexp.test(actual);
            };
        }

    };

    this.PatternMatcher.convertGlobMetaCharsToRegexpMetaChars = function(glob) {
        var re = glob;
        re = re.replace(/([.^$+(){}\[\]\\|])/g, "\\$1");
        re = re.replace(/\?/g, "(.|[\r\n])");
        re = re.replace(/\*/g, "(.|[\r\n])*");
        return re;
    };

    this.PatternMatcher.regexpFromGlobContains = function(globContains) {
        return extensions.dafizilla.visualdiffer.stringUtils.PatternMatcher.convertGlobMetaCharsToRegexpMetaChars(globContains);
    };

    this.PatternMatcher.regexpFromGlob = function(glob) {
        return "^" + extensions.dafizilla.visualdiffer.stringUtils.PatternMatcher.convertGlobMetaCharsToRegexpMetaChars(glob) + "$";
    };
}).apply(extensions.dafizilla.visualdiffer.stringUtils);
