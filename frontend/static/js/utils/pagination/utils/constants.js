/**
 * Constants for Pagination Component
 * Provides default configurations and system constants
 */

// Default pagination options
export const DEFAULT_OPTIONS = {
    pageSize: 20,
    pageSizes: [20, 50, 100],
    showPageInfo: true,
    showPageSizeSelect: true,
    showNavigation: true,
    persistPageSize: false,
    storageKey: null,
    useUrlParams: false,
    autoLoadOnInit: true
};

// Available themes
export const THEMES = {
    FULL: 'full',
    COMPACT: 'compact',
    MINIMAL: 'minimal',
    CUSTOM: 'custom'
};

// Pagination roles for synchronization
export const ROLES = {
    MASTER: 'master',
    SLAVE: 'slave'
};

// Event types for synchronization
export const EVENTS = {
    STATE_CHANGED: 'stateChanged',
    PAGE_CHANGED: 'pageChanged',
    PAGE_SIZE_CHANGED: 'pageSizeChanged',
    DATA_LOADED: 'dataLoaded',
    ERROR_OCCURRED: 'errorOccurred'
};

// CSS classes for styling
export const CSS_CLASSES = {
    CONTAINER: 'pagination-container',
    INFO: 'pagination-info',
    NAV: 'pagination-nav',
    SIZE_SELECT: 'pagination-size',
    LOADING: 'pagination-loading',
    ERROR: 'pagination-error',
    DISABLED: 'disabled',
    ACTIVE: 'active'
};

// Data attributes for event handling
export const DATA_ATTRIBUTES = {
    ACTION: 'data-action',
    PAGE: 'data-page',
    SIZE: 'data-size'
};

// Action types for event handling
export const ACTIONS = {
    PREV: 'prev',
    NEXT: 'next',
    PAGE_SIZE: 'pagesize',
    GOTO_PAGE: 'goto'
};

// Storage keys
export const STORAGE_KEYS = {
    DEFAULT_PREFIX: 'pagination_',
    PAGE_SIZE: 'pagesize',
    CURRENT_PAGE: 'current_page'
};

// Validation constraints
export const CONSTRAINTS = {
    MIN_PAGE_SIZE: 1,
    MAX_PAGE_SIZE: 1000,
    MIN_PAGE: 1,
    MAX_PAGES: 10000
};

// Error messages
export const ERROR_MESSAGES = {
    INVALID_CONTAINER: 'Invalid container element provided',
    INVALID_THEME: 'Invalid theme specified',
    INVALID_PAGE_SIZE: 'Invalid page size specified',
    INVALID_PAGE: 'Invalid page number specified',
    MISSING_CALLBACK: 'Data load callback is required',
    SYNC_ERROR: 'Error in pagination synchronization',
    RENDER_ERROR: 'Error rendering pagination component'
};
