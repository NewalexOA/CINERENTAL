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
     * CartUI Constructor
     * @param {UniversalCart} cart - Cart instance
     * @param {Object} config - UI configuration
     */
    constructor(cart, config = {}) {
        console.log('[CartUI] Constructor called with cart:', cart);
        console.log('[CartUI] Constructor called with config:', config);
        this.cart = cart;
        this.config = this._mergeConfig(config);
        console.log('[CartUI] Final merged config:', {
            renderMode: this.config.renderMode,
            showCostInfo: this.config.showCostInfo,
            type: this.config.type
        });
        this.isInitialized = false;
        this.isVisible = false;
        this.isEmbedded = false;  // Will be set during UI creation

        // DOM references (will be set during initialization)
        this.container = null;
        this.cartContent = null;
        this.itemsList = null;
        this.summary = null;
        this.badge = null;

        // Initialize modules
        this._initializeModules();
        console.log('[CartUI] Constructor completed');
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
            animations: true,
            renderMode: 'cards'  // Default rendering mode
        };

        return { ...defaultConfig, ...config };
    }

    /**
     * Initialize the cart UI
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            console.warn('[CartUI] Already initialized');
            return;
        }

        console.log('[CartUI] Starting initialization...');

        try {
            console.log('[CartUI] Loading CSS...');
            await this._loadCSS();

            console.log('[CartUI] Creating UI...');
            this._createUI();

            console.log('[CartUI] Binding elements... embedded:', this.isEmbedded);
            this._bindElements();

            console.log('[CartUI] Setting up event listeners...');
            this._setupEventListeners();

            console.log('[CartUI] Initial rendering...');
            this.render();

            this.isInitialized = true;
            console.log('[CartUI] Initialized successfully');
        } catch (error) {
            console.error('[CartUI] Failed to initialize:', error);
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
        console.log('[CartUI] Creating UI elements...');

        // Check if we're on project page and should use embedded mode
        const projectPageContainer = document.getElementById('universalCartContainer');
        console.log('[CartUI] Looking for universalCartContainer:', projectPageContainer);

        if (projectPageContainer) {
            this.isEmbedded = true;
            this.container = projectPageContainer;
            this.cartContent = document.getElementById('cartContent');
            console.log('[CartUI] Embedded mode enabled. Container:', this.container, 'Content:', this.cartContent);
            return;
        }

        console.log('[CartUI] Using floating mode');

        // Create main container for floating mode
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
        if (!this.isEmbedded) {
            // Only bind elements for floating mode
            this.container = document.getElementById(this.config.containerId);
            this.toggleButton = document.getElementById(this.config.toggleButtonId);
            this.badge = document.getElementById(this.config.badgeId);

            if (this.container) {
                this.itemsList = this.container.querySelector('.cart-items-list');
                this.summary = this.container.querySelector('.cart-summary');
            }
        } else {
            // For embedded mode, container is already set in _createUI()
            // Just bind toggle button and badge if they exist
            this.toggleButton = document.getElementById(this.config.toggleButtonId);
            this.badge = document.getElementById(this.config.badgeId);

            // cartContent is already set in _createUI()
            // Bind table body for embedded table mode
            if (this.container) {
                this.itemsList = this.container.querySelector('.cart-items-list');
                this.summary = this.container.querySelector('.cart-summary');
                this.tableBody = this.container.querySelector('.table-body');
            }
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
        // For embedded table mode ensure delegates on table body as well
        if (this.tableBody) {
            this.tableBody.addEventListener('click', this.eventHandler._handleItemControlClick);
            this.tableBody.addEventListener('change', this.eventHandler._handleItemInputChange);
        }
    }

    /**
     * Render the entire cart UI
     */
    render() {
        console.log('[CartUI] render() called. isInitialized:', this.isInitialized, 'isEmbedded:', this.isEmbedded);

        if (!this.isInitialized) {
            console.log('[CartUI] render() skipped - not initialized');
            return;
        }

        if (this.isEmbedded) {
            console.log('[CartUI] Calling _renderEmbedded()');
            // Embedded mode rendering
            this._renderEmbedded();
        } else {
            console.log('[CartUI] Calling _renderFloating()');
            // Floating mode rendering
            this._renderFloating();
        }
    }

    /**
     * Render embedded cart
     * @private
     */
    _renderEmbedded() {
        console.log('[CartUI] Rendering embedded cart...');
        const items = this.cart.getItems();
        const itemCount = this.cart.getItemCount();

        console.log('[CartUI] Embedded render:', { itemCount, items: items.length });

        // Update item count badge
        const badge = document.getElementById('cartItemCount');
        if (badge) {
            badge.textContent = `${itemCount} позиций`;
            badge.classList.add('updated');
            setTimeout(() => badge.classList.remove('updated'), 600);
            console.log('[CartUI] Badge updated:', badge.textContent);
        }

        // Update cart content
        if (this.cartContent) {
            if (itemCount === 0) {
                this.cartContent.className = 'empty';
                this.cartContent.innerHTML = '';
                console.log('[CartUI] Cart content cleared (empty)');
            } else {
                this.cartContent.className = '';
                // Use renderer.updateItemsList to respect renderMode configuration
                this.renderer.updateItemsList(this.cartContent);
                console.log('[CartUI] Cart content updated with', items.length, 'items using renderer');
            }
        } else {
            console.error('[CartUI] cartContent element not found!');
        }

        // Setup event listeners for embedded items (including date clicks)
        if (itemCount > 0) {
            this._setupEmbeddedEventListeners();
            // Also update action buttons after rendering
            this.renderer.updateActionButtons(this.container);
        }

        // Show/hide cart container based on content
        console.log('[CartUI] Show/hide logic:', {
            itemCount,
            hasItems: itemCount > 0,
            hideOnEmpty: this.cart.config.hideOnEmpty,
            containerDisplay: this.container.style.display,
            containerHasHiddenClass: this.container.classList.contains('universal-cart-hidden')
        });

        if (itemCount > 0) {
            if (this.container.style.display === 'none' || this.container.classList.contains('universal-cart-hidden')) {
                console.log('[CartUI] Showing embedded cart container (has items)');
                this.show();
            } else {
                console.log('[CartUI] Cart already visible, not calling show()');
            }
        } else if (itemCount === 0 && this.cart.config.hideOnEmpty) {
            console.log('[CartUI] Hiding embedded cart container (empty)');
            this.hide();
        } else {
            console.log('[CartUI] Not hiding cart (empty but hideOnEmpty=false)');
        }
    }

    /**
     * Render floating cart
     * @private
     */
    _renderFloating() {
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
     * Render items for embedded mode
     * @private
     */
    _renderEmbeddedItems(items) {
        let html = '';

        items.forEach(item => {
            const quantity = item.quantity || 1;
            const hasSerial = !!item.serial_number;
            const itemKey = this.cart._generateItemKey(item);

            // Get dates display using renderer logic
            const datesInfo = this.renderer._getItemDatesDisplay(item);

            html += `
                <div class="cart-item-embedded d-flex justify-content-between align-items-center" data-item-id="${item.id}" data-item-key="${itemKey}">
                    <div class="flex-grow-1">
                        <div class="cart-item-name">${this._escapeHtml(item.name)}</div>
                        <div class="cart-item-details">
                            <small class="text-muted">
                                <i class="fas fa-barcode me-1"></i>${this._escapeHtml(item.barcode || 'Нет')}
                                ${item.serial_number ? `<span class="ms-2"><i class="fas fa-tag me-1"></i>S/N: ${this._escapeHtml(item.serial_number)}</span>` : ''}
                            </small>
                            <br>
                            <small class="text-muted">${this._escapeHtml(item.category || 'Без категории')}</small>
                        </div>
                        <!-- Custom dates display for embedded mode -->
                        <div class="cart-item-dates mt-2">
                            <div class="date-display ${datesInfo.useProjectDates ? 'project-dates' : ''}${datesInfo.customDates ? 'custom-dates' : ''}"
                                 data-item-key="${itemKey}"
                                 style="cursor: pointer; font-size: 0.75em;"
                                 title="Кликните для изменения дат">
                                <i class="fas fa-calendar-alt me-1"></i>
                                <span class="dates-text">${datesInfo.display}</span>
                                <i class="fas fa-edit ms-1 text-muted edit-icon" style="font-size: 0.7em;"></i>
                            </div>
                        </div>
                    </div>
                    <div class="cart-item-controls">
                        ${hasSerial ?
                            `<span class="badge bg-primary">1</span>` :
                            `<div class="quantity-controls-embedded">
                                <button class="btn btn-outline-secondary btn-sm" onclick="updateCartQuantity('${item.id}', ${quantity - 1})" ${quantity <= 1 ? 'disabled' : ''}>
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input type="number" class="quantity-input-embedded" value="${quantity}" min="1" readonly>
                                <button class="btn btn-outline-secondary btn-sm" onclick="updateCartQuantity('${item.id}', ${quantity + 1})">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>`
                        }
                        <button class="btn btn-outline-danger btn-sm ms-2" onclick="removeFromCart('${item.id}')" title="Удалить">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        return html;
    }

    /**
     * Setup event listeners for embedded mode items
     * @private
     */
    _setupEmbeddedEventListeners() {
        if (!this.cartContent) return;

        // Remove previous listeners to avoid duplicates
        const oldDateDisplays = this.cartContent.querySelectorAll('.date-display');
        oldDateDisplays.forEach(element => {
            element.removeEventListener('click', this._handleEmbeddedDateClick);
        });

        // Add click listeners to date displays
        const dateDisplays = this.cartContent.querySelectorAll('.date-display');
        dateDisplays.forEach(element => {
            element.addEventListener('click', (e) => this._handleEmbeddedDateClick(e));
        });

        console.log('[CartUI] Embedded event listeners setup for', dateDisplays.length, 'date displays');
    }

    /**
     * Handle date click in embedded mode
     * @private
     */
    _handleEmbeddedDateClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const dateDisplay = e.currentTarget;
        const itemKey = dateDisplay.getAttribute('data-item-key');

        if (itemKey && this.eventHandler) {
            console.log('[CartUI] Date clicked for item:', itemKey);
            this.eventHandler._handleDateEdit(itemKey);
        }
    }

    /**
     * Escape HTML
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show the cart
     */
    show() {
        console.log('[CartUI] show() called. Container:', this.container);

        if (!this.container) {
            console.error('[CartUI] show() failed - no container');
            return;
        }

        console.log('[CartUI] Before show - hidden class:', this.container.classList.contains('universal-cart-hidden'), 'isEmbedded:', this.isEmbedded);

        if (this.isEmbedded) {
            // Embedded mode - remove hidden class and add show class
            this.container.classList.remove('universal-cart-hidden');
            this.container.classList.add('show');
            console.log('[CartUI] After show - hidden class:', this.container.classList.contains('universal-cart-hidden'), 'has show class:', this.container.classList.contains('show'));
        } else {
            // Floating mode - show the overlay
            this.container.classList.add('show');
        }

        this.isVisible = true;

        // Focus management
        const firstFocusable = this.container.querySelector('button, input, [tabindex]');
        if (firstFocusable) {
            setTimeout(() => firstFocusable.focus(), 100);
        }

        console.log('[CartUI] show() completed. isVisible:', this.isVisible);
    }

    /**
     * Hide the cart
     */
    hide() {
        console.log('[CartUI] hide() called. Container:', this.container);
        console.log('[CartUI] hide() call stack:', new Error().stack);

        if (!this.container) {
            console.error('[CartUI] hide() failed - no container');
            return;
        }

        console.log('[CartUI] Before hide - hidden class:', this.container.classList.contains('universal-cart-hidden'), 'isEmbedded:', this.isEmbedded);

        if (this.isEmbedded) {
            // Embedded mode - add hidden class and remove show class
            this.container.classList.add('universal-cart-hidden');
            this.container.classList.remove('show');
            console.log('[CartUI] After hide - hidden class:', this.container.classList.contains('universal-cart-hidden'), 'has show class:', this.container.classList.contains('show'));
        } else {
            // Floating mode - hide the overlay
            this.container.classList.remove('show');
        }

        this.isVisible = false;
        console.log('[CartUI] hide() completed. isVisible:', this.isVisible);
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
