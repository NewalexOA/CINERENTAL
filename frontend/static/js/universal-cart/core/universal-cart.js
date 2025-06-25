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
            listeners: Object.fromEntries(this.listeners),
            isInitialized: this.isInitialized,
            storageEnabled: this.storage !== null,
            uiEnabled: this.ui !== null
        };
    }

    /**
     * Execute action - create bookings from cart
     * @param {Object} actionConfig - Action configuration
     * @returns {Promise<Object>}
     */
    async executeAction(actionConfig = {}) {
        try {
            if (this.isEmpty()) {
                throw new Error('Cannot execute action: cart is empty');
            }

            // Validate action configuration
            const config = {
                type: actionConfig.type || this.config.type,
                projectId: actionConfig.projectId,
                clientId: actionConfig.clientId,
                startDate: actionConfig.startDate,
                endDate: actionConfig.endDate,
                showProgress: actionConfig.showProgress !== false,
                validateAvailability: actionConfig.validateAvailability !== false,
                ...actionConfig
            };

            if (!config.clientId) {
                throw new Error('Client ID is required for booking creation');
            }

            if (!config.startDate || !config.endDate) {
                throw new Error('Start date and end date are required');
            }

            // Show progress if enabled
            if (config.showProgress && this.ui) {
                this.ui.showProgress('Создание бронирований...', 0);
            }

            // Validate availability if enabled
            if (config.validateAvailability) {
                const validationResult = await this._validateAvailability(config);
                if (!validationResult.success) {
                    if (config.showProgress && this.ui) {
                        this.ui.hideProgress();
                    }
                    return validationResult;
                }
            }

            // Prepare booking data
            const bookingsData = await this._prepareBookingsData(config);

            if (config.showProgress && this.ui) {
                this.ui.updateProgress('Отправка данных...', 50);
            }

            // Execute batch booking creation
            const result = await this._executeBookingCreation(bookingsData, config);

            // Handle results
            if (result.success) {
                if (config.showProgress && this.ui) {
                    this.ui.updateProgress('Завершение...', 90);
                }

                // Clear cart on success
                await this.clear();

                if (config.showProgress && this.ui) {
                    this.ui.updateProgress('Готово!', 100);
                    setTimeout(() => this.ui.hideProgress(), 1000);
                }

                // Emit success event
                this._emit('actionCompleted', {
                    type: config.type,
                    result: result
                });

                return {
                    success: true,
                    message: result.message,
                    createdCount: result.created_count,
                    failedCount: result.failed_count,
                    createdBookings: result.created_bookings,
                    failedBookings: result.failed_bookings
                };
            } else {
                if (config.showProgress && this.ui) {
                    this.ui.hideProgress();
                }

                this._emit('actionFailed', {
                    type: config.type,
                    error: result.error || 'Unknown error'
                });

                return {
                    success: false,
                    error: result.error || 'Failed to create bookings'
                };
            }

        } catch (error) {
            console.error('[UniversalCart] Action execution failed:', error);

            if (actionConfig.showProgress && this.ui) {
                this.ui.hideProgress();
            }

            this._emit('error', {
                operation: 'executeAction',
                error: error.message,
                actionConfig
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate equipment availability
     * @param {Object} config - Configuration
     * @returns {Promise<Object>}
     * @private
     */
    async _validateAvailability(config) {
        try {
            const items = this.getItems();
            const unavailableItems = [];

            // Check each item availability (simplified validation)
            for (const item of items) {
                // In real implementation, this would call API to check availability
                if (item.status === 'unavailable' || item.quantity > item.available_quantity) {
                    unavailableItems.push({
                        equipmentId: item.equipment_id,
                        name: item.name,
                        reason: item.status === 'unavailable'
                            ? 'Equipment not available'
                            : 'Insufficient quantity available'
                    });
                }
            }

            if (unavailableItems.length > 0) {
                return {
                    success: false,
                    error: 'Some equipment is not available',
                    unavailableItems: unavailableItems
                };
            }

            return { success: true };

        } catch (error) {
            console.error('[UniversalCart] Availability validation failed:', error);
            return {
                success: false,
                error: 'Failed to validate availability'
            };
        }
    }

    /**
     * Prepare bookings data for API
     * @param {Object} config - Configuration
     * @returns {Promise<Array>}
     * @private
     */
    async _prepareBookingsData(config) {
        const items = this.getItems();
        const rentalDuration = this._calculateDays(config.startDate, config.endDate);

        return items.map(item => {
            const quantity = item.quantity || 1;
            const dailyRate = item.daily_rate || 0;

            // Calculate total amount based on rental duration
            // For hourly rentals (< 1 day), use fractional day calculation
            // For daily/multi-day rentals, use full day pricing
            const totalAmount = dailyRate * quantity * rentalDuration;

            return {
                client_id: config.clientId,
                equipment_id: item.equipment_id,
                start_date: config.startDate,
                end_date: config.endDate,
                quantity: quantity,
                total_amount: Math.round(totalAmount * 100) / 100 // Round to 2 decimal places
            };
        });
    }

    /**
     * Execute booking creation via API
     * @param {Array} bookingsData - Bookings data
     * @param {Object} config - Configuration
     * @returns {Promise<Object>}
     * @private
     */
    async _executeBookingCreation(bookingsData, config) {
        try {
            let url = '/api/v1/bookings/batch';
            if (config.projectId) {
                url += `?project_id=${config.projectId}`;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingsData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create bookings');
            }

            return await response.json();

        } catch (error) {
            console.error('[UniversalCart] Booking creation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate rental duration in days (including fractional days for hourly rentals)
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {number}
     * @private
     */
    _calculateDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Calculate difference in milliseconds
        const diffTime = Math.abs(end - start);

        // Convert to days (with decimals for hourly rentals)
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        // For rentals less than 24 hours, calculate as fraction of day
        if (diffDays < 1) {
            // Round to 2 decimal places for precision
            return Math.round(diffDays * 100) / 100;
        }

        // For multi-day rentals, round up to next day if there's any partial day
        return Math.ceil(diffDays);
    }
}

// Global export for browser usage
if (typeof window !== 'undefined') {
    window.UniversalCart = UniversalCart;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalCart;
}

// ES6 module export
if (typeof exports !== 'undefined') {
    exports.UniversalCart = UniversalCart;
}
