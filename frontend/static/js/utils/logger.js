/**
 * Global logging configuration utility
 * Centralized control over console logging across the application
 */

// Global logging configuration
const GLOBAL_LOG_CONFIG = {
    // Development mode - enable all logs
    development: false,

    // Individual component controls
    api: {
        enabled: false,
        requests: false,
        responses: false,
        headers: false,
        timing: true // Keep timing for performance monitoring
    },

    pagination: {
        enabled: false,
        events: false,
        dataLoad: false,
        stateChanges: false
    },

    filters: {
        enabled: false,
        init: false,
        dataLoad: false
    },

    ui: {
        enabled: false,
        interactions: false,
        updates: false
    }
};

/**
 * Enable development mode - turns on all logging
 */
export function enableDevelopmentLogging() {
    GLOBAL_LOG_CONFIG.development = true;

    // Enable all component logging
    Object.keys(GLOBAL_LOG_CONFIG).forEach(component => {
        if (typeof GLOBAL_LOG_CONFIG[component] === 'object') {
            Object.keys(GLOBAL_LOG_CONFIG[component]).forEach(key => {
                GLOBAL_LOG_CONFIG[component][key] = true;
            });
        }
    });

    console.log('Development logging enabled for all components');
}

/**
 * Disable all logging except errors
 */
export function disableAllLogging() {
    GLOBAL_LOG_CONFIG.development = false;

    // Disable all component logging
    Object.keys(GLOBAL_LOG_CONFIG).forEach(component => {
        if (typeof GLOBAL_LOG_CONFIG[component] === 'object') {
            Object.keys(GLOBAL_LOG_CONFIG[component]).forEach(key => {
                if (key !== 'timing') { // Keep timing for performance
                    GLOBAL_LOG_CONFIG[component][key] = false;
                }
            });
        }
    });

    console.log('All logging disabled (except errors and timing)');
}

/**
 * Get logging configuration for a specific component
 * @param {string} component - Component name (api, pagination, filters, ui)
 * @returns {Object} Component logging configuration
 */
export function getLogConfig(component) {
    return GLOBAL_LOG_CONFIG.development
        ? { enabled: true, ...Object.fromEntries(Object.keys(GLOBAL_LOG_CONFIG[component] || {}).map(k => [k, true])) }
        : GLOBAL_LOG_CONFIG[component] || { enabled: false };
}

/**
 * Enable logging for specific component
 * @param {string} component - Component name
 * @param {Object} options - Specific logging options to enable
 */
export function enableComponentLogging(component, options = {}) {
    if (!GLOBAL_LOG_CONFIG[component]) {
        GLOBAL_LOG_CONFIG[component] = {};
    }

    Object.assign(GLOBAL_LOG_CONFIG[component], { enabled: true, ...options });
    console.log(`Logging enabled for ${component}:`, GLOBAL_LOG_CONFIG[component]);
}

/**
 * Development helper - add to window for console debugging
 */
if (typeof window !== 'undefined') {
    window.logger = {
        enable: enableDevelopmentLogging,
        disable: disableAllLogging,
        enableComponent: enableComponentLogging,
        getConfig: getLogConfig,
        config: GLOBAL_LOG_CONFIG
    };
}

export default GLOBAL_LOG_CONFIG;
