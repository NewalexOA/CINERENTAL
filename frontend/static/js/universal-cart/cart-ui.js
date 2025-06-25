/**
 * Universal Cart UI Module
 * Main UI coordinator class that delegates work to specialized modules
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 * @refactored 2025-12-21 - Split into modular architecture
 */

class CartUI {
    /**
     * @param {UniversalCart} cart - Cart instance
     * @param {Object} config - Configuration object
     */
    constructor(cart, config = {}) {
        this.cart = cart;
        this.config = this._mergeConfig(config);

        // UI state
        this.isVisible = false;
        this.isInitialized = false;

        // DOM elements
        this.container = null;
        this.toggleButton = null;
        this.badge = null;
        this.itemsList = null;
        this.summary = null;

        // Module instances
        this.templates = null;
        this.renderer = null;
        this.eventHandler = null;
        this.dialogs = null;

        // Initialize modules
        this._initializeModules();
    }

    /**
     * Initialize all modules
     * @private
     */
    _initializeModules() {
        // Templates module
        this.templates = new CartTemplates();

        // Dialogs module
        this.dialogs = new CartDialogs();

        // Renderer module
        this.renderer = new CartRenderer(this.cart, this.templates, this.config);

        // Event handler module
        this.eventHandler = new CartEventHandler(this.cart, this, this.renderer, this.config);
    }

    /**
     * Merge configuration with defaults
     * @param {Object} config - User configuration
     * @returns {Object}
     * @private
     */
    _mergeConfig(config) {
        const defaultConfig = {
            containerId: 'universal-cart-container',
            toggleButtonId: 'cart-toggle',
            badgeId: 'cart-badge',
            position: 'right',
            showCostInfo: true,
            showActivity: true,
            hideOnClear: false,
            maxItems: 50,
            enableNotifications: true,
            autoSave: true,
            animations: true
        };

        return { ...defaultConfig, ...config };
    }

    /**
     * Initialize the cart UI
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            console.warn('CartUI already initialized');
            return;
        }

        try {
            await this._loadCSS();
            this._createUI();
            this._bindElements();
            this._setupEventListeners();
            this.render();

            this.isInitialized = true;
            console.log('CartUI initialized successfully');
        } catch (error) {
            console.error('Failed to initialize CartUI:', error);
            throw error;
        }
    }

    /**
     * Load external CSS
     * @returns {Promise<void>}
     * @private
     */
    _loadCSS() {
        return new Promise((resolve, reject) => {
            // Check if CSS is already loaded
            if (document.querySelector('link[href*="universal-cart.css"]')) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/static/css/universal-cart.css';

            link.onload = () => resolve();
            link.onerror = () => {
                console.warn('Failed to load external CSS, using fallback');
                this._injectFallbackCSS();
                resolve();
            };

            document.head.appendChild(link);
        });
    }

