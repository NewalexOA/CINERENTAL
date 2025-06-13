/**
 * Universal Pagination Component
 *
 * Reusable pagination component for handling paginated data display and navigation.
 * Designed to work with different HTML structures via configurable selectors.
 * Features page size persistence through localStorage and URL parameters.
 *
 * @author ACT-RENTAL System
 * @version 1.1.0
 */

import { getLogConfig } from './logger.js';

// Get logging configuration from global logger
const LOG_CONFIG = {
    get pagination() {
        return getLogConfig('pagination');
    }
};

/**
 * Universal Pagination Class
 *
 * Provides a reusable pagination component that can be configured for different
 * pages and data sources in the application.
 *
 * @example
 * const pagination = new Pagination({
 *   selectors: {
 *     pageStart: '#pageStart',
 *     pageEnd: '#pageEnd',
 *     totalItems: '#totalItems',
 *     currentPage: '#currentPage',
 *     totalPages: '#totalPages',
 *     prevButton: '#prevButton',
 *     nextButton: '#nextButton',
 *     pageSizeSelect: '#pageSizeSelect'
 *   },
 *   options: {
 *     pageSize: 20,
 *     pageSizes: [20, 50, 100],
 *     showPageInfo: true,
 *     showPageSizeSelect: true,
 *     persistPageSize: true,  // Enable page size persistence
 *     storageKey: 'pagination_pagesize',  // localStorage key
 *     useUrlParams: false  // Disabled by default for backward compatibility
 *   },
 *   callbacks: {
 *     onDataLoad: async (page, size) => {
 *       // Custom data loading logic
 *       return { items: [], total: 0, pages: 0, page: 1 };
 *     },
 *     onPageChange: (page) => {
 *       // Optional page change callback
 *     },
 *     onPageSizeChange: (size) => {
 *       // Optional page size change callback
 *     }
 *   }
 * });
 */
class Pagination {
    /**
     * Create a new Pagination instance
     *
     * @param {Object} config - Configuration object
     * @param {Object} config.selectors - DOM element selectors
     * @param {string} config.selectors.pageStart - Selector for start item display
     * @param {string} config.selectors.pageEnd - Selector for end item display
     * @param {string} config.selectors.totalItems - Selector for total items display
     * @param {string} config.selectors.currentPage - Selector for current page display
     * @param {string} config.selectors.totalPages - Selector for total pages display
     * @param {string} config.selectors.prevButton - Selector for previous page button
     * @param {string} config.selectors.nextButton - Selector for next page button
     * @param {string} config.selectors.pageSizeSelect - Selector for page size selector
     * @param {Object} config.options - Pagination options
     * @param {number} config.options.pageSize - Default page size
     * @param {Array} config.options.pageSizes - Available page sizes
     * @param {boolean} config.options.showPageInfo - Show page information
     * @param {boolean} config.options.showPageSizeSelect - Show page size selector
     * @param {boolean} config.options.persistPageSize - Save page size to localStorage
     * @param {string} config.options.storageKey - localStorage key for page size
     * @param {boolean} config.options.useUrlParams - Use URL parameters for state
     * @param {Object} config.callbacks - Event callbacks
     * @param {Function} config.callbacks.onDataLoad - Data loading callback
     * @param {Function} config.callbacks.onPageChange - Page change callback
     * @param {Function} config.callbacks.onPageSizeChange - Page size change callback
     */
    constructor(config) {
        // Validate required configuration
        if (!config) {
            throw new Error('Pagination: Configuration object is required');
        }

        if (!config.selectors) {
            throw new Error('Pagination: Selectors configuration is required');
        }

        if (!config.callbacks || typeof config.callbacks.onDataLoad !== 'function') {
            throw new Error('Pagination: onDataLoad callback is required');
        }

        // Store configuration
        this.selectors = this._validateSelectors(config.selectors);
        this.options = this._mergeOptions(config.options);
        this.callbacks = config.callbacks;

        // Initialize state with persistence support
        this.state = {
            currentPage: 1,
            pageSize: this._getInitialPageSize(),
            totalItems: 0,
            totalPages: 1,
            isLoading: false,
            isShowingAll: this._getInitialShowingAll()  // Track if user explicitly selected "all"
        };

        // Cache DOM elements
        this.elements = {};
        this._cacheElements();

        // Initialize component
        this._initialize();
    }

