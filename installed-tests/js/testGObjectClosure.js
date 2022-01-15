// SPDX-License-Identifier: MIT OR LGPL-2.0-or-later
// SPDX-FileCopyrightText: 2022 Evan Welsh <contact@evanwelsh.com>

import GObject from 'gi://GObject';

import {
    ALL_TYPES,
    getDefaultContentByType,
    getGType,
    skipUnsupported
} from './dataUtils.js';

describe('GObject closure (GClosure)', function () {
    let spyFn;
    let closure;
    beforeEach(function () {
        spyFn = jasmine.createSpy();
        closure = new GObject.Closure(spyFn);
    });

    it('is an instanceof GObject.Closure', function () {
        expect(closure instanceof GObject.Closure).toBeTruthy();
    });

    ALL_TYPES.forEach(type => {
        const gtype = getGType(type);

        it(`can return ${type}`, function () {
            let randomContent = getDefaultContentByType(type);

            skipUnsupported(type);
            spyFn.and.returnValue(randomContent);
            expect(closure.invoke(gtype, [])).toEqual(randomContent);
        });
    });

    it('can be invalidated', function () {
        spyFn.and.returnValue(13);
        expect(closure.invoke(GObject.TYPE_INT, [])).toBe(13);
        closure.invalidate();
        expect(closure.invoke(null, [])).toBe(null);
    });

    it('can be called with parameters', function () {
        const plusClosure = new GObject.Closure((a, b) => {
            return a + b;
        });

        expect(plusClosure.invoke(GObject.TYPE_INT, [5, 6])).toBe(11);
        expect(plusClosure.invoke(GObject.TYPE_STRING, ['hello', ', world'])).toBe('hello, world');
    });

    afterEach(function () {
        closure = null;
    });
});
