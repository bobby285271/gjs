// SPDX-License-Identifier: MIT OR LGPL-2.0-or-later
// SPDX-FileCopyrightText: 2008 litl, LLC
// SPDX-FileCopyrightText: 2022 Evan Welsh <contact@evanwelsh.com>

import GLib from 'gi://GLib';

import {EventEmitter} from 'events';
import {spyOnWriterFunc, expectLog} from './log.js';

class FooEmitter extends EventEmitter { }

describe('Class extending EventEmitter', () => {
    let foo, bar;

    beforeEach(function () {
        foo = new FooEmitter();
        bar = jasmine.createSpy('bar');
    });

    it('calls a signal handler when a signal is emitted', function () {
        foo.connect('bar', bar);
        foo.emit('bar', 'This is a', 'This is b');
        expect(bar).toHaveBeenCalledWith(foo, 'This is a', 'This is b');
    });

    it('does not call a signal handler after the signal is disconnected', function () {
        let connection = foo.connect('bar', bar);
        foo.emit('bar', 'This is a', 'This is b');
        bar.calls.reset();
        foo.disconnect(connection);
        // this emission should do nothing
        foo.emit('bar', 'Another a', 'Another b');
        expect(bar).not.toHaveBeenCalled();
    });

    it('does not call a signal handler after disconnect() is called on the connection', function () {
        let connection = foo.connect('bar', bar);
        foo.emit('bar', 'This is a', 'This is b');
        bar.calls.reset();
        connection.disconnect();
        // this emission should do nothing
        foo.emit('bar', 'Another a', 'Another b');
        expect(bar).not.toHaveBeenCalled();
    });

    it('calls a signal handler after trigger() is called on the connection', function () {
        foo.connect('bar', bar).trigger();

        expect(bar).toHaveBeenCalled();
    });

    it('can disconnect a signal handler during signal emission', function () {
        var toRemove = [];
        let firstConnection = foo.connect('bar', function (theFoo) {
            theFoo.disconnect(toRemove[0]);
            theFoo.disconnect(toRemove[1]);
        });
        toRemove.push(foo.connect('bar', bar));
        toRemove.push(foo.connect('bar', bar));

        // emit signal; what should happen is that the second two handlers are
        // disconnected before they get invoked
        foo.emit('bar');
        expect(bar).not.toHaveBeenCalled();

        // clean up the last handler
        foo.disconnect(firstConnection);

        expect(foo.signalHandlerIsConnected(firstConnection)).toBeFalse();
        expect(foo.signalHandlerIsConnected(toRemove[0])).toBeFalse();
        expect(foo.signalHandlerIsConnected(toRemove[1])).toBeFalse();
    });

    it('distinguishes multiple signals', function () {
        let bonk = jasmine.createSpy('bonk');
        foo.connect('bar', bar);
        foo.connect('bonk', bonk);
        foo.connect('bar', bar);

        foo.emit('bar');
        expect(bar).toHaveBeenCalledTimes(2);
        expect(bonk).not.toHaveBeenCalled();

        foo.emit('bonk');
        expect(bar).toHaveBeenCalledTimes(2);
        expect(bonk).toHaveBeenCalledTimes(1);

        foo.emit('bar');
        expect(bar).toHaveBeenCalledTimes(4);
        expect(bonk).toHaveBeenCalledTimes(1);

        foo.disconnectAll();
        bar.calls.reset();
        bonk.calls.reset();

        // these post-disconnect emissions should do nothing
        foo.emit('bar');
        foo.emit('bonk');
        expect(bar).not.toHaveBeenCalled();
        expect(bonk).not.toHaveBeenCalled();
    });

    it('determines if a signal is connected on a JS object', function () {
        let connection = foo.connect('bar', bar);
        expect(foo.signalHandlerIsConnected(connection)).toEqual(true);
        foo.disconnect(connection);
        expect(foo.signalHandlerIsConnected(connection)).toEqual(false);
    });

    describe('with exception in signal handler', function () {
        const writerFunc = spyOnWriterFunc();

        let bar2;

        beforeEach(function () {
            bar.and.throwError('Exception we are throwing on purpose');
            bar2 = jasmine.createSpy('bar');
            foo.connect('bar', bar);
            foo.connect('bar', bar2);
            foo.emit('bar');

            expectLog(writerFunc, /Exception in callback for signal: bar/, GLib.LogLevelFlags.LEVEL_CRITICAL);
        });

        it('does not affect other callbacks', function () {
            expect(bar).toHaveBeenCalledTimes(1);
            expect(bar2).toHaveBeenCalledTimes(1);
        });

        it('does not disconnect the callback', function () {
            foo.emit('bar');
            expect(bar).toHaveBeenCalledTimes(2);
            expect(bar2).toHaveBeenCalledTimes(2);

            expectLog(writerFunc, /Exception in callback for signal: bar/, GLib.LogLevelFlags.LEVEL_CRITICAL);
        });
    });
});
