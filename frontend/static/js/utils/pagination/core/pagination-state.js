/**
 * Pagination State Manager
 * Manages pagination state with validation and persistence
 */

import {
    DEFAULT_OPTIONS,
    STORAGE_KEYS,
    CONSTRAINTS,
    ERROR_MESSAGES
} from '../utils/constants.js';
import {
    validatePage,
    validatePageSize,
    calculatePaginationInfo,
    getStorageValue,
    setStorageValue,
    mergeConfig
} from '../utils/helpers.js';

/**
 * Manages pagination state and configuration
 */
export class PaginationState {
    constructor(options = {}) {
        // Merge with defaults
        this.options = mergeConfig(DEFAULT_OPTIONS, options);

        // Initialize state
        this.currentPage = 1;
        this.pageSize = this.options.pageSize;
        this.totalItems = 0;
        this.totalPages = 1;
        this.loading = false;
        this.error = null;

        // Storage key for persistence
        this.storageKey = this.options.storageKey ||
                         `${STORAGE_KEYS.DEFAULT_PREFIX}${this.options.id || 'default'}`;

        // Load persisted state if enabled
        if (this.options.persistPageSize) {
            this._loadPersistedState();
        }

        // Initialize calculated state
        this._recalculateState();
    }

    /**
     * Updates total items count and recalculates pagination
     * @param {number} totalItems - Total number of items
     */
    setTotalItems(totalItems) {
        if (typeof totalItems !== 'number' || totalItems < 0) {
            throw new Error('Total items must be a non-negative number');
        }

        this.totalItems = totalItems;
        this._recalculateState();
        this._persistState();
    }

    /**
     * Changes current page
     * @param {number} page - Page number (1-based)
     * @returns {boolean} True if page was changed
     */
    setPage(page) {
        if (!validatePage(page, this.totalPages)) {
            console.warn(`Invalid page number: ${page}`);
            return false;
        }

        if (this.currentPage === page) {
            return false; // No change
        }

        this.currentPage = page;
        this._recalculateState();
        this._persistState();
        return true;
    }

    /**
     * Changes page size
     * @param {number} size - New page size
     * @returns {boolean} True if page size was changed
     */
    setPageSize(size) {
        if (!validatePageSize(size)) {
            console.warn(`Invalid page size: ${size}`);
            return false;
        }

        if (this.pageSize === size) {
            return false; // No change
        }

        // Calculate what the current page should be after size change
        // to maintain the same approximate position
        const currentFirstItem = (this.currentPage - 1) * this.pageSize + 1;
        const newPage = Math.max(1, Math.ceil(currentFirstItem / size));

        this.pageSize = size;
        this.currentPage = newPage;
        this._recalculateState();
        this._persistState();
        return true;
    }

    /**
     * Goes to next page
     * @returns {boolean} True if page was changed
     */
    nextPage() {
        return this.setPage(this.currentPage + 1);
    }

    /**
     * Goes to previous page
     * @returns {boolean} True if page was changed
     */
    prevPage() {
        return this.setPage(this.currentPage - 1);
    }

    /**
     * Sets loading state
     * @param {boolean} loading - Loading state
     */
    setLoading(loading) {
        this.loading = Boolean(loading);
    }

    /**
     * Sets error state
     * @param {string|Error|null} error - Error message or object
     */
    setError(error) {
        this.error = error;
    }

    /**
     * Clears error state
     */
    clearError() {
        this.error = null;
    }

    /**
     * Gets current pagination state
     * @returns {Object} Current state object
     */
    getState() {
        return {
            currentPage: this.currentPage,
            pageSize: this.pageSize,
            totalItems: this.totalItems,
            totalPages: this.totalPages,
            startItem: this.startItem,
            endItem: this.endItem,
            hasNext: this.hasNext,
            hasPrev: this.hasPrev,
            loading: this.loading,
            error: this.error,
            isEmpty: this.totalItems === 0
        };
    }

    /**
     * Gets pagination options
     * @returns {Object} Current options
     */
    getOptions() {
        return { ...this.options };
    }

    /**
     * Updates options and recalculates state
     * @param {Object} newOptions - New options to merge
     */
    updateOptions(newOptions) {
        this.options = mergeConfig(this.options, newOptions);
        this._recalculateState();
    }

    /**
     * Resets pagination to initial state
     */
    reset() {
        this.currentPage = 1;
        this.totalItems = 0;
        this.loading = false;
        this.error = null;
        this._recalculateState();
        this._persistState();
    }

    /**
     * Updates state from group synchronization
     * @param {Object} groupState - State from group manager
     */
    updateFromGroup(groupState) {
        let hasChanges = false;

        if (groupState.currentPage !== this.currentPage) {
            this.currentPage = groupState.currentPage;
            hasChanges = true;
        }

        if (groupState.pageSize !== this.pageSize) {
            this.pageSize = groupState.pageSize;
            hasChanges = true;
        }

        if (groupState.totalItems !== this.totalItems) {
            this.totalItems = groupState.totalItems;
            hasChanges = true;
        }

        if (hasChanges) {
            this._recalculateState();
        }
    }

    /**
     * Validates current state
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];

        if (!validatePage(this.currentPage, this.totalPages)) {
            errors.push(`Invalid current page: ${this.currentPage}`);
        }

        if (!validatePageSize(this.pageSize)) {
            errors.push(`Invalid page size: ${this.pageSize}`);
        }

        if (this.totalItems < 0) {
            errors.push(`Invalid total items: ${this.totalItems}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Recalculates derived state values
     * @private
     */
    _recalculateState() {
        const info = calculatePaginationInfo(
            this.currentPage,
            this.pageSize,
            this.totalItems
        );

        this.currentPage = info.currentPage;
        this.totalPages = info.totalPages;
        this.startItem = info.startItem;
        this.endItem = info.endItem;
        this.hasNext = info.hasNext;
        this.hasPrev = info.hasPrev;
    }

    /**
     * Loads state from localStorage
     * @private
     */
    _loadPersistedState() {
        try {
            const persistedPageSize = getStorageValue(
                `${this.storageKey}_${STORAGE_KEYS.PAGE_SIZE}`,
                this.pageSize
            );

            if (validatePageSize(persistedPageSize)) {
                this.pageSize = persistedPageSize;
            }
        } catch (error) {
            console.warn('Error loading persisted pagination state:', error);
        }
    }

    /**
     * Persists current state to localStorage
     * @private
     */
    _persistState() {
        if (!this.options.persistPageSize) return;

        try {
            setStorageValue(
                `${this.storageKey}_${STORAGE_KEYS.PAGE_SIZE}`,
                this.pageSize
            );
        } catch (error) {
            console.warn('Error persisting pagination state:', error);
        }
    }
}
