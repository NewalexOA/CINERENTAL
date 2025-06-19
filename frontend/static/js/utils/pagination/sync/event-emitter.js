/**
 * Event Emitter for Pagination Component
 * Provides event system for synchronization between pagination instances
 */

/**
 * Simple event emitter implementation
 */
export class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }

        this.events.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     * @returns {Function} Unsubscribe function
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (...args) => {
            unsubscribe();
            callback(...args);
        });
        return unsubscribe;
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.events.delete(event);
            }
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {...*} args - Event arguments
     */
    emit(event, ...args) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event callback for '${event}':`, error);
                }
            });
        }
    }

    /**
     * Remove all event listeners
     */
    removeAllListeners() {
        this.events.clear();
    }

    /**
     * Get list of events
     * @returns {string[]} Array of event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Get number of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        const callbacks = this.events.get(event);
        return callbacks ? callbacks.size : 0;
    }
}
