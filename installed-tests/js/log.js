// SPDX-License-Identifier: MIT OR LGPL-2.0-or-later
// SPDX-FileCopyrightText: 2022 Evan Welsh <contact@evanwelsh.com>

import GLib from 'gi://GLib';

import {DEFAULT_LOG_DOMAIN} from 'console';
import {decodedStringMatching} from './matchers.js';

export function objectContainingLogMessage(
    message,
    domain = DEFAULT_LOG_DOMAIN,
    fields = {}
) {
    return jasmine.objectContaining({
        MESSAGE: decodedStringMatching(message),
        GLIB_DOMAIN: decodedStringMatching(domain),
        ...fields,
    });
}

/**
 * @param {jasmine.Spy<(_level: any, _fields: any) => any>} writerFunc _
 * @param {RegExp | string} message _
 * @param {*} [logLevel] _
 * @param {*} [domain] _
 * @param {*} [fields] _
 */
export function expectLog(
    writerFunc,
    message,
    logLevel = GLib.LogLevelFlags.LEVEL_MESSAGE,
    domain = DEFAULT_LOG_DOMAIN,
    fields = {}
) {
    expect(writerFunc).toHaveBeenCalledOnceWith(
        logLevel,
        objectContainingLogMessage(message, domain, fields)
    );

    // Always reset the calls, so that we can assert at the end that no
    // unexpected messages were logged
    writerFunc.calls.reset();
}

export function spyOnWriterFunc() {
    /** @type {jasmine.Spy<(_level: any, _fields: any) => any>} */
    let writerFunc = jasmine.createSpy(
        'Console test writer func',
        function (level, _fields) {
            if (level === GLib.LogLevelFlags.ERROR)
                return GLib.LogWriterOutput.UNHANDLED;

            return GLib.LogWriterOutput.HANDLED;
        }
    );

    beforeAll(function () {
        writerFunc.and.callThrough();

        GLib.log_set_writer_func(writerFunc);
    });

    beforeEach(function () {
        writerFunc.calls.reset();
    });

    return writerFunc;
}
