/**
 * Type definitions for Pagination Component
 * Provides JSDoc type definitions for better IDE support
 */

/**
 * @typedef {Object} PaginationState
 * @property {number} currentPage - Current page number (1-based)
 * @property {number} pageSize - Number of items per page
 * @property {number} totalItems - Total number of items
 * @property {number} totalPages - Total number of pages
 * @property {number} startItem - First item number on current page
 * @property {number} endItem - Last item number on current page
 * @property {boolean} hasNext - Whether there is a next page
 * @property {boolean} hasPrev - Whether there is a previous page
 * @property {boolean} loading - Whether data is currently loading
 * @property {string|Error|null} error - Current error state
 * @property {boolean} isEmpty - Whether there are no items
 */

/**
 * @typedef {Object} PaginationOptions
 * @property {number} [pageSize=20] - Default page size
 * @property {number[]} [pageSizes=[20, 50, 100]] - Available page sizes
 * @property {boolean} [showPageInfo=true] - Show page information
 * @property {boolean} [showPageSizeSelect=true] - Show page size selector
 * @property {boolean} [showNavigation=true] - Show navigation controls
 * @property {boolean} [persistPageSize=false] - Persist page size in localStorage
 * @property {string|null} [storageKey=null] - Custom storage key
 * @property {boolean} [useUrlParams=false] - Sync with URL parameters
 * @property {boolean} [autoLoadOnInit=true] - Auto-load data on initialization
 */

/**
 * @typedef {Object} PaginationCallbacks
 * @property {function(number, number, PaginationState): Promise<{totalItems: number}>} onDataLoad - Data loading callback
 * @property {function(number): void} [onPageChange] - Page change callback
 * @property {function(number): void} [onPageSizeChange] - Page size change callback
 * @property {function(Error): void} [onError] - Error callback
 */

/**
 * @typedef {Object} PaginationConfig
 * @property {string|Element} container - Container selector or element
 * @property {string} [theme='full'] - Theme name
 * @property {string|null} [groupId=null] - Group identifier for synchronization
 * @property {string} [role='slave'] - Role in synchronization group
 * @property {PaginationOptions} [options] - Pagination options
 * @property {PaginationCallbacks} callbacks - Event callbacks
 */

/**
 * @typedef {Object} ThemeOptions
 * @property {string} [className=''] - Additional CSS class
 * @property {string} [id=''] - Element ID
 * @property {boolean} [showPageInfo=true] - Show page information
 * @property {boolean} [showPageSizeSelect=true] - Show page size selector
 * @property {boolean} [showNavigation=true] - Show navigation controls
 * @property {number[]} [pageSizes=[20, 50, 100]] - Available page sizes
 */

/**
 * @typedef {Object} GroupInfo
 * @property {string} id - Group identifier
 * @property {number} masterCount - Number of master instances
 * @property {number} slaveCount - Number of slave instances
 * @property {number} totalCount - Total number of instances
 * @property {PaginationState} state - Current group state
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string[]} errors - Array of validation errors
 */

/**
 * @typedef {Object} ThemeInterface
 * @property {string} name - Theme name
 * @property {string} description - Theme description
 * @property {function(PaginationState, ThemeOptions): string} render - Render function
 * @property {function(): string} [getStyles] - Styles function
 */

/**
 * @typedef {Object} EventData
 * @property {string} type - Event type
 * @property {*} data - Event data
 * @property {Object} source - Source instance
 */

/**
 * @typedef {Object} DataLoadResult
 * @property {number} totalItems - Total number of items
 * @property {*} [data] - Optional data payload
 * @property {Object} [meta] - Optional metadata
 */

/**
 * @typedef {Object} PaginationPresetOptions
 * @property {string} main - Main container selector
 * @property {string} [top] - Top container selector
 * @property {string} [bottom] - Bottom container selector
 * @property {string} [sidebar] - Sidebar container selector
 */

/**
 * @typedef {Object} PaginationInstances
 * @property {Pagination} main - Main pagination instance
 * @property {Pagination} [top] - Top pagination instance
 * @property {Pagination} [bottom] - Bottom pagination instance
 * @property {Pagination} [sidebar] - Sidebar pagination instance
 */

/**
 * @typedef {Object} GlobalStats
 * @property {number} activeGroups - Number of active groups
 * @property {number} totalThemes - Number of registered themes
 * @property {number} injectedStyles - Number of injected style sheets
 */

// Export type definitions for external use
export const PaginationTypes = {
    /**
     * @type {PaginationState}
     */
    State: {},

    /**
     * @type {PaginationOptions}
     */
    Options: {},

    /**
     * @type {PaginationCallbacks}
     */
    Callbacks: {},

    /**
     * @type {PaginationConfig}
     */
    Config: {},

    /**
     * @type {ThemeOptions}
     */
    ThemeOptions: {},

    /**
     * @type {GroupInfo}
     */
    GroupInfo: {},

    /**
     * @type {ValidationResult}
     */
    ValidationResult: {},

    /**
     * @type {ThemeInterface}
     */
    ThemeInterface: {},

    /**
     * @type {DataLoadResult}
     */
    DataLoadResult: {},

    /**
     * @type {GlobalStats}
     */
    GlobalStats: {}
};