    /**
     * Get initial page size from various sources with priority order:
     * 1. URL parameter (if enabled)
     * 2. localStorage (if persistence enabled)
     * 3. Default from options
     * @private
     */
    _getInitialPageSize() {
        // Priority 1: URL parameter
        if (this.options.useUrlParams) {
            const urlParams = new URLSearchParams(window.location.search);
            const urlPageSize = urlParams.get('size');
            if (urlPageSize) {
                const parsedSize = parseInt(urlPageSize);
                if (parsedSize > 0 && this.options.pageSizes.includes(parsedSize)) {
                    return parsedSize;
                }
            }
        }

        // Priority 2: localStorage
        if (this.options.persistPageSize) {
            try {
                const stored = localStorage.getItem(this.options.storageKey);
                if (stored) {
                    const parsedSize = parseInt(stored);
                    if (parsedSize > 0 && this.options.pageSizes.includes(parsedSize)) {
                        return parsedSize;
                    } else {
                        // localStorage contains invalid size
                        console.warn('Pagination: localStorage contains invalid page size:', stored, 'Available sizes:', this.options.pageSizes);
                        localStorage.removeItem(this.options.storageKey);
                        return this.options.pageSize;
                    }
                }
            } catch (error) {
                console.warn('Pagination: Error reading from localStorage:', error);
            }
        }

        // Priority 3: Default
        return this.options.pageSize;
    }

    /**
     * Get initial isShowingAll state from various sources
     * @private
     */
    _getInitialShowingAll() {
        // Since "all" option is removed, always return false
        return false;
    }

    /**
     * Save page size to persistence storage
     * @private
     */
    _savePageSize(size, isShowingAll = false) {
        if (!this.options.persistPageSize) return;

        try {
            // Since "all" option is removed, always store numeric size
            const valueToStore = size.toString();
            localStorage.setItem(this.options.storageKey, valueToStore);

            // Optionally update URL parameter
            if (this.options.useUrlParams) {
                this._updateUrlParameter('size', valueToStore);
            }
        } catch (error) {
            console.warn('Pagination: Error saving to localStorage:', error);
        }
    }

    /**
     * Update URL parameter without page reload
     * @private
     */
    _updateUrlParameter(key, value) {
        if (!this.options.useUrlParams) return;

        try {
            const url = new URL(window.location);
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
            window.history.replaceState({}, '', url);
        } catch (error) {
            console.warn('Pagination: Error updating URL:', error);
        }
    }

    /**
     * Validate required selectors
     * @private
     */
    _validateSelectors(selectors) {
        const required = ['pageStart', 'pageEnd', 'totalItems', 'currentPage', 'totalPages', 'prevButton', 'nextButton'];
        const missing = required.filter(key => !selectors[key]);

        if (missing.length > 0) {
            throw new Error(`Pagination: Missing required selectors: ${missing.join(', ')}`);
        }

        return selectors;
    }

    /**
     * Merge user options with defaults
     * @private
     */
    _mergeOptions(userOptions = {}) {
        const defaults = {
            pageSize: 20,
            pageSizes: [20, 50, 100],
            showPageInfo: true,
            showPageSizeSelect: true,
            autoLoadOnInit: true,
            persistPageSize: true,  // Enable by default
            storageKey: 'pagination_pagesize',  // Default storage key
            useUrlParams: false  // Disabled by default for backward compatibility
        };

        return { ...defaults, ...userOptions };
    }

    /**
     * Cache DOM elements for performance
     * @private
     */
    _cacheElements() {
        const elements = {};

        Object.entries(this.selectors).forEach(([key, selector]) => {
            const element = document.querySelector(selector);
            if (element) {
                elements[key] = element;
            } else {
                console.warn(`Pagination: Element not found for selector: ${selector} (${key})`);
            }
        });

        this.elements = elements;
    }

