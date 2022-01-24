// SPDX-License-Identifier: MIT OR LGPL-2.0-or-later
// SPDX-FileCopyrightText: 2021 Evan Welsh <contact@evanwelsh.com>

// eslint-disable-next-line
/// <reference types="jasmine" />

import GLib from 'gi://GLib';
import {spyOnWriterFunc, expectLog} from './log.js';

describe('console', function () {
    const writerFunc = spyOnWriterFunc();

    it('has correct object tag', function () {
        expect(console.toString()).toBe('[object console]');
    });

    it('logs a message', function () {
        console.log('a log');

        expectLog(writerFunc, 'a log', GLib.LogLevelFlags.LEVEL_MESSAGE);
    });

    it('logs a warning', function () {
        console.warn('a warning');

        expectLog(writerFunc, 'a warning', GLib.LogLevelFlags.LEVEL_WARNING);
    });

    it('logs an informative message', function () {
        console.info('an informative message');

        expectLog(writerFunc, 'an informative message', GLib.LogLevelFlags.LEVEL_INFO);
    });

    describe('clear()', function () {
        it('can be called', function () {
            console.clear();
        });

        it('resets indentation', function () {
            console.group('a group');
            expectLog(writerFunc, 'a group');
            console.log('a log');
            expectLog(writerFunc, '  a log');
            console.clear();
            console.log('a log');
            expectLog(writerFunc, 'a log');
        });
    });

    describe('table()', function () {
        it('logs at least something', function () {
            console.table(['title', 1, 2, 3]);
            expectLog(writerFunc, /title/);
        });
    });

    // %s - string
    // %d or %i - integer
    // %f - float
    // %o  - "optimal" object formatting
    // %O - "generic" object formatting
    // %c - "CSS" formatting (unimplemented by GJS)
    describe('string replacement', function () {
        const functions = {
            log: GLib.LogLevelFlags.LEVEL_MESSAGE,
            warn: GLib.LogLevelFlags.LEVEL_WARNING,
            info: GLib.LogLevelFlags.LEVEL_INFO,
            error: GLib.LogLevelFlags.LEVEL_CRITICAL,
        };

        Object.entries(functions).forEach(([fn, level]) => {
            it(`console.${fn}() supports %s`, function () {
                console[fn]('Does this %s substitute correctly?', 'modifier');
                expectLog(writerFunc, 'Does this modifier substitute correctly?', level);
            });

            it(`console.${fn}() supports %d`, function () {
                console[fn]('Does this %d substitute correctly?', 10);
                expectLog(writerFunc, 'Does this 10 substitute correctly?', level);
            });

            it(`console.${fn}() supports %i`, function () {
                console[fn]('Does this %i substitute correctly?', 26);
                expectLog(writerFunc, 'Does this 26 substitute correctly?', level);
            });

            it(`console.${fn}() supports %f`, function () {
                console[fn]('Does this %f substitute correctly?', 27.56331);
                expectLog(writerFunc, 'Does this 27.56331 substitute correctly?', level);
            });

            it(`console.${fn}() supports %o`, function () {
                console[fn]('Does this %o substitute correctly?', new Error());
                expectLog(writerFunc, /Does this Error\n.*substitute correctly\?/s, level);
            });

            it(`console.${fn}() supports %O`, function () {
                console[fn]('Does this %O substitute correctly?', new Error());
                expectLog(writerFunc, 'Does this {} substitute correctly?', level);
            });

            it(`console.${fn}() ignores %c`, function () {
                console[fn]('Does this %c substitute correctly?', 'modifier');
                expectLog(writerFunc, 'Does this  substitute correctly?', level);
            });

            it(`console.${fn}() supports mixing substitutions`, function () {
                console[fn](
                    'Does this %s and the %f substitute correctly alongside %d?',
                    'string',
                    3.14,
                    14
                );
                expectLog(
                    writerFunc,
                    'Does this string and the 3.14 substitute correctly alongside 14?',
                    level
                );
            });

            it(`console.${fn}() supports invalid numbers`, function () {
                console[fn](
                    'Does this support parsing %i incorrectly?',
                    'a string'
                );
                expectLog(writerFunc, 'Does this support parsing NaN incorrectly?', level);
            });

            it(`console.${fn}() supports missing substitutions`, function () {
                console[fn]('Does this support a missing %s substitution?');
                expectLog(
                    writerFunc,
                    'Does this support a missing %s substitution?',
                    level
                );
            });
        });
    });

    describe('time()', function () {
        it('ends correctly', function (done) {
            console.time('testing time');

            // console.time logs nothing.
            expect(writerFunc).not.toHaveBeenCalled();

            setTimeout(() => {
                console.timeLog('testing time');

                expectLog(writerFunc, /testing time: (.*)ms/);

                console.timeEnd('testing time');

                expectLog(writerFunc, /testing time: (.*)ms/);

                console.timeLog('testing time');

                expectLog(
                    writerFunc,
                    "No time log found for label: 'testing time'.",
                    GLib.LogLevelFlags.LEVEL_WARNING
                );

                done();
            }, 10);
        });

        it("doesn't log initially", function (done) {
            console.time('testing time');

            // console.time logs nothing.
            expect(writerFunc).not.toHaveBeenCalled();

            setTimeout(() => {
                console.timeEnd('testing time');
                expectLog(writerFunc, /testing time: (.*)ms/);

                done();
            }, 10);
        });

        afterEach(function () {
            // Ensure we only got the log lines that we expected
            expect(writerFunc).not.toHaveBeenCalled();
        });
    });
});
