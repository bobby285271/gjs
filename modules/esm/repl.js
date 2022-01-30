// SPDX-License-Identifier: MIT OR LGPL-2.0-or-later
// SPDX-FileCopyrightText: 2021 Evan Welsh <contact@evanwelsh.com>

import GLib from 'gi://GLib';
let Gio;

import {emitKeys, CSI} from './_repl/utils.js';
import {cursorTo} from './_repl/callbacks.js';

import {EventEmitter} from './events.js';

const cursorHide = CSI`?25l`;
const cursorShow = CSI`?25h`;

const Console = import.meta.importSync('_consoleNative');

// TODO: Integrate with new printer once it is merged...

/**
 * @param {any} value any valid JavaScript value to stringify
 */
function toString(value) {
    if (typeof value === 'function')
        return value.toString();

    if (typeof value === 'object') {
        // JSON will error if the object
        // has circular references or cannot
        // be converted.
        try {
            return JSON.stringify(value);
        } catch {
        }
    }
    return `${value}`;
}

/**
 * @param {string} string the string to splice
 * @param {number} index the index to start removing characters at
 * @param {number} removeCount how many characters to remove
 * @param {string} replacement a string to replace the removed characters with
 * @returns {string}
 */
function StringSplice(string, index, removeCount = 0, replacement = '') {
    return string.slice(0, index) + replacement + string.slice(index + removeCount);
}

export class Readline extends EventEmitter {
    #prompt;
    #input = '';
    #cancelling = false;

    /**
     * Store pending lines
     *
     * @example
     * gjs > 'a pending line...
     * ..... '
     *
     * @type {string[]}
     */
    #pendingInputLines = [];

    /**
     * @param {object} options _
     * @param {string} options.prompt the prompt to print prior to the line
     */
    constructor({prompt}) {
        ({Gio} = imports.gi);

        super();

        this.#prompt = prompt;
    }

    [Symbol.toStringTag]() {
        return 'Readline';
    }

    get cancelled() {
        return this.#cancelling;
    }

    get line() {
        return this.#input;
    }

    set line(value) {
        this.#input = value;
    }

    validate(input) {
        return Console.isValid(input);
    }

    processLine() {
        const {line} = this;
        // Rebuild the input...
        const js = [...this.#pendingInputLines, line].join('\n');

        // Reset state...
        this.#input = '';

        // Only trigger input if this is a compilable unit...
        if (this.validate(js)) {
            // Reset lines before input is triggered
            this.#pendingInputLines = [];
            this.emit('line', js);
        } else {
            // Buffer the input until a compilable unit is found...
            this.#pendingInputLines.push(line);
        }
    }

    get inputPrompt() {
        if (this.#pendingInputLines.length > 0) {
            // Create a prefix like '... '
            return ' '.padStart(4, '.');
        }

        return this.#prompt;
    }

    print(_output) {
    }

    render() {
    }

    prompt() {
        this.#cancelling = false;
    }

    exit() {
    }

    cancel() {
        this.#cancelling = true;
    }
}

export class AsyncReadline extends Readline {
    #exitWarning;

    #parser;

    #cancellable = null;

    /**
     * Store previously inputted lines
     *
     * @type {string[]}
     */
    #history = [];

    /**
     * The cursor's current column position.
     */
    #cursorColumn = 0;

    /**
     * @param {object} options _
     * @param {Gio.UnixOutputStream} options.stdin the input stream to treat as stdin
     * @param {Gio.UnixOutputStream} options.stdout the output stream to treat as stdout
     * @param {Gio.UnixOutputStream} options.stderr the output stream to treat as stderr
     * @param {boolean} options.enableColor whether to print ANSI color codes
     * @param {string} options.prompt the prompt to print prior to the line
     */
    constructor({stdin, stdout, stderr, enableColor, prompt}) {
        super({prompt});

        this.stdin = stdin;
        this.stdout = stdout;
        this.stderr = stderr;
        this.enableColor = enableColor;


        this.#parser = emitKeys(this.#onKeyPress.bind(this));
        this.#parser.next();


        this.#exitWarning = false;
    }