    /**
     * Inject fallback CSS if external file fails to load
     * @private
     */
    _injectFallbackCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* Minimal fallback styles for Universal Cart */
            .universal-cart-container {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 400px;
                max-height: 80vh;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                z-index: 1050;
                display: none;
            }
            .universal-cart-container.show { display: block; }
            .cart-header { padding: 1rem; border-bottom: 1px solid #eee; }
            .cart-body { max-height: 400px; overflow-y: auto; }
            .cart-item { padding: 0.75rem; border-bottom: 1px solid #f0f0f0; }
            .cart-footer { padding: 1rem; border-top: 1px solid #eee; }
        `;
        document.head.appendChild(style);
    }

    /**
     * Create UI elements
     * @private
     */
    _createUI() {
        // Create main container
        const containerHTML = this.templates.getCartContainerTemplate();
        document.body.insertAdjacentHTML('beforeend', containerHTML);

        // Create toggle button if it doesn't exist
        this._ensureToggleButton();
    }

    /**
     * Ensure toggle button exists
     * @private
     */
    _ensureToggleButton() {
        let toggleButton = document.getElementById(this.config.toggleButtonId);

        if (!toggleButton) {
            // Create default toggle button
            const buttonHTML = `
                <button id="${this.config.toggleButtonId}" class="btn btn-primary position-fixed"
                        style="bottom: 20px; right: 20px; z-index: 1040; border-radius: 50px;">
                    <i class="fas fa-shopping-cart"></i>
                    <span id="${this.config.badgeId}" class="badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill"
                          style="display: none;">0</span>
                </button>
            `;

            document.body.insertAdjacentHTML('beforeend', buttonHTML);
        }
    }

    /**
     * Bind DOM elements
     * @private
     */
    _bindElements() {
        this.container = document.getElementById(this.config.containerId);
        this.toggleButton = document.getElementById(this.config.toggleButtonId);
        this.badge = document.getElementById(this.config.badgeId);

        if (this.container) {
            this.itemsList = this.container.querySelector('.cart-items-list');
            this.summary = this.container.querySelector('.cart-summary');
        }

        if (!this.container) {
            throw new Error('Cart container not found');
        }
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        this.eventHandler.setupEventListeners(this.container, this.toggleButton);
    }

    /**
     * Render the entire cart UI
     */
    render() {
        if (!this.isInitialized) return;

        // Update items list
        if (this.itemsList) {
            this.renderer.updateItemsList(this.itemsList);
        }

        // Update summary
        if (this.summary) {
            this.renderer.updateSummary(this.summary);
        }

        // Update badge
        this.renderer.updateBadge(this.badge);

        // Update action buttons
        this.renderer.updateActionButtons(this.container);
    }

    /**
     * Show the cart
     */
    show() {
        if (!this.container) return;

        this.container.classList.add('show');
        this.isVisible = true;

        // Focus management
        const firstFocusable = this.container.querySelector('button, input, [tabindex]');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }
    }

    /**
     * Hide the cart
     */
    hide() {
        if (!this.container) return;

        this.container.classList.remove('show');
        this.isVisible = false;
    }

    /**
     * Toggle cart visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Show confirmation dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<Object>}
     */
    showConfirmDialog(options) {
        return this.dialogs.showConfirmDialog(options);
    }

    /**
     * Show notification
     * @param {string} message
     * @param {string} type
     * @param {number} duration
     */
    _showNotification(message, type = 'info', duration = 3000) {
        if (this.config.enableNotifications) {
            this.dialogs.showNotification(message, type, duration);
        }
    }

    /**
     * Animate badge when item is added
     */
    _animateBadge() {
        if (!this.badge || !this.config.animations) return;

        this.badge.classList.add('cart-badge-pulse');
        setTimeout(() => {
            this.badge.classList.remove('cart-badge-pulse');
        }, 600);
    }

    /**
     * Show loading dialog
     * @param {string} message
     * @returns {Object}
     */
    showLoadingDialog(message) {
        return this.dialogs.showLoadingDialog(message);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.eventHandler) {
            this.eventHandler.cleanup();
        }

        if (this.dialogs) {
            this.dialogs.closeAll();
        }

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        // Reset state
        this.isInitialized = false;
        this.isVisible = false;
        this.container = null;
        this.toggleButton = null;
        this.badge = null;
    }

    /**
     * Get debug information
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            module: 'CartUI',
            isInitialized: this.isInitialized,
            isVisible: this.isVisible,
            config: this.config,
            hasContainer: !!this.container,
            hasToggleButton: !!this.toggleButton,
            modules: {
                templates: this.templates?.getDebugInfo?.() || null,
                renderer: this.renderer?.getDebugInfo?.() || null,
                eventHandler: this.eventHandler?.getDebugInfo?.() || null,
                dialogs: this.dialogs?.getDebugInfo?.() || null
            }
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartUI;
}

// Global export for browser usage
if (typeof window !== 'undefined') {
    window.CartUI = CartUI;
}