    /**
     * Initialize pagination component
     * @private
     */
    _initialize() {
        this._setupEventListeners();

        if (this.options.autoLoadOnInit) {
            this.loadData();
        }
    }

    /**
     * Setup event listeners for pagination controls
     * @private
     */
    _setupEventListeners() {
        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logEvents) {
            console.log('PAGINATION: Setting up event listeners...');
        }

        // Previous page button
        if (this.elements.prevButton) {
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logEvents) {
                console.log('PAGINATION: Adding click listener to prevButton');
            }
            this.elements.prevButton.addEventListener('click', (e) => {
                if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logEvents) {
                    console.log('=== PAGINATION: Previous button clicked! ===');
                    console.log('PAGINATION: Current state:', this.state);
                    console.log('PAGINATION: Button disabled:', this.elements.prevButton.disabled);
                }
                e.preventDefault();
                this.previousPage();
            });
        } else {
            console.warn('PAGINATION: prevButton element not found');
        }

        // Next page button
        if (this.elements.nextButton) {
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logEvents) {
                console.log('PAGINATION: Adding click listener to nextButton');
            }
            this.elements.nextButton.addEventListener('click', (e) => {
                if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logEvents) {
                    console.log('=== PAGINATION: Next button clicked! ===');
                    console.log('PAGINATION: Current state:', this.state);
                    console.log('PAGINATION: Button disabled:', this.elements.nextButton.disabled);
                }
                e.preventDefault();
                this.nextPage();
            });
        } else {
            console.warn('PAGINATION: nextButton element not found');
        }

        // Page size selector
        if (this.elements.pageSizeSelect && this.options.showPageSizeSelect) {
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logEvents) {
                console.log('PAGINATION: Adding change listener to pageSizeSelect');
            }
            this.elements.pageSizeSelect.addEventListener('change', (e) => {
                if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logEvents) {
                    console.log('PAGINATION: Page size changed to:', e.target.value);
                }
                this.changePageSize(e.target.value);
            });
        } else {
            console.warn('PAGINATION: pageSizeSelect element not found or disabled');
        }

        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logEvents) {
            console.log('PAGINATION: Event listeners setup complete');
        }
    }

    /**
     * Load data for current page
     * @public
     */
    async loadData() {
        if (this.state.isLoading) {
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logDataLoad) {
                console.log('PAGINATION: Already loading, skipping...');
            }
            return;
        }

        try {
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logDataLoad) {
                console.log('PAGINATION: Starting data load...');
            }
            this.state.isLoading = true;
            this._showLoadingState();

            // Make the data request with current pageSize
            const result = await this.callbacks.onDataLoad(
                this.state.currentPage,
                this.state.pageSize
            );

            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logDataLoad) {
                console.log('PAGINATION: Data loaded successfully:', result);
            }
            this._updateState(result);

            // IMPORTANT: Reset loading state BEFORE updating UI
            this.state.isLoading = false;
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logDataLoad) {
                console.log('PAGINATION: Loading state reset to false');
            }

            this._updateUI();
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logDataLoad) {
                console.log('PAGINATION: UI updated');
            }

        } catch (error) {
            console.error('Pagination: Error loading data:', error);
            this.state.isLoading = false; // Reset loading state on error too
            this._showErrorState();
        }
    }

    /**
     * Go to specific page
     * @param {number} page - Page number to navigate to
     * @public
     */
    async goToPage(page) {
        const targetPage = Math.max(1, Math.min(page, this.state.totalPages));

        if (targetPage !== this.state.currentPage) {
            this.state.currentPage = targetPage;

            if (this.callbacks.onPageChange) {
                this.callbacks.onPageChange(targetPage);
            }

            await this.loadData();
        }
    }

    /**
     * Go to previous page
     * @public
     */
    async previousPage() {
        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logEvents) {
            console.log('PAGINATION: previousPage() called, current page:', this.state.currentPage);
        }
        await this.goToPage(this.state.currentPage - 1);
    }

    /**
     * Go to next page
     * @public
     */
    async nextPage() {
        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logEvents) {
            console.log('PAGINATION: nextPage() called, current page:', this.state.currentPage);
        }
        await this.goToPage(this.state.currentPage + 1);
    }

    /**
     * Change page size
     * @param {number|string} size - New page size
     * @public
     */
    async changePageSize(size) {
        const newSize = parseInt(size);

        // Validate that the new size is supported
        if (!this.options.pageSizes.includes(newSize)) {
            console.warn('Pagination: Invalid page size:', size, 'Available sizes:', this.options.pageSizes);
            return;
        }

        if (newSize !== this.state.pageSize) {
            this.state.pageSize = newSize;
            this.state.isShowingAll = false; // Always false since "all" is removed
            this.state.currentPage = 1; // Reset to first page

            // Save page size to persistence storage
            this._savePageSize(newSize, false);

            if (this.callbacks.onPageSizeChange) {
                this.callbacks.onPageSizeChange(newSize);
            }

            await this.loadData();
        }
    }

    /**
     * Update internal state with new data
     * @private
     */
    _updateState(result) {
        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.stateChanges) {
            console.log('PAGINATION: _updateState called:', {
                inputResult: result,
                previousState: { ...this.state }
            });
        }

        if (result && typeof result === 'object') {
            this.state.totalItems = result.total || 0;
            this.state.totalPages = result.pages || 1;
            this.state.currentPage = result.page || 1;

            // Ensure current page is within valid range
            this.state.currentPage = Math.max(1, Math.min(this.state.currentPage, this.state.totalPages));

            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.stateChanges) {
                console.log('PAGINATION: State updated:', {
                    updatedState: { ...this.state },
                    calculation: {
                        'result.total': result.total,
                        'result.pages': result.pages,
                        'result.page': result.page,
                        'final totalItems': this.state.totalItems,
                        'final totalPages': this.state.totalPages,
                        'final currentPage': this.state.currentPage
                    }
                });
            }
        } else {
            console.warn('PAGINATION: Invalid result object:', result);
        }
    }

    /**
     * Update UI elements with current state
     * @private
     */
    _updateUI() {
        this._updatePageInfo();
        this._updateNavigationButtons();
        this._updatePageSizeSelector();

        // Update all secondary paginations
        if (this.secondaryElements) {
            this.secondaryElements.forEach(elements => {
                this._updateSecondaryUI(elements);
            });
        }
    }

    /**
     * Update page information display
     * @private
     */
    _updatePageInfo() {
        if (!this.options.showPageInfo) return;

        const startItem = this.state.totalItems > 0 ?
            (this.state.currentPage - 1) * this.state.pageSize + 1 : 0;
        const endItem = Math.min(this.state.currentPage * this.state.pageSize, this.state.totalItems);

        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.stateChanges) {
            console.log('PAGINATION: _updatePageInfo called:', {
                state: {
                    totalItems: this.state.totalItems,
                    currentPage: this.state.currentPage,
                    totalPages: this.state.totalPages,
                    pageSize: this.state.pageSize
                },
                calculated: { startItem, endItem }
            });
        }

        // Update page info elements
        if (this.elements.pageStart) {
            this.elements.pageStart.textContent = startItem;
        }

        if (this.elements.pageEnd) {
            this.elements.pageEnd.textContent = endItem;
        }

        if (this.elements.totalItems) {
            this.elements.totalItems.textContent = this.state.totalItems;
        }

        if (this.elements.currentPage) {
            this.elements.currentPage.textContent = this.state.currentPage;
        }

        if (this.elements.totalPages) {
            this.elements.totalPages.textContent = this.state.totalPages;
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.stateChanges) {
                console.log('PAGINATION: Updated totalPages DOM to:', this.state.totalPages);
            }
        }
    }

    /**
     * Update navigation button states
     * @private
     */
    _updateNavigationButtons() {
        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
            console.log('PAGINATION: Updating navigation buttons, state:', {
                currentPage: this.state.currentPage,
                totalPages: this.state.totalPages,
                isLoading: this.state.isLoading
            });
        }

        // Update previous button
        if (this.elements.prevButton) {
            const shouldDisablePrev = this.state.currentPage <= 1 || this.state.isLoading;
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                console.log('PAGINATION: Setting prevButton disabled:', shouldDisablePrev);
                console.log('PAGINATION: prevButton element type:', this.elements.prevButton.tagName);
            }

            // Handle both <button> elements and Bootstrap pagination <a> elements
            if (this.elements.prevButton.tagName === 'BUTTON') {
                this.elements.prevButton.disabled = shouldDisablePrev;
                if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                    console.log('PAGINATION: Updated BUTTON prevButton.disabled to:', shouldDisablePrev);
                }
            } else if (this.elements.prevButton.tagName === 'A') {
                // For Bootstrap pagination <a> inside <li>
                const parentLi = this.elements.prevButton.parentElement;
                if (parentLi && parentLi.tagName === 'LI') {
                    if (shouldDisablePrev) {
                        parentLi.classList.add('disabled');
                        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                            console.log('PAGINATION: Added disabled class to prevButton parent LI');
                        }
                    } else {
                        parentLi.classList.remove('disabled');
                        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                            console.log('PAGINATION: Removed disabled class from prevButton parent LI');
                        }
                    }
                }
            }
        }

        // Update next button
        if (this.elements.nextButton) {
            const shouldDisableNext = this.state.currentPage >= this.state.totalPages || this.state.isLoading;
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                console.log('PAGINATION: Setting nextButton disabled:', shouldDisableNext);
                console.log('PAGINATION: nextButton element type:', this.elements.nextButton.tagName);
            }

            // Handle both <button> elements and Bootstrap pagination <a> elements
            if (this.elements.nextButton.tagName === 'BUTTON') {
                this.elements.nextButton.disabled = shouldDisableNext;
                if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                    console.log('PAGINATION: Updated BUTTON nextButton.disabled to:', shouldDisableNext);
                }
            } else if (this.elements.nextButton.tagName === 'A') {
                // For Bootstrap pagination <a> inside <li>
                const parentLi = this.elements.nextButton.parentElement;
                if (parentLi && parentLi.tagName === 'LI') {
                    if (shouldDisableNext) {
                        parentLi.classList.add('disabled');
                        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                            console.log('PAGINATION: Added disabled class to nextButton parent LI');
                        }
                    } else {
                        parentLi.classList.remove('disabled');
                        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                            console.log('PAGINATION: Removed disabled class from nextButton parent LI');
                        }
                    }
                }
            }
        }
    }

    /**
     * Update page size selector
     * @private
     */
    _updatePageSizeSelector() {
        if (!this.elements.pageSizeSelect || !this.options.showPageSizeSelect) {
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                console.log('PAGINATION: pageSizeSelect not found or disabled');
            }
            return;
        }

        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
            console.log('PAGINATION: Updating page size selector, isLoading:', this.state.isLoading);
        }

        // Enable/disable selector based on loading state
        this.elements.pageSizeSelect.disabled = this.state.isLoading;
        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
            console.log('PAGINATION: Set pageSizeSelect.disabled to:', this.state.isLoading);
        }

        // Update selected value - always use numeric size
        const currentValue = this.state.pageSize.toString();

        if (this.elements.pageSizeSelect.value !== currentValue) {
            this.elements.pageSizeSelect.value = currentValue;
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                console.log('PAGINATION: Updated pageSizeSelect value to:', currentValue);
            }
        }
    }

    /**
     * Show loading state
     * @private
     */
    _showLoadingState() {
        if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
            console.log('PAGINATION: Showing loading state - disabling all controls');
        }

        // Disable navigation buttons during loading
        if (this.elements.prevButton) {
            this.elements.prevButton.disabled = true;
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                console.log('PAGINATION: Disabled prevButton during loading');
            }
        }

        if (this.elements.nextButton) {
            this.elements.nextButton.disabled = true;
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                console.log('PAGINATION: Disabled nextButton during loading');
            }
        }

        if (this.elements.pageSizeSelect) {
            this.elements.pageSizeSelect.disabled = true;
            if (LOG_CONFIG.pagination.enabled && LOG_CONFIG.pagination.logStateChanges) {
                console.log('PAGINATION: Disabled pageSizeSelect during loading');
            }
        }
    }

    /**
     * Show error state
     * @private
     */
    _showErrorState() {
        console.warn('Pagination: Error state - keeping previous UI state');
        this._updateUI(); // Restore previous state
    }

    /**
     * Get current pagination state
     * @returns {Object} Current state object
     * @public
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Refresh cached DOM elements
     * @public
     */
    refreshElements() {
        this._cacheElements();
    }

    /**
     * Reset pagination to first page
     * @public
     */
    async reset() {
        this.state.currentPage = 1;
        await this.loadData();
    }

    /**
     * Destroy pagination instance and clean up event listeners
     * @public
     */
    destroy() {
        // Remove event listeners
        if (this.elements.prevButton) {
            this.elements.prevButton.replaceWith(this.elements.prevButton.cloneNode(true));
        }

        if (this.elements.nextButton) {
            this.elements.nextButton.replaceWith(this.elements.nextButton.cloneNode(true));
        }

        if (this.elements.pageSizeSelect) {
            this.elements.pageSizeSelect.replaceWith(this.elements.pageSizeSelect.cloneNode(true));
        }

        // Clear references
        this.elements = {};
        this.callbacks = {};
        this.state = {};
    }

    /**
     * Add secondary pagination UI to sync with primary
     * @param {Object} secondarySelectors - DOM selectors for secondary pagination
     * @public
     */
    addSecondaryPagination(secondarySelectors) {
        if (!this.secondaryElements) {
            this.secondaryElements = [];
        }

        const secondaryElementSet = {};
        Object.entries(secondarySelectors).forEach(([key, selector]) => {
            const element = document.querySelector(selector);
            if (element) {
                secondaryElementSet[key] = element;
            } else {
                console.warn(`Pagination: Secondary element not found for selector: ${selector} (${key})`);
            }
        });

        this.secondaryElements.push(secondaryElementSet);

        // Setup event listeners for secondary pagination
        this._setupSecondaryEventListeners(secondaryElementSet);

        // Update secondary UI with current state
        this._updateSecondaryUI(secondaryElementSet);
    }

    /**
     * Setup event listeners for secondary pagination controls
     * @private
     */
    _setupSecondaryEventListeners(elements) {
        // Previous page button
        if (elements.prevButton) {
            elements.prevButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.previousPage();
            });
        }

        // Next page button
        if (elements.nextButton) {
            elements.nextButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.nextPage();
            });
        }

        // Page size selector (sync with primary)
        if (elements.pageSizeSelect && this.options.showPageSizeSelect) {
            elements.pageSizeSelect.addEventListener('change', (e) => {
                this.changePageSize(e.target.value);
            });
        }
    }

    /**
     * Update secondary pagination UI
     * @private
     */
    _updateSecondaryUI(elements) {
        this._updateSecondaryPageInfo(elements);
        this._updateSecondaryNavigationButtons(elements);
        this._updateSecondaryPageSizeSelector(elements);
    }

    /**
     * Update secondary page information display
     * @private
     */
    _updateSecondaryPageInfo(elements) {
        if (!this.options.showPageInfo) return;

        const startItem = this.state.totalItems > 0 ?
            (this.state.currentPage - 1) * this.state.pageSize + 1 : 0;
        const endItem = Math.min(this.state.currentPage * this.state.pageSize, this.state.totalItems);

        if (elements.pageStart) {
            elements.pageStart.textContent = startItem;
        }

        if (elements.pageEnd) {
            elements.pageEnd.textContent = endItem;
        }

        if (elements.totalItems) {
            elements.totalItems.textContent = this.state.totalItems;
        }

        if (elements.currentPage) {
            elements.currentPage.textContent = this.state.currentPage;
        }

        if (elements.totalPages) {
            elements.totalPages.textContent = this.state.totalPages;
        }
    }

    /**
     * Update secondary navigation button states
     * @private
     */
    _updateSecondaryNavigationButtons(elements) {
        // Update previous button
        if (elements.prevButton) {
            const shouldDisablePrev = this.state.currentPage <= 1 || this.state.isLoading;

            if (elements.prevButton.tagName === 'BUTTON') {
                elements.prevButton.disabled = shouldDisablePrev;
            } else if (elements.prevButton.tagName === 'A') {
                const parentLi = elements.prevButton.parentElement;
                if (parentLi && parentLi.tagName === 'LI') {
                    if (shouldDisablePrev) {
                        parentLi.classList.add('disabled');
                    } else {
                        parentLi.classList.remove('disabled');
                    }
                }
            }
        }

        // Update next button
        if (elements.nextButton) {
            const shouldDisableNext = this.state.currentPage >= this.state.totalPages || this.state.isLoading;

            if (elements.nextButton.tagName === 'BUTTON') {
                elements.nextButton.disabled = shouldDisableNext;
            } else if (elements.nextButton.tagName === 'A') {
                const parentLi = elements.nextButton.parentElement;
                if (parentLi && parentLi.tagName === 'LI') {
                    if (shouldDisableNext) {
                        parentLi.classList.add('disabled');
                    } else {
                        parentLi.classList.remove('disabled');
                    }
                }
            }
        }
    }

    /**
     * Update secondary page size selector
     * @private
     */
    _updateSecondaryPageSizeSelector(elements) {
        if (!elements.pageSizeSelect || !this.options.showPageSizeSelect) {
            return;
        }

        // Enable/disable selector based on loading state
        elements.pageSizeSelect.disabled = this.state.isLoading;

        // Update selected value - always use numeric size
        const currentValue = this.state.pageSize.toString();

        if (elements.pageSizeSelect.value !== currentValue) {
            elements.pageSizeSelect.value = currentValue;
        }
    }
}

