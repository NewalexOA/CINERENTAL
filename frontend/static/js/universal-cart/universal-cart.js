/**
 * Universal Cart for ACT-Rental
 *
 * Modular cart system for temporary storage of equipment positions
 * Version: 1.0.0
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

class UniversalCart {
    /**
     * Universal Cart constructor
     * @param {Object} config - Cart configuration
     */
    constructor(config = {}) {
        // Merge with default config
        this.config = {
            type: 'equipment_add',
            maxItems: 100,
            enableStorage: true,
            autoSave: true,
            debug: false,
            ...config
        };

        // Core properties
        this.items = new Map();
        this.listeners = new Map();
        this.isInitialized = false;

        // Subclasses (will be initialized later)
        this.storage = null;
        this.ui = null;
        this.validator = null;

        // Initialize
        this._init();
    }

    /**
     * Cart initialization
     * @private
     */
    async _init() {
        try {
            if (this.config.debug) {
                console.log('[UniversalCart] Initializing with config:', this.config);
            }

            // Initialize storage if enabled
            if (this.config.enableStorage && typeof CartStorage !== 'undefined') {
                this.storage = new CartStorage(this.config);
                await this._loadFromStorage();
            }

            // Initialize UI if available
            if (typeof CartUI !== 'undefined') {
                this.ui = new CartUI(this);
            }

            this.isInitialized = true;
            this._emit('initialized', { config: this.config });

            if (this.config.debug) {
                console.log('[UniversalCart] Initialized successfully');
            }
        } catch (error) {
            console.error('[UniversalCart] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Add item to cart
     * @param {Object} item - Equipment item
     * @returns {Promise<boolean>}
     */
    async addItem(item) {
        try {
            // Validate item
            if (!this._validateItem(item)) {
                throw new Error('Invalid item structure');
            }

            // Check capacity
            if (this.items.size >= this.config.maxItems) {
                throw new Error(`Maximum capacity reached (${this.config.maxItems})`);
            }

            const itemKey = this._generateItemKey(item);

            // Handle quantity for existing items
            if (this.items.has(itemKey)) {
                const existingItem = this.items.get(itemKey);
                existingItem.quantity = (existingItem.quantity || 1) + (item.quantity || 1);

                this._emit('itemUpdated', {
                    key: itemKey,
                    item: existingItem,
                    previousQuantity: existingItem.quantity - (item.quantity || 1)
                });
            } else {
                // Add new item
                const processedItem = this._processItem(item);
                this.items.set(itemKey, processedItem);

                this._emit('itemAdded', {
                    key: itemKey,
                    item: processedItem
                });
            }

            // Auto-save if enabled
            if (this.config.autoSave) {
                await this._saveToStorage();
            }

            return true;

        } catch (error) {
            console.error('[UniversalCart] Failed to add item:', error);
            this._emit('error', { operation: 'addItem', error, item });
            return false;
        }
    }

    /**
     * Remove item from cart
     * @param {string} itemKey - Item key
     * @returns {boolean}
     */
    async removeItem(itemKey) {
        try {
            if (!this.items.has(itemKey)) {
                return false;
            }

            const item = this.items.get(itemKey);
            this.items.delete(itemKey);

            this._emit('itemRemoved', { key: itemKey, item });

            if (this.config.autoSave) {
                await this._saveToStorage();
            }

            return true;

        } catch (error) {
            console.error('[UniversalCart] Failed to remove item:', error);
            this._emit('error', { operation: 'removeItem', error, itemKey });
            return false;
        }
    }

    /**
     * Update item quantity
     * @param {string} itemKey - Item key
     * @param {number} quantity - New quantity
     * @returns {boolean}
     */
    async updateQuantity(itemKey, quantity) {
        try {
            if (!this.items.has(itemKey)) {
                return false;
            }

            const item = this.items.get(itemKey);
            const previousQuantity = item.quantity;

            if (quantity <= 0) {
                return await this.removeItem(itemKey);
            }

            item.quantity = quantity;
            this._emit('itemUpdated', { key: itemKey, item, previousQuantity });

            if (this.config.autoSave) {
                await this._saveToStorage();
            }

            return true;

        } catch (error) {
            console.error('[UniversalCart] Failed to update quantity:', error);
            this._emit('error', { operation: 'updateQuantity', error, itemKey, quantity });
            return false;
        }
    }

    /**
     * Get all items
     * @returns {Array}
     */
    getItems() {
        return Array.from(this.items.values());
    }

    /**
     * Get item by key
     * @param {string} itemKey - Item key
     * @returns {Object|null}
     */
    getItem(itemKey) {
        return this.items.get(itemKey) || null;
    }

    /**
     * Get item count
     * @returns {number}
     */
    getItemCount() {
        return this.items.size;
    }

    /**
     * Get total quantity
     * @returns {number}
     */
    getTotalQuantity() {
        let total = 0;
        for (const item of this.items.values()) {
            total += item.quantity || 1;
        }
        return total;
    }

    /**
     * Clear cart
     * @returns {Promise<boolean>}
     */
    async clear() {
        try {
            const itemCount = this.items.size;
            this.items.clear();

            this._emit('cleared', { previousItemCount: itemCount });

            if (this.config.autoSave) {
                await this._saveToStorage();
            }

            return true;

        } catch (error) {
            console.error('[UniversalCart] Failed to clear cart:', error);
            this._emit('error', { operation: 'clear', error });
            return false;
        }
    }

    /**
     * Check if cart is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this.items.size === 0;
    }

    /**
     * Validate equipment item
     * @param {Object} item - Equipment item
     * @returns {boolean}
     * @private
     */
    _validateItem(item) {
        return item &&
               typeof item === 'object' &&
               item.id &&
               item.name;
    }

    /**
     * Process item before adding
     * @param {Object} item - Original item
     * @returns {Object}
     * @private
     */
    _processItem(item) {
        return {
            id: item.id,
            name: item.name,
            serial_number: item.serial_number || null,
            category: item.category || null,
            subcategory: item.subcategory || null,
            quantity: item.quantity || 1,
            is_unique: item.is_unique || false,
            added_at: new Date().toISOString(),
            ...item
        };
    }

    /**
     * Generate unique item key
     * @param {Object} item - Equipment item
     * @returns {string}
     * @private
     */
    _generateItemKey(item) {
        if (item.is_unique && item.serial_number) {
            return `${item.id}_${item.serial_number}`;
        }
        return `${item.id}`;
    }

    /**
     * Load data from storage
     * @private
     */
    async _loadFromStorage() {
        if (!this.storage) return;

        try {
            const data = await this.storage.load();
            if (data && data.items) {
                this.items = new Map(Object.entries(data.items));
                this._emit('loaded', { itemCount: this.items.size });
            }
        } catch (error) {
            console.error('[UniversalCart] Failed to load from storage:', error);
        }
    }

    /**
     * Save data to storage
     * @private
     */
    async _saveToStorage() {
        if (!this.storage) return;

        try {
            const data = {
                items: Object.fromEntries(this.items),
                savedAt: new Date().toISOString(),
                config: this.config
            };
            await this.storage.save(data);
        } catch (error) {
            console.error('[UniversalCart] Failed to save to storage:', error);
        }
    }

    /**
     * Subscribe to events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Unsubscribe from events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     * @private
     */
    _emit(event, data = {}) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[UniversalCart] Event callback error for '${event}':`, error);
            }
        });
    }

    /**
     * Get debug information
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            config: this.config,
            itemCount: this.items.size,
            totalQuantity: this.getTotalQuantity(),
            isInitialized: this.isInitialized,
            hasStorage: !!this.storage,
            hasUI: !!this.ui,
            listeners: Object.fromEntries(
                Array.from(this.listeners.entries()).map(([event, callbacks]) => [
                    event,
                    callbacks.length
                ])
            )
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalCart;
}
