/**
 * Universal Cart Module Index
 * Loads all Universal Cart modules in correct order
 *
 * @author ACT-Rental Team
 * @created 2025-12-21
 */

(function() {
    'use strict';

    // Module loading configuration
    const UNIVERSAL_CART_CONFIG = {
        baseUrl: '/static/js/universal-cart/',
        modules: [
            // Core modules first
            'core/universal-cart.js',
            'core/cart-storage.js',

            // UI modules
            'ui/cart-templates.js',
            'ui/cart-renderer.js',
            'ui/cart-dialogs.js',

            // Handlers
            'handlers/cart-event-handler.js',

            // Configuration and integration
            'config/cart-configs.js',
            'integration/cart-integration.js',

            // Main UI coordinator (last)
            'cart-ui.js'
        ],
        debug: false
    };

    /**
     * Load script dynamically
     * @param {string} src - Script source URL
     * @returns {Promise}
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load: ${src}`));
            document.head.appendChild(script);
        });
    }

    /**
     * Load all Universal Cart modules
     * @returns {Promise}
     */
    async function loadUniversalCart() {
        try {
            if (UNIVERSAL_CART_CONFIG.debug) {
                console.log('[UniversalCart] Loading modules...');
            }

            // Load modules sequentially to ensure dependencies
            for (const module of UNIVERSAL_CART_CONFIG.modules) {
                const src = UNIVERSAL_CART_CONFIG.baseUrl + module;
                await loadScript(src);

                if (UNIVERSAL_CART_CONFIG.debug) {
                    console.log(`[UniversalCart] Loaded: ${module}`);
                }
            }

            if (UNIVERSAL_CART_CONFIG.debug) {
                console.log('[UniversalCart] All modules loaded successfully');
            }

            // Trigger ready event
            document.dispatchEvent(new CustomEvent('universalCartReady', {
                detail: {
                    modules: UNIVERSAL_CART_CONFIG.modules,
                    baseUrl: UNIVERSAL_CART_CONFIG.baseUrl
                }
            }));

        } catch (error) {
            console.error('[UniversalCart] Failed to load modules:', error);
            throw error;
        }
    }

    /**
     * Initialize Universal Cart when DOM is ready
     */
    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadUniversalCart);
        } else {
            loadUniversalCart();
        }
    }

    // Auto-initialize if not already loaded
    if (!window.UniversalCartLoader) {
        window.UniversalCartLoader = {
            load: loadUniversalCart,
            config: UNIVERSAL_CART_CONFIG,
            isLoaded: false
        };

        initialize();
    }

})();