    get line() {
        if (this.historyIndex > -1)
            return this.#history[this.historyIndex];


        return super.line;
    }

    set line(value) {
        if (this.historyIndex > -1) {
            this.#history[this.historyIndex] = value;
            return;
        }

        super.line = value;
    }

    exit() {
        if (this.#exitWarning) {
            this.#exitWarning = false;
            this.emit('exit');
        } else {
            this.#exitWarning = true;
            this.print('\n(To exit, press Ctrl+C again or Ctrl+D)\n');
        }
    }

    historyUp() {
        if (this.historyIndex < this.#history.length - 1) {
            this.historyIndex++;
            this.cursor = -1;
        }
    }

    historyDown() {
        if (this.historyIndex >= 0) {
            this.historyIndex--;
            this.cursor = -1;
        }
    }

    moveCursorToBeginning() {
        this.cursor = 0;
    }

    moveCursorToEnd() {
        this.cursor = this.line.length;
    }

    moveCursorLeft() {
        this.cursor--;
    }

    moveCursorRight() {
        this.cursor++;
    }

    addChar(char) {
        this.line = StringSplice(this.line, this.cursor, 0, char);
        this.moveCursorRight();
    }

    deleteChar() {
        const {line} = this;

        if (line.length > 0 && this.cursor > 0) {
            const x = StringSplice(line, this.cursor - 1, 1);

            this.line = x;
            this.moveCursorLeft();
        }
    }

    deleteCharRightOrClose() {
        const {line} = this;

        if (this.cursor < line.length - 1)
            this.line = StringSplice(this.line, this.cursor, 1);
        else
            this.exit();
    }

    deleteToBeginning() {
        this.line = StringSplice(this.line, 0, this.cursor);
    }

    deleteToEnd() {
        this.line = StringSplice(this.line, this.cursor);
    }

    /**
     * Adapted from lib/readline.js in Node.js
     */
    deleteWordLeft() {
        const {line} = this;

        if (this.cursor > 0) {
            // Reverse the string and match a word near beginning
            // to avoid quadratic time complexity
            let leading = line.slice(0, this.cursor);
            const reversed = [...leading].reverse().join('');
            const match = reversed.match(/^\s*(?:[^\w\s]+|\w+)?/);
            leading = leading.slice(0,
                leading.length - match[0].length);
            this.line = leading.concat(line.slice(this.cursor));
            this.cursor = leading.length;
        }
    }

    /**
     * Adapted from lib/readline.js in Node.js
     */
    deleteWordRight() {
        const {line} = this;

        if (line.length > 0 && this.cursor < line.length) {
            const trailing = line.slice(this.cursor);
            const match = trailing.match(/^(?:\s+|\W+|\w+)\s*/);
            this.line = line.slice(0, this.cursor).concat(
                trailing.slice(match[0].length));
        }
    }

    /**
     * Adapted from lib/readline.js in Node.js
     */
    wordLeft() {
        const {line} = this;
        if (this.cursor > 0) {
            // Reverse the string and match a word near beginning
            // to avoid quadratic time complexity
            const leading = line.slice(0, this.cursor);
            const reversed = [...leading].reverse().join('');
            const match = reversed.match(/^\s*(?:[^\w\s]+|\w+)?/);

            this.cursor -= match[0].length;
            this.cursor = Math.max(0, this.cursor);
        }
    }

    /**
     * Adapted from lib/readline.js in Node.js
     */
    wordRight() {
        const {line} = this;

        if (this.cursor < line.length) {
            const trailing = line.slice(this.cursor);
            const match = trailing.match(/^(?:\s+|[^\w\s]+|\w+)\s*/);

            this.cursor += match[0].length;
        }
    }

    processLine() {
        const {line} = this;

        this.#history.unshift(line);
        this.historyIndex = -1;
        this.#exitWarning = false;
        this.cursor = 0;
        this.#write('\n');

        super.processLine();
    }

