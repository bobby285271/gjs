// SPDX-License-Identifier: MIT OR LGPL-2.0-or-later
// SPDX-FileCopyrightText: 2022 Evan Welsh <contact@evanwelsh.com>

/**
 * @typedef {F extends ((...args: infer Args) => infer Result) ?  ((instance: I, ...args: Args) => Result) : never} UncurriedFunction
 * @template I
 * @template F
 */

/**
 * @template {Record<string, any>} T
 * @template {keyof T} K
 * @param {T} [type] the instance type for the function
 * @param {K} key the function to curry
 * @returns {UncurriedFunction<T, T[K]>}
 */
function uncurryThis(type, key) {
    const func = type[key];
    return (instance, ...args) => func.apply(instance, args);
}

const primordials = {
    ArrayPrototypeSlice: uncurryThis(Array.prototype, 'slice'),
    ArrayPrototypeSort: uncurryThis(Array.prototype, 'sort'),
    RegExpPrototypeTest: uncurryThis(RegExp.prototype, 'test'),
    StringFromCharCode: String.fromCharCode,
    StringPrototypeCharCodeAt: uncurryThis(String.prototype, 'charCodeAt'),
    StringPrototypeCodePointAt: uncurryThis(String.prototype, 'codePointAt'),
    StringPrototypeMatch: uncurryThis(String.prototype, 'match'),
    StringPrototypeSlice: uncurryThis(String.prototype, 'slice'),
    StringPrototypeToLowerCase: uncurryThis(String.prototype, 'toLowerCase'),
    Symbol,
    NumberIsNaN: Number.isNaN,
};

export {primordials, uncurryThis};
