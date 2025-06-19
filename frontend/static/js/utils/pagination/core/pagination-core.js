/**
 * Core Pagination Component
 * Main pagination class that coordinates state, rendering, and synchronization
 */

import { EventEmitter } from '../sync/event-emitter.js';
import { globalGroupManager } from '../sync/group-manager.js';
import { PaginationState } from './pagination-state.js';
import { PaginationRenderer } from '../rendering/renderer.js';
import {
    DEFAULT_OPTIONS,
    THEMES,
    ROLES,
    EVENTS,
    ERROR_MESSAGES
} from '../utils/constants.js';
import {
    validateConfig,
    generateId,
    mergeConfig,
    safeCallback
} from '../utils/helpers.js';

/**
 * Main Pagination Component Class
 * Provides complete pagination functionality with state management,
 * rendering, and synchronization capabilities
 */
export class Pagination extends EventEmitter {
    constructor(config) {
        super();

        // Validate configuration
        const validation = validateConfig(config);
        if (!validation.isValid) {
            throw new Error(`Pagination configuration error: ${validation.errors.join(', ')}`);
        }

        // Initialize configuration
        this.config = mergeConfig({
            theme: THEMES.FULL,
            groupId: null,
            role: ROLES.SLAVE,
            options: DEFAULT_OPTIONS,
            callbacks: {}
        }, config);

        // Generate unique ID
        this.id = generateId('pagination');
        this.config.options.id = this.id;

        // Initialize state manager
        this.state = new PaginationState(this.config.options);

        // Initialize renderer
        this.renderer = new PaginationRenderer(this.config.container, {
            theme: this.config.theme,
            ...this.config.options
        });

        // Group management
        this.groupInfo = null;
        this.isMaster = false;

        // Internal state
        this.isInitialized = false;
        this.isDestroyed = false;

        // Initialize component
        this._initialize();
    }

    /**
     * Loads data using the configured callback
     * @param {number} page - Page to load (optional, uses current page if not specified)
     * @param {number} pageSize - Page size (optional, uses current page size if not specified)
     * @returns {Promise} Promise that resolves when data is loaded
     */
    async loadData(page = null, pageSize = null) {
        if (this.isDestroyed) {
            throw new Error('Pagination component has been destroyed');
        }

        const targetPage = page || this.state.currentPage;
        const targetPageSize = pageSize || this.state.pageSize;

        try {
            this.state.setLoading(true);
            this.state.clearError();
            this._render();

            // Call the data loading callback
            const result = await safeCallback(
                this.config.callbacks.onDataLoad,
                targetPage,
                targetPageSize,
                this.state.getState()
            );

            if (result && typeof result.totalItems === 'number') {
                this.state.setTotalItems(result.totalItems);
            }

            this.state.setLoading(false);
            this._render();

            // Emit data loaded event
            this.emit(EVENTS.DATA_LOADED, {
                page: targetPage,
                pageSize: targetPageSize,
                totalItems: this.state.totalItems,
                result
            });

            return result;

        } catch (error) {
            this.state.setLoading(false);
            this.state.setError(error);
            this._render();

            this.emit(EVENTS.ERROR_OCCURRED, error);
            throw error;
        }
    }

    /**
     * Changes current page
     * @param {number} page - New page number
     * @returns {Promise} Promise that resolves when page change is complete
     */
    async goToPage(page) {
        if (this.state.setPage(page)) {
            this._emitStateChange();
            return this.loadData();
        }
    }

    /**
     * Changes page size
     * @param {number} size - New page size
     * @returns {Promise} Promise that resolves when page size change is complete
     */
    async setPageSize(size) {
        if (this.state.setPageSize(size)) {
            this._emitStateChange();
            return this.loadData();
        }
    }

    /**
     * Goes to next page
     * @returns {Promise} Promise that resolves when navigation is complete
     */
    async nextPage() {
        return this.goToPage(this.state.currentPage + 1);
    }

    /**
     * Goes to previous page
     * @returns {Promise} Promise that resolves when navigation is complete
     */
    async prevPage() {
        return this.goToPage(this.state.currentPage - 1);
    }

    /**
     * Updates total items count
     * @param {number} totalItems - Total number of items
     */
    setTotalItems(totalItems) {
        this.state.setTotalItems(totalItems);
        this._render();
        this._emitStateChange();
    }

    /**
     * Gets current pagination state
     * @returns {Object} Current state
     */
    getState() {
        return this.state.getState();
    }

    /**
     * Gets pagination configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Changes theme
     * @param {string} themeName - New theme name
     */
    setTheme(themeName) {
        this.config.theme = themeName;
        this.renderer.setTheme(themeName);
    }

    /**
     * Updates component options
     * @param {Object} newOptions - New options to merge
     */
    updateOptions(newOptions) {
        this.config.options = mergeConfig(this.config.options, newOptions);
        this.state.updateOptions(this.config.options);
        this.renderer.updateOptions(newOptions);
        this._render();
    }

    /**
     * Resets pagination to initial state
     * @returns {Promise} Promise that resolves when reset is complete
     */
    async reset() {
        this.state.reset();
        this._render();
        this._emitStateChange();

        if (this.config.options.autoLoadOnInit) {
            return this.loadData();
        }
    }

    /**
     * Refreshes current page
     * @returns {Promise} Promise that resolves when refresh is complete
     */
    async refresh() {
        return this.loadData();
    }

    /**
     * Updates state from group synchronization
     * @param {Object} groupState - State from group manager
     */
    updateFromGroup(groupState) {
        if (this.isMaster || groupState.sourceInstance === this) {
            return; // Masters don't update from group, avoid circular updates
        }

        this.state.updateFromGroup(groupState);
        this._render();
    }

    /**
     * Joins a synchronization group
     * @param {string} groupId - Group identifier
     * @param {string} role - Role in group (master/slave)
     */
    joinGroup(groupId, role = ROLES.SLAVE) {
        if (this.groupInfo) {
            this.leaveGroup();
        }

        this.groupInfo = globalGroupManager.joinGroup(groupId, this, role);
        this.isMaster = this.groupInfo.isMaster;
        this.config.groupId = groupId;
        this.config.role = role;

        // If we're master, sync current state to group
        if (this.isMaster) {
            this._emitStateChange();
        }
    }

    /**
     * Leaves current synchronization group
     */
    leaveGroup() {
        if (this.groupInfo) {
            globalGroupManager.leaveGroup(this.config.groupId, this);
            this.groupInfo = null;
            this.isMaster = false;
            this.config.groupId = null;
        }
    }

    /**
     * Gets group information
     * @returns {Object|null} Group info or null if not in group
     */
    getGroupInfo() {
        return this.groupInfo ?
            globalGroupManager.getGroupInfo(this.config.groupId) :
            null;
    }

    /**
     * Forces synchronization of all instances in group
     */
    syncGroup() {
        if (this.config.groupId) {
            globalGroupManager.forceSyncGroup(this.config.groupId);
        }
    }

    /**
     * Destroys the pagination component
     */
    destroy() {
        if (this.isDestroyed) return;

        this.isDestroyed = true;

        // Leave group
        this.leaveGroup();

        // Clean up renderer
        this.renderer.destroy();

        // Clean up event listeners
        this.removeAllListeners();

        // Clean up group unsubscribers
        if (this._groupUnsubscribers) {
            this._groupUnsubscribers.forEach(unsubscribe => unsubscribe());
            this._groupUnsubscribers = [];
        }

        // Clear references
        this.state = null;
        this.renderer = null;
        this.config = null;
        this.groupInfo = null;
    }

    /**
     * Initializes the component
     * @private
     */
    _initialize() {
        // Set up internal event handlers
        this._setupEventHandlers();

        // Join group if specified
        if (this.config.groupId) {
            this.joinGroup(this.config.groupId, this.config.role);
        }

        // Initial render
        this._render();

        // Auto-load data if configured
        if (this.config.options.autoLoadOnInit && this.config.callbacks.onDataLoad) {
            setTimeout(() => this.loadData(), 0);
        }

        this.isInitialized = true;
    }

    /**
     * Sets up event handlers for renderer callbacks
     * @private
     */
    _setupEventHandlers() {
        const callbacks = {
            onPageChange: (page) => {
                this.goToPage(page).catch(error => {
                    console.error('Error changing page:', error);
                    safeCallback(this.config.callbacks.onError, error);
                });
            },

            onPageSizeChange: (size) => {
                this.setPageSize(size).catch(error => {
                    console.error('Error changing page size:', error);
                    safeCallback(this.config.callbacks.onError, error);
                });
            }
        };

        this.renderer.callbacks = callbacks;
    }

    /**
     * Renders the pagination UI
     * @private
     */
    _render() {
        if (!this.renderer || this.isDestroyed) return;

        try {
            const state = this.state.getState();
            this.renderer.render(state, this.renderer.callbacks);
        } catch (error) {
            console.error('Error rendering pagination:', error);
            safeCallback(this.config.callbacks.onError, error);
        }
    }

    /**
     * Emits state change event for synchronization
     * @private
     */
    _emitStateChange() {
        if (this.isDestroyed) return;

        const state = this.state.getState();

        // Emit component event
        this.emit(EVENTS.STATE_CHANGED, state);

        // Emit page change event if applicable
        this.emit(EVENTS.PAGE_CHANGED, {
            currentPage: state.currentPage,
            totalPages: state.totalPages
        });

        // Emit page size change event if applicable
        this.emit(EVENTS.PAGE_SIZE_CHANGED, {
            pageSize: state.pageSize,
            pageSizes: this.config.options.pageSizes
        });
    }
}
