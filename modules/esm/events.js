// SPDX-License-Identifier: MIT OR LGPL-2.0-or-later
// SPDX-FileCopyrightText: 2022 Evan Welsh <contact@evanwelsh.com>

class Connection {
    #instance;
    #name;
    #callback;
    #disconnected;

    /**
     * @param {object} params _
     * @param {EventEmitter} params.instance the instance the connection is connected to
     * @param {string} params.name the name of the signal
     * @param {Function} params.callback the callback for the signal
     * @param {boolean} params.disconnected whether the connection is disconnected
     */
    constructor({instance, name, callback, disconnected = false}) {
        this.#instance = instance;
        this.#name = name;
        this.#callback = callback;
        this.#disconnected = disconnected;
    }

    disconnect() {
        this.#instance.disconnect(this);
    }

    trigger(...args) {
        this.#callback.apply(null, [this.#instance, ...args]);
    }

    get name() {
        return this.#name;
    }

    set disconnected(value) {
        if (!value)
            throw new Error('Connections cannot be re-connected.');

        this.#disconnected = value;
    }

    get disconnected() {
        return this.#disconnected;
    }
}

export class EventEmitter {
    /** @type {Connection[]} */
    #signalConnections = [];

    connect(name, callback) {
        // be paranoid about callback arg since we'd start to throw from emit()
        // if it was messed up
        if (typeof callback !== 'function')
            throw new Error('When connecting signal must give a callback that is a function');

        const connection = new Connection({
            instance: this,
            name,
            callback,
        });

        // this makes it O(n) in total connections to emit, but I think
        // it's right to optimize for low memory and reentrancy-safety
        // rather than speed
        this.#signalConnections.push(connection);

        return connection;
    }

    /**
     * @param {Connection} connection the connection returned by {@link connect}
     */
    disconnect(connection) {
        if (connection.disconnected)
            throw new Error(`Signal handler for ${connection.name} already disconnected`);

        const index = this.#signalConnections.indexOf(connection);
        if (index !== -1) {
            // Mark the connection as disconnected.
            connection.disconnected = true;

            this.#signalConnections.splice(index, 1);
            return;
        }

        throw new Error('No signal connection found for connection');
    }

    /**
     * @param {Connection} connection the connection returned by {@link connect}
     * @returns {boolean} whether the signal connection is connected
     */
    signalHandlerIsConnected(connection) {
        const index = this.#signalConnections.indexOf(connection);
        return index !== -1 && !connection.disconnected;
    }

    disconnectAll() {
        while (this.#signalConnections.length > 0)
            this.#signalConnections[0].disconnect();
    }

    /**
     * @param {string} name the signal name to emit
     * @param {...any} args the arguments to pass
     */
    emit(name, ...args) {
        // To deal with re-entrancy (removal/addition while
        // emitting), we copy out a list of what was connected
        // at emission start; and just before invoking each
        // handler we check its disconnected flag.
        let handlers = [];
        let i;
        let length = this.#signalConnections.length;
        for (i = 0; i < length; ++i) {
            let connection = this.#signalConnections[i];
            if (connection.name === name)
                handlers.push(connection);
        }

        length = handlers.length;
        for (i = 0; i < length; ++i) {
            let connection = handlers[i];
            if (!connection.disconnected) {
                try {
                    // since we pass "null" for this, the global object will be used.
                    let ret = connection.trigger(...args);

                    // if the callback returns true, we don't call the next
                    // signal handlers
                    if (ret === true)
                        break;
                } catch (e) {
                    // just log any exceptions so that callbacks can't disrupt
                    // signal emission
                    console.error(`Exception in callback for signal: ${name}\n`, e);
                }
            }
        }
    }
}
