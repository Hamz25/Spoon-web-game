// src/engine/core/EventBus.js
/*
  A simple publish/subscribe event bus.

  Why this exists: without it, systems end up directly calling each other
  (e.g. CollisionSystem importing AudioManager just to play a stomp sound),
  which tangles unrelated parts of the engine together. With the bus,
  CollisionSystem just does `eventBus.emit('enemyDefeated', enemy)` and
  doesn't need to know or care who (if anyone) is listening - AudioManager,
  HUD, a score tracker, anything can subscribe independently.
*/

export class EventBus {
    constructor() {
        this.listeners = new Map(); // eventName -> Set of callback functions
    }

    // Subscribe to an event. Returns an "unsubscribe" function for convenience,
    // so callers can do: const stop = eventBus.on('x', fn); ...later: stop();
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(callback);

        return () => this.off(eventName, callback);
    }

    // Subscribe to an event, but only fire once, then auto-unsubscribe.
    // Useful for one-time things like 'gameReady' or 'levelComplete'.
    once(eventName, callback) {
        const wrapped = (...args) => {
            this.off(eventName, wrapped);
            callback(...args);
        };
        this.on(eventName, wrapped);
    }

    // Remove a previously registered callback for an event.
    off(eventName, callback) {
        const callbacks = this.listeners.get(eventName);
        if (!callbacks) return;
        callbacks.delete(callback);
        if (callbacks.size === 0) {
            this.listeners.delete(eventName); // tidy up - no point keeping an empty Set around
        }
    }

    // Fire an event. Every subscriber for this eventName gets called synchronously,
    // in the order they subscribed, with whatever arguments are passed through.
    emit(eventName, ...args) {
        const callbacks = this.listeners.get(eventName);
        if (!callbacks) return; // no one is listening - that's fine, not an error

        // Copy to an array before iterating: if a callback unsubscribes itself
        // (or subscribes a new one) mid-emit, mutating the live Set while
        // iterating it would cause listeners to be skipped or double-called.
        for (const callback of [...callbacks]) {
            callback(...args);
        }
    }

    // Remove every listener for a given event, or every listener for every
    // event if no eventName is given. Mainly useful when tearing down a scene.
    clear(eventName) {
        if (eventName) {
            this.listeners.delete(eventName);
        } else {
            this.listeners.clear();
        }
    }
}

// Most of the engine just wants ONE shared bus (player, enemies, HUD, audio
// all talking to the same channel) rather than wiring instances together by
// hand, so export a ready-to-use singleton alongside the class. Import this
// directly unless you specifically need an isolated bus (e.g. for a test).
export const eventBus = new EventBus();