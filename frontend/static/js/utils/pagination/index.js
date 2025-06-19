/**
 * Pagination Component Module
 * Universal pagination component with themes, synchronization, and self-rendering
 *
 * @example Basic usage:
 * ```javascript
 * import { Pagination } from './utils/pagination/index.js';
 *
 * const pagination = new Pagination({
 *     container: '#pagination-container',
 *     theme: 'full',
 *     callbacks: {
 *         onDataLoad: async (page, pageSize) => {
 *             const response = await fetch(`/api/data?page=${page}&size=${pageSize}`);
 *             const data = await response.json();
 *             return { totalItems: data.total };
 *         }
 *     }
 * });
 * ```
 *
 * @example Synchronized pagination:
 * ```javascript
 * // Master instance (controls data)
 * const mainPagination = new Pagination({
 *     container: '#main-pagination',
 *     theme: 'full',
 *     groupId: 'equipment-list',
 *     role: 'master',
 *     callbacks: { onDataLoad: loadEquipmentData }
 * });
 *
 * // Slave instance (synced UI only)
 * const topPagination = new Pagination({
 *     container: '#top-pagination',
 *     theme: 'compact',
 *     groupId: 'equipment-list',
 *     role: 'slave'
 * });
 * ```
 */

// Core exports
export { Pagination } from './core/pagination-core.js';
export { PaginationState } from './core/pagination-state.js';

// Rendering exports
export { PaginationRenderer } from './rendering/renderer.js';
export { TemplateEngine, globalTemplateEngine } from './rendering/templates.js';

// Theme exports
export { FullTheme } from './themes/full-theme.js';
export { CompactTheme } from './themes/compact-theme.js';
export { MinimalTheme } from './themes/minimal-theme.js';

// Synchronization exports
export { EventEmitter } from './sync/event-emitter.js';
export { GroupManager, globalGroupManager } from './sync/group-manager.js';

// Utility exports
export * from './utils/constants.js';
export * from './utils/helpers.js';

/**
 * Creates a new pagination instance with simplified API
 * @param {string} containerId - Container ID for pagination
 * @param {Object} config - Pagination configuration
 * @returns {Pagination} New pagination instance
 */
export async function createPagination(containerId, config) {
    // Import Pagination class to avoid circular dependency issues
    const { Pagination } = await import('./core/pagination-core.js');

    return new Pagination({
        container: `#${containerId}`,
        ...config
    });
}

/**
 * Creates multiple synchronized pagination instances
 * @param {Array} configs - Array of pagination configurations
 * @param {string} groupId - Group identifier for synchronization
 * @returns {Array} Array of pagination instances
 */
export async function createSynchronizedPagination(configs, groupId) {
    if (!Array.isArray(configs) || configs.length === 0) {
        throw new Error('Configs must be a non-empty array');
    }

    // Import Pagination class to avoid circular dependency issues
    const { Pagination } = await import('./core/pagination-core.js');

    const instances = [];

    configs.forEach((config, index) => {
        const enhancedConfig = {
            ...config,
            groupId,
            role: index === 0 ? 'master' : 'slave' // First instance is master
        };

        instances.push(new Pagination(enhancedConfig));
    });

    return instances;
}

/**
 * Utility function to migrate from old pagination format
 * @param {Object} oldConfig - Legacy pagination configuration
 * @returns {Object} New configuration format
 */
export function migrateLegacyConfig(oldConfig) {
    const {
        containerId,
        containerEl,
        pageSize = 20,
        pageSizes = [20, 50, 100],
        onPageChange,
        onPageSizeChange,
        loadData,
        showPageInfo = true,
        showPageSizeSelect = true,
        theme = 'full',
        ...otherOptions
    } = oldConfig;

    return {
        container: containerEl || containerId,
        theme,
        options: {
            pageSize,
            pageSizes,
            showPageInfo,
            showPageSizeSelect,
            ...otherOptions
        },
        callbacks: {
            onDataLoad: loadData,
            onPageChange,
            onPageSizeChange
        }
    };
}

/**
 * Pre-configured pagination for common use cases
 */
export const PaginationPresets = {
    /**
     * Full-featured pagination for main content areas
     * @param {string|Element} container - Container selector or element
     * @param {Function} dataLoader - Data loading function
     * @param {Object} options - Additional options
     * @returns {Pagination} Configured pagination instance
     */
    async main(container, dataLoader, options = {}) {
        // Import Pagination class to avoid circular dependency issues
        const { Pagination } = await import('./core/pagination-core.js');

        return new Pagination({
            container,
            theme: 'full',
            options: {
                pageSize: 20,
                pageSizes: [20, 50, 100],
                showPageInfo: true,
                showPageSizeSelect: true,
                persistPageSize: true,
                ...options
            },
            callbacks: {
                onDataLoad: dataLoader
            }
        });
    },

    /**
     * Compact pagination for secondary areas
     * @param {string|Element} container - Container selector or element
     * @param {string} groupId - Group ID for synchronization
     * @param {Object} options - Additional options
     * @returns {Pagination} Configured pagination instance
     */
    async secondary(container, groupId, options = {}) {
        // Import Pagination class to avoid circular dependency issues
        const { Pagination } = await import('./core/pagination-core.js');

        return new Pagination({
            container,
            theme: 'compact',
            groupId,
            role: 'slave',
            options: {
                showPageInfo: true,
                showPageSizeSelect: false,
                showNavigation: true,
                ...options
            }
        });
    },

    /**
     * Minimal pagination for inline use
     * @param {string|Element} container - Container selector or element
     * @param {string} groupId - Group ID for synchronization
     * @param {Object} options - Additional options
     * @returns {Pagination} Configured pagination instance
     */
    async minimal(container, groupId, options = {}) {
        // Import Pagination class to avoid circular dependency issues
        const { Pagination } = await import('./core/pagination-core.js');

        return new Pagination({
            container,
            theme: 'minimal',
            groupId,
            role: 'slave',
            options: {
                showPageInfo: false,
                showPageSizeSelect: false,
                showNavigation: true,
                ...options
            }
        });
    },

    /**
     * Complete pagination setup for projects/equipment lists
     * @param {Object} containers - Object with container selectors
     * @param {Function} dataLoader - Data loading function
     * @param {string} groupId - Group identifier
     * @returns {Object} Object with pagination instances
     */
    async listView(containers, dataLoader, groupId) {
        const {
            main,
            top = null,
            bottom = null,
            sidebar = null
        } = containers;

        const instances = {};

        // Main pagination (master)
        instances.main = await PaginationPresets.main(main, dataLoader, {
            groupId,
            role: 'master'
        });

        // Top pagination (slave)
        if (top) {
            instances.top = await PaginationPresets.secondary(top, groupId);
        }

        // Bottom pagination (slave)
        if (bottom) {
            instances.bottom = await PaginationPresets.secondary(bottom, groupId);
        }

        // Sidebar pagination (minimal)
        if (sidebar) {
            instances.sidebar = await PaginationPresets.minimal(sidebar, groupId);
        }

        return instances;
    }
};

/**
 * Global pagination utilities
 */
export const PaginationUtils = {
    /**
     * Destroys all pagination instances in a group
     * @param {string} groupId - Group identifier
     */
    destroyGroup(groupId) {
        const groupInfo = globalGroupManager.getGroupInfo(groupId);
        if (groupInfo) {
            // Force cleanup of the group
            globalGroupManager.groups.delete(groupId);
        }
    },

    /**
     * Gets statistics for all active pagination instances
     * @returns {Object} Statistics object
     */
    async getGlobalStats() {
        // Import here to avoid circular dependency
        const { globalTemplateEngine } = await import('./rendering/templates.js');

        return {
            activeGroups: globalGroupManager.listGroups().length,
            totalThemes: globalTemplateEngine.listThemes().length,
            injectedStyles: globalTemplateEngine.stylesInjected.size
        };
    },

    /**
     * Preloads all theme styles for better performance
     */
    async preloadStyles() {
        // Import here to avoid circular dependency
        const { globalTemplateEngine } = await import('./rendering/templates.js');
        globalTemplateEngine.preloadAllStyles();
    },

    /**
     * Cleans up all global resources
     */
    async cleanup() {
        globalGroupManager.destroy();
        // Import here to avoid circular dependency
        const { globalTemplateEngine } = await import('./rendering/templates.js');
        globalTemplateEngine.cleanup();
    }
};

// Auto-preload styles when module is imported
if (typeof window !== 'undefined' && window.document) {
    // Preload styles with a slight delay to avoid blocking
    setTimeout(async () => {
        await PaginationUtils.preloadStyles();
    }, 100);
}
