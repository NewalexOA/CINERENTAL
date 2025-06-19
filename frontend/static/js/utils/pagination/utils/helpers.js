/**
 * Helper functions for Pagination Component
 * Utility functions for validation, formatting, and common operations
 */

import { CONSTRAINTS, ERROR_MESSAGES } from './constants.js';

/**
 * Validates pagination configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateConfig(config) {
    const errors = [];

    // Validate container
    if (!config.container) {
        errors.push(ERROR_MESSAGES.INVALID_CONTAINER);
    } else if (typeof config.container === 'string') {
        const element = document.querySelector(config.container);
        if (!element) {
            errors.push(`Container element "${config.container}" not found`);
        }
    } else if (!(config.container instanceof Element)) {
        errors.push(ERROR_MESSAGES.INVALID_CONTAINER);
    }

    // Validate page size
    if (config.options?.pageSize) {
        const pageSize = config.options.pageSize;
        if (!Number.isInteger(pageSize) || pageSize < CONSTRAINTS.MIN_PAGE_SIZE || pageSize > CONSTRAINTS.MAX_PAGE_SIZE) {
            errors.push(ERROR_MESSAGES.INVALID_PAGE_SIZE);
        }
    }

    // Validate callback (not required for slave instances)
    const isSlave = config.role === 'slave';
    if (!isSlave && (!config.callbacks?.onDataLoad || typeof config.callbacks.onDataLoad !== 'function')) {
        errors.push(ERROR_MESSAGES.MISSING_CALLBACK);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates page number
 * @param {number} page - Page number to validate
 * @param {number} totalPages - Total number of pages
 * @returns {boolean} True if page is valid
 */
export function validatePage(page, totalPages = CONSTRAINTS.MAX_PAGES) {
    return Number.isInteger(page) && page >= CONSTRAINTS.MIN_PAGE && page <= totalPages;
}

/**
 * Validates page size
 * @param {number} size - Page size to validate
 * @returns {boolean} True if page size is valid
 */
export function validatePageSize(size) {
    return Number.isInteger(size) && size >= CONSTRAINTS.MIN_PAGE_SIZE && size <= CONSTRAINTS.MAX_PAGE_SIZE;
}

/**
 * Formats number with locale-specific formatting
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    return new Intl.NumberFormat('ru-RU').format(num);
}

/**
 * Calculates pagination info for display
 * @param {number} currentPage - Current page number (1-based)
 * @param {number} pageSize - Number of items per page
 * @param {number} totalItems - Total number of items
 * @returns {Object} Pagination info object
 */
export function calculatePaginationInfo(currentPage, pageSize, totalItems) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startItem = totalItems > 0 ? ((currentPage - 1) * pageSize) + 1 : 0;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return {
        currentPage: Math.max(1, Math.min(currentPage, totalPages)),
        totalPages,
        totalItems,
        pageSize,
        startItem,
        endItem,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
    };
}

/**
 * Debounces function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Deep merges configuration objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
export function mergeConfig(target, source) {
    const result = { ...target };

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                result[key] = mergeConfig(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
    }

    return result;
}

/**
 * Gets DOM element from selector or element
 * @param {string|Element} selector - CSS selector or DOM element
 * @returns {Element|null} DOM element or null
 */
export function getElement(selector) {
    if (typeof selector === 'string') {
        return document.querySelector(selector);
    } else if (selector instanceof Element) {
        return selector;
    }
    return null;
}

/**
 * Generates unique ID for pagination instances
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'pagination') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safely gets value from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Stored value or default
 */
export function getStorageValue(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value !== null ? JSON.parse(value) : defaultValue;
    } catch (error) {
        console.warn(`Error reading from localStorage: ${error.message}`);
        return defaultValue;
    }
}

/**
 * Safely sets value to localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {boolean} True if successful
 */
export function setStorageValue(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`Error writing to localStorage: ${error.message}`);
        return false;
    }
}

/**
 * Creates DOM element from HTML string
 * @param {string} html - HTML string
 * @returns {Element} Created DOM element
 */
export function createElementFromHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

/**
 * Safely executes callback function
 * @param {Function} callback - Callback function
 * @param {...*} args - Arguments to pass to callback
 * @returns {*} Callback result or null
 */
export function safeCallback(callback, ...args) {
    try {
        if (typeof callback === 'function') {
            return callback(...args);
        }
    } catch (error) {
        console.error('Error executing callback:', error);
    }
    return null;
}
