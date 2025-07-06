/**
 * Cart Storage for Universal Cart
 *
 * Manages localStorage for cart state persistence
 * Uses modern approaches for browser storage management
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

class CartStorage {
    /**
     * CartStorage constructor
     * @param {Object} config - Cart configuration
     */
    constructor(config = {}) {
        this.config = config;
        this.storageKey = this._generateStorageKey();

        // Storage settings
        this.enableCompression = config.enableCompression || false;
        this.maxStorageSize = config.maxStorageSize || 5 * 1024 * 1024; // 5MB default

        // Check storage availability
        this.isAvailable = this._checkStorageAvailability();

        if (config.debug) {
            console.log('[CartStorage] Initialized:', {
                key: this.storageKey,
                available: this.isAvailable,
                compression: this.enableCompression
            });
        }
    }

    /**
     * Generate localStorage key
     * @returns {string}
     * @private
     */
    _generateStorageKey() {
        const cartType = this.config.type || 'default';
        const projectId = this._getCurrentProjectId();

        return `act_rental_cart_${cartType}_${projectId}`;
    }

    /**
     * Get current project ID
     * @returns {string}
     * @private
     */
    _getCurrentProjectId() {
        // Extract project ID from URL or global state
        const pathMatch = window.location.pathname.match(/\/projects\/(\d+)/);
        if (pathMatch) {
            return pathMatch[1];
        }

        // Fallback to global variable if available
        if (typeof currentProjectId !== 'undefined') {
            return currentProjectId;
        }

        return 'global';
    }

    /**
     * Check localStorage availability
     * @returns {boolean}
     * @private
     */
    _checkStorageAvailability() {
        try {
            const testKey = '__cart_storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('[CartStorage] localStorage not available:', error.message);
            return false;
        }
    }

    /**
     * Save data to localStorage
     * @param {Object} data - Data to save
     * @returns {Promise<boolean>}
     */
    async save(data) {
        if (!this.isAvailable) {
            console.warn('[CartStorage] Storage not available, skipping save');
            return false;
        }

        try {
            // Prepare data for storage
            const storageData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                config: this.config,
                data: data
            };

            // Serialize data
            let serializedData = JSON.stringify(storageData);

            // Check size limits
            if (serializedData.length > this.maxStorageSize) {
                console.warn('[CartStorage] Data exceeds size limit, attempting compression');

                if (this.enableCompression) {
                    serializedData = await this._compressData(serializedData);
                } else {
                    throw new Error(`Data size (${serializedData.length}) exceeds limit (${this.maxStorageSize})`);
                }
            }

            // Save to localStorage
            localStorage.setItem(this.storageKey, serializedData);

            if (this.config.debug) {
                console.log('[CartStorage] Data saved:', {
                    key: this.storageKey,
                    size: serializedData.length,
                    items: Object.keys(data.items || {}).length
                });
            }

            return true;

        } catch (error) {
            console.error('[CartStorage] Failed to save data:', error);

            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                await this._handleQuotaExceeded();
            }

            return false;
        }
    }

    /**
     * Load data from localStorage
     * @returns {Promise<Object|null>}
     */
    async load() {
        if (!this.isAvailable) {
            return null;
        }

        try {
            const rawData = localStorage.getItem(this.storageKey);

            if (!rawData) {
                if (this.config.debug) {
                    console.log('[CartStorage] No data found for key:', this.storageKey);
                }
                return null;
            }

            // Decompress if needed
            let decompressedData = rawData;
            if (this.enableCompression && this._isCompressedData(rawData)) {
                decompressedData = await this._decompressData(rawData);
            }

            // Parse data
            const parsedData = JSON.parse(decompressedData);

            // Validate data structure
            if (!this._validateStorageData(parsedData)) {
                console.warn('[CartStorage] Invalid data structure, clearing storage');
                await this.clear();
                return null;
            }

            // Check version compatibility
            if (parsedData.version !== '1.0') {
                console.warn('[CartStorage] Version mismatch, migrating data');
                return await this._migrateData(parsedData);
            }

            if (this.config.debug) {
                console.log('[CartStorage] Data loaded:', {
                    key: this.storageKey,
                    timestamp: parsedData.timestamp,
                    items: Object.keys(parsedData.data.items || {}).length
                });
            }

            return parsedData.data;

        } catch (error) {
            console.error('[CartStorage] Failed to load data:', error);
            return null;
        }
    }

    /**
     * Clear data from localStorage
     * @returns {Promise<boolean>}
     */
    async clear() {
        if (!this.isAvailable) {
            return false;
        }

        try {
            localStorage.removeItem(this.storageKey);

            if (this.config.debug) {
                console.log('[CartStorage] Data cleared for key:', this.storageKey);
            }

            return true;

        } catch (error) {
            console.error('[CartStorage] Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Get storage information
     * @returns {Object}
     */
    getStorageInfo() {
        if (!this.isAvailable) {
            return {
                available: false,
                error: 'localStorage not supported'
            };
        }

        try {
            const data = localStorage.getItem(this.storageKey);
            const usedStorage = this._calculateStorageUsage();

            return {
                available: true,
                key: this.storageKey,
                hasData: !!data,
                dataSize: data ? data.length : 0,
                usedStorage: usedStorage,
                maxSize: this.maxStorageSize,
                compression: this.enableCompression
            };

        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }

    /**
     * Validate storage data structure
     * @param {Object} data - Data to validate
     * @returns {boolean}
     * @private
     */
    _validateStorageData(data) {
        return data &&
               typeof data === 'object' &&
               data.version &&
               data.timestamp &&
               data.data &&
               typeof data.data === 'object';
    }

    /**
     * Handle localStorage quota exceeded
     * @private
     */
    async _handleQuotaExceeded() {
        console.warn('[CartStorage] Storage quota exceeded, attempting cleanup');

        try {
            // Get all cart storage keys
            const cartKeys = this._getAllCartKeys();

            // Sort by timestamp (oldest first)
            const sortedKeys = cartKeys.sort((a, b) => {
                const dataA = JSON.parse(localStorage.getItem(a.key) || '{}');
                const dataB = JSON.parse(localStorage.getItem(b.key) || '{}');
                return new Date(dataA.timestamp || 0) - new Date(dataB.timestamp || 0);
            });

            // Remove oldest entries until we have space
            for (const keyInfo of sortedKeys) {
                if (keyInfo.key !== this.storageKey) { // Don't remove current cart
                    localStorage.removeItem(keyInfo.key);
                    console.log('[CartStorage] Removed old cart data:', keyInfo.key);

                    // Check if we have enough space now
                    try {
                        localStorage.setItem('__test_quota__', 'test');
                        localStorage.removeItem('__test_quota__');
                        break; // We have space now
                    } catch (e) {
                        continue; // Still no space, continue cleanup
                    }
                }
            }

        } catch (error) {
            console.error('[CartStorage] Failed to cleanup storage:', error);
        }
    }

    /**
     * Get all cart storage keys
     * @returns {Array}
     * @private
     */
    _getAllCartKeys() {
        const cartKeys = [];
        const prefix = 'act_rental_cart_';

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                cartKeys.push({
                    key: key,
                    size: localStorage.getItem(key).length
                });
            }
        }

        return cartKeys;
    }

    /**
     * Calculate localStorage usage
     * @returns {Object}
     * @private
     */
    _calculateStorageUsage() {
        let totalSize = 0;
        let cartSize = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            const size = key.length + value.length;

            totalSize += size;

            if (key.startsWith('act_rental_cart_')) {
                cartSize += size;
            }
        }

        return {
            total: totalSize,
            cart: cartSize,
            percentage: (totalSize / this.maxStorageSize) * 100
        };
    }

    /**
     * Compress data (simple implementation without libraries)
     * @param {string} data - Data to compress
     * @returns {Promise<string>}
     * @private
     */
    async _compressData(data) {
        // Simple implementation without external libraries
        // For future enhancement, consider using lz-string or similar
        if (this.config.debug) {
            console.log('[CartStorage] Compression disabled, returning original data');
        }
        return data;
    }

    /**
     * Decompress data (simple implementation without libraries)
     * @param {string} data - Data to decompress
     * @returns {Promise<string>}
     * @private
     */
    async _decompressData(data) {
        // Simple implementation without external libraries
        // Matches _compressData behavior for consistency
        return data;
    }

    /**
     * Check if data is compressed
     * @param {string} data - Data to check
     * @returns {boolean}
     * @private
     */
    _isCompressedData(data) {
        // Current implementation doesn't use compression
        // Always return false since _compressData returns original data
        return false;
    }

    /**
     * Migrate data from old versions
     * @param {Object} oldData - Old data to migrate
     * @returns {Promise<Object|null>}
     * @private
     */
    async _migrateData(oldData) {
        console.log('[CartStorage] Migrating data from version:', oldData.version);

        try {
            // Attempt to preserve user data during migration
            if (oldData.data && typeof oldData.data === 'object') {
                // If the data structure is similar, try to preserve it
                const preservedData = {
                    items: oldData.data.items || {},
                    metadata: oldData.data.metadata || {},
                    // Preserve any other recognizable data
                    ...oldData.data
                };

                if (this.config.debug) {
                    console.log('[CartStorage] Preserved data during migration:', {
                        itemCount: Object.keys(preservedData.items).length,
                        fromVersion: oldData.version,
                        toVersion: '1.0'
                    });
                }

                return preservedData;
            }

            // If data structure is unrecognizable, clear for safety
            console.warn('[CartStorage] Cannot migrate unrecognized data structure, clearing');
            await this.clear();
            return null;

        } catch (error) {
            console.error('[CartStorage] Migration failed, clearing data:', error);
            await this.clear();
            return null;
        }
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartStorage;
}