/**
 * Create pagination UI HTML template
 *
 * @param {Object} config - Configuration for the UI template
 * @param {string} config.prefix - Prefix for element IDs (e.g., 'equipment', 'projects')
 * @param {Array} config.pageSizes - Available page sizes
 * @param {number} config.defaultPageSize - Default page size
 * @returns {string} HTML template string
 */
export function createPaginationHTML(config = {}) {
    const prefix = config.prefix || 'pagination';
    const pageSizes = config.pageSizes || [20, 50, 100];
    const defaultPageSize = config.defaultPageSize || 20;

    const pageSizeOptions = pageSizes.map(size => {
        const value = size;
        const text = size;
        const selected = size === defaultPageSize ? 'selected' : '';
        return `<option value="${value}" ${selected}>${text}</option>`;
    }).join('');

    return `
        <div class="enhanced-pagination mb-3">
            <div class="d-flex justify-content-between align-items-center">
                <div class="pagination-info">
                    Показано <span id="${prefix}PageStart">1</span>-<span id="${prefix}PageEnd">20</span>
                    из <span id="${prefix}TotalItems">0</span> позиций
                </div>
                <div class="pagination-controls">
                    <button class="btn btn-outline-secondary btn-sm" id="${prefix}PrevPage" disabled>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span class="mx-2">
                        <span id="${prefix}CurrentPage">1</span> из <span id="${prefix}TotalPages">1</span>
                    </span>
                    <button class="btn btn-outline-secondary btn-sm" id="${prefix}NextPage" disabled>
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            <div class="d-flex justify-content-end mt-2">
                <select class="form-select form-select-sm pagination-size-select" id="${prefix}PageSize">
                    ${pageSizeOptions}
                </select>
            </div>
        </div>
    `;
}

// Export the main class
export { Pagination };
export default Pagination;
