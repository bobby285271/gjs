// SPDX-License-Identifier: MIT OR LGPL-2.0-or-later
// SPDX-FileCopyrightText: 2020 Marco Trevisan <marco.trevisan@canonical.com>

import {
    ALL_TYPES,
    FLOATING_TYPES,
    getContent,
    getDefaultContentByType,
    getGType,
    INSTANCED_TYPES,
    setContent,
    skipUnsupported
} from './dataUtils.js';

const {GObject, GIMarshallingTests} = imports.gi;

describe('GObject value (GValue)', function () {
    let v;
    beforeEach(function () {
        v = new GObject.Value();
    });

    ALL_TYPES.forEach(type => {
        const gtype = getGType(type);
        it(`initializes ${type}`, function () {
            v.init(gtype);
        });

        it(`${type} is compatible with itself`, function () {
            expect(GObject.Value.type_compatible(gtype, gtype)).toBeTruthy();
        });

        it(`${type} is transformable to itself`, function () {
            expect(GObject.Value.type_transformable(gtype, gtype)).toBeTruthy();
        });

        describe('initialized', function () {
            let randomContent;
            beforeEach(function () {
                v.init(gtype);
                randomContent = getDefaultContentByType(type);
            });

            it(`sets and gets ${type}`, function () {
                skipUnsupported(type);
                setContent(v, type, randomContent);
                expect(getContent(v, type)).toEqual(randomContent);
            });

            it(`can be passed to a function and returns a ${type}`, function () {
                skipUnsupported(type);
                setContent(v, type, randomContent);
                expect(GIMarshallingTests.gvalue_round_trip(v)).toEqual(randomContent);
                expect(GIMarshallingTests.gvalue_copy(v)).toEqual(randomContent);
            }).pend('https://gitlab.gnome.org/GNOME/gobject-introspection/-/merge_requests/268');

            it(`copies ${type}`, function () {
                skipUnsupported(type);
                setContent(v, type, randomContent);

                const other = new GObject.Value();
                other.init(gtype);
                v.copy(other);
                expect(getContent(other, type)).toEqual(randomContent);
            });
        });

        it(`can be marshalled and un-marshalled from JS ${type}`, function () {
            if (['gtype', 'gvalue'].includes(type))
                pending('Not supported - always implicitly converted');
            const content = getDefaultContentByType(type);
            expect(GIMarshallingTests.gvalue_round_trip(content)).toEqual(content);
        }).pend('https://gitlab.gnome.org/GNOME/gobject-introspection/-/merge_requests/268');
    });

    ['int', 'uint', 'boolean', 'gtype', ...FLOATING_TYPES].forEach(type => {
        it(`can be marshalled and un-marshalled from JS gtype of ${type}`, function () {
            const gtype = getGType(type);
            expect(GIMarshallingTests.gvalue_round_trip(gtype).constructor.$gtype).toEqual(gtype);
        }).pend('https://gitlab.gnome.org/GNOME/gobject-introspection/-/merge_requests/268');
    });

    INSTANCED_TYPES.forEach(type => {
        it(`initializes from instance of ${type}`, function () {
            skipUnsupported(type);
            const instance = getDefaultContentByType(type);
            v.init_from_instance(instance);
            expect(getContent(v, type)).toEqual(instance);
        });
    });

    afterEach(function () {
        v.unset();
    });
});
