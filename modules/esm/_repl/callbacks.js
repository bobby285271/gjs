// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: Node.js contributors. All rights reserved.

/* eslint-disable */

import {primordials} from './primordials.js';

const {
    NumberIsNaN,
} = primordials;

const ERR_INVALID_ARG_VALUE = Error;
const ERR_INVALID_CURSOR_POS = Error;

// Adapted from https://github.com/nodejs/node/blob/56679eb53044b03e4da0f7420774d54f0c550eec/lib/internal/readline/callbacks.js

import {CSI} from './utils.js';

const {
    kClearLine,
    kClearToLineBeginning,
    kClearToLineEnd,
} = CSI;


/**
 * moves the cursor to the x and y coordinate on the given stream
 */

/**
 * @param x
 * @param y
 */
function cursorTo(x, y) {
    if (NumberIsNaN(x))
        throw new ERR_INVALID_ARG_VALUE('x', x);
    if (NumberIsNaN(y))
        throw new ERR_INVALID_ARG_VALUE('y', y);

    if (typeof x !== 'number')
        throw new ERR_INVALID_CURSOR_POS();

    const data = typeof y !== 'number' ? CSI`${x + 1}G` : CSI`${y + 1};${x + 1}H`;
    return data;
}

/**
 * moves the cursor relative to its current location
 */

/**
 * @param dx
 * @param dy
 */
function moveCursor(dx, dy) {
    let data = '';

    if (dx < 0)
        data += CSI`${-dx}D`;
    else if (dx > 0)
        data += CSI`${dx}C`;


    if (dy < 0)
        data += CSI`${-dy}A`;
    else if (dy > 0)
        data += CSI`${dy}B`;


    return data;
}

/**
 * clears the current line the cursor is on:
 *   -1 for left of the cursor
 *   +1 for right of the cursor
 *    0 for the entire line
 */

/**
 * @param dir
 */
function clearLine(dir) {
    const type =
        dir < 0 ? kClearToLineBeginning : dir > 0 ? kClearToLineEnd : kClearLine;
    return type;
}



/**
 * clears the screen from the current position of the cursor down
 */

export {
    clearLine,
    cursorTo,
    moveCursor
};