    #onKeyPress(sequence, key) {
        this.#processKey(key);

        if (!this.cancelled)
            this.render();
    }

    #processKey(key) {
        if (!key.sequence)
            return;

        if (key.ctrl && !key.meta && !key.shift) {
            switch (key.name) {
            case 'c':
                this.exit();
                return;
            case 'h':
                this.deleteChar();
                return;
            case 'd':
                this.deleteCharRightOrClose();
                return;
            case 'u':
                this.deleteToBeginning();
                return;
            case 'k':
                this.deleteToEnd();
                return;
            case 'a':
                this.moveCursorToBeginning();
                return;
            case 'e':
                this.moveCursorToEnd();
                return;
            case 'b':
                this.moveCursorLeft();
                return;
            case 'f':
                this.moveCursorRight();
                return;
            case 'l':
                Console.clearTerminal();
                return;
            case 'n':
                this.historyDown();
                return;
            case 'p':
                this.historyUp();
                return;
            case 'z':
                // Pausing is unsupported.
                return;
            case 'w':
            case 'backspace':
                this.deleteWordLeft();
                return;
            case 'delete':
                this.deleteWordRight();
                return;
            case 'left':
                this.wordLeft();
                return;
            case 'right':
                this.wordRight();
                return;
            }
        } else if (key.meta && !key.shift) {
            switch (key.name) {
            case 'd':
                this.deleteWordRight();
                return;
            case 'backspace':
                this.deleteWordLeft();
                return;
            case 'b':
                this.wordLeft();
                return;
            case 'f':
                this.wordRight();
                return;
            }
        }

        switch (key.name) {
        case 'up':
            this.historyUp();
            return;
        case 'down':
            this.historyDown();
            return;
        case 'left':
            this.moveCursorLeft();
            return;
        case 'right':
            this.moveCursorRight();
            return;
        case 'backspace':
            this.deleteChar();
            return;
        case 'return':
            this.processLine();
            return;
        }

        this.addChar(key.sequence);
    }

    /**
     * @param {number} column the column to move the cursor to
     */
    set cursor(column) {
        if (column < 0) {
            this.#cursorColumn = 0;
            return;
        }

        // Ensure the input index isn't longer than the content...
        this.#cursorColumn = Math.min(this.line.length, column);
    }

    get cursor() {
        return this.#cursorColumn;
    }

    render() {
        // Prevent the cursor from flashing while we render...
        this.#write(cursorHide);

        const {inputPrompt, line} = this;

        this.#write(
            cursorTo(0),
            CSI.kClearScreenDown,
            inputPrompt,
            line,
            cursorTo(inputPrompt.length + this.cursor),
            cursorShow
        );

        this.emit('render');
    }

    #write(...strings) {
        const bytes = new TextEncoder().encode(strings.join(''));

        this.stdout.write_bytes(bytes, null);
        this.stdout.flush(null);
    }

    /**
     * @param {string[]} strings strings to write to stdout
     */
    print(...strings) {
        this.#write(...strings, '\n');
    }

    /**
     * @param {Uint8Array} bytes an array of inputted bytes to process
     * @returns {void}
     */
    handleInput(bytes) {
        if (bytes.length === 0)
            return;

        const input = String.fromCharCode(...bytes.values());

        for (const byte of input) {
            this.#parser.next(byte);

            if (this.cancelled)
                break;
        }
    }

    #asyncReadHandler(stream, result) {
        if (result) {
            try {
                const gbytes = stream.read_bytes_finish(result);

                this.handleInput(gbytes.toArray());
            } catch (error) {
                if (!error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)) {
                    console.error(error);
                    imports.system.exit(1);

                    return;
                }
            }
        }

        if (this.cancelled)
            return;

        this.#cancellable = new Gio.Cancellable();
        stream.read_bytes_async(8, 0, this.#cancellable, this.#asyncReadHandler.bind(this));
    }

    cancel() {
        super.cancel();

        this.#cancellable?.cancel();
        this.#cancellable = null;

        this.#write('\n');
    }

    prompt() {
        super.prompt();
        this.render();

        // Start the async read loop...
        this.#asyncReadHandler(this.stdin);
    }
}

