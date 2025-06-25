/**
 * Universal Cart for ACT-Rental
 *
 * Модульная система корзин для временного хранения позиций оборудования
 * Версия: 1.0.0
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

class UniversalCart {
    /**
     * Конструктор Universal Cart
     * @param {Object} config - Конфигурация корзины
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

        // Подклассы (будут инициализированы позже)
        this.storage = null;
        this.ui = null;
        this.validator = null;

        // Initialize
        this._init();
    }

    /**
     * Инициализация корзины
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
     * Добавление позиции в корзину
     * @param {Object} item - Объект позиции оборудования
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
     * Удаление позиции из корзины
     * @param {string} itemKey - Ключ позиции
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
     * Обновление количества позиции
     * @param {string} itemKey - Ключ позиции
     * @param {number} quantity - Новое количество
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
     * Получение всех позиций
     * @returns {Array}
     */
    getItems() {
        return Array.from(this.items.values());
    }

    /**
     * Получение позиции по ключу
     * @param {string} itemKey - Ключ позиции
     * @returns {Object|null}
     */
    getItem(itemKey) {
        return this.items.get(itemKey) || null;
    }

    /**
     * Получение количества позиций
     * @returns {number}
     */
    getItemCount() {
        return this.items.size;
    }

    /**
     * Получение общего количества единиц оборудования
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
     * Очистка корзины
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
     * Проверка пустоты корзины
     * @returns {boolean}
     */
    isEmpty() {
        return this.items.size === 0;
    }

    /**
     * Валидация позиции оборудования
     * @param {Object} item - Объект позиции
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
     * Обработка позиции перед добавлением
     * @param {Object} item - Исходная позиция
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
     * Генерация уникального ключа для позиции
     * @param {Object} item - Объект позиции
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
     * Загрузка данных из хранилища
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
     * Сохранение данных в хранилище
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
     * Подписка на события
     * @param {string} event - Название события
     * @param {Function} callback - Функция обратного вызова
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Отписка от событий
     * @param {string} event - Название события
     * @param {Function} callback - Функция обратного вызова
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
     * Генерация события
     * @param {string} event - Название события
     * @param {Object} data - Данные события
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
     * Получение отладочной информации
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