export class SyncReadline extends Readline {
    constructor({prompt}) {
        super({prompt});
    }

    prompt() {
        while (!this.cancelled) {
            const {inputPrompt} = this;

            try {
                this.line = Console.interact(inputPrompt).split('');
            } catch {
                this.line = '';
            }


            this.processLine();
        }
    }

    print(output) {
        print(output);
    }
}

export class Repl {
    #lineNumber = 0;
    #isAsync = false;

    /** @type {boolean} */
    #supportsColor;
    /** @type {string} */
    #version;

    #mainloop = false;

    constructor() {
        ({Gio} = imports.gi);

        this.#version = imports.system.versionString;

        try {
            this.#supportsColor = GLib.log_writer_supports_color(1) && GLib.getenv('NO_COLOR') === null;
        } catch {
            this.#supportsColor ||= false;
        }

        try {
            this.#isAsync &&= GLib.getenv('GJS_REPL_USE_FALLBACK') !== 'true';
            this.#isAsync = 'UnixInputStream' in Gio && 'UnixOutputStream' in Gio;
            this.#isAsync &&= Console.enableRawMode();
        } catch {
            this.#isAsync = false;
        }
    }

    [Symbol.toStringTag]() {
        return 'Repl';
    }

    get lineNumber() {
        return this.#lineNumber;
    }

    get supportsColor() {
        return this.#supportsColor;
    }

    #print(string) {
        this.input.print(`${string}`);
    }

    #evaluateInternal(lines) {
        try {
            const result = Console.eval(lines, this.#lineNumber);

            if (result !== undefined)
                this.#print(`${toString(result)}`);

            return null;
        } catch (error) {
            return error;
        }
    }

    #printError(error) {
        if (error.message)
            this.#print(`Uncaught ${error.name}: ${error.message}`);
        else
            this.#print(`${toString(error)}`);
    }

    evaluate(lines) {
        this.#lineNumber++;

        // TODO(ewlsh): Object/code block detection similar to Node
        let wrappedLines = lines.trim();
        if (wrappedLines.startsWith('{') &&
            !wrappedLines.endsWith(';'))
            wrappedLines = `(${wrappedLines})\n`;

        // Attempt to evaluate any object literals in () first
        let error = this.#evaluateInternal(wrappedLines);
        if (!error)
            return;

        error = this.#evaluateInternal(lines);
        if (!error)
            return;

        this.#printError(error);
    }

    #start() {
        this.input.print(`GJS v${this.#version}`);

        this.input.connect('line', (_, line) => {
            if (typeof line === 'string' && line.trim().startsWith('exit()'))
                this.exit();
            else
                this.evaluate(line);
        });

        this.input.connect('exit', () => {
            this.exit();
        });

        this.input.prompt();
    }

    start() {
        if (!this.#isAsync) {
            this.input = new SyncReadline({prompt: '> '});

            this.#start();

            return;
        }

        try {
            const stdin = Gio.UnixInputStream.new(0, false);
            const stdout = new Gio.BufferedOutputStream({
                baseStream: Gio.UnixOutputStream.new(1, false),
                closeBaseStream: false,
                autoGrow: true,
            });
            const stderr = Gio.UnixOutputStream.new(2, false);

            this.input = new AsyncReadline({
                stdin,
                stdout,
                stderr,
                enableColor: this.#supportsColor,
                prompt: '> ',
            });

            this.#start();

            this.#mainloop = true;
            imports.mainloop.run('repl');
        } finally {
            Console.disableRawMode();
        }
    }

    exit() {
        try {
            this.input.cancel();

            if (this.#mainloop)
                imports.mainloop.quit('repl');
        } catch {
            // Force an exit if a user doesn't define their
            // replacement mainloop's quit function.
            imports.system.exit(1);
        }
    }
}

imports.console.Repl = Repl;
