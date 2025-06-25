/**
 * Cart Event Handler Module
 * Handles all event binding and processing for Universal Cart
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

class CartEventHandler {
    /**
     * @param {Object} cart - UniversalCart instance
     * @param {Object} cartUI - CartUI instance
     * @param {Object} renderer - CartRenderer instance
     * @param {Object} config - Configuration object
     */
    constructor(cart, cartUI, renderer, config = {}) {
        this.cart = cart;
        this.cartUI = cartUI;
        this.renderer = renderer;
        this.config = config;

        // Bind methods to preserve context
        this._handleItemControlClick = this._handleItemControlClick.bind(this);
        this._handleItemInputChange = this._handleItemInputChange.bind(this);
        this._handleToggleClick = this._handleToggleClick.bind(this);
        this._handleCloseClick = this._handleCloseClick.bind(this);
        this._handleOutsideClick = this._handleOutsideClick.bind(this);
        this._handleKeyDown = this._handleKeyDown.bind(this);
    }

    /**
     * Setup all event listeners
     * @param {HTMLElement} container - Cart container
     * @param {HTMLElement} toggleButton - Toggle button
     */
    setupEventListeners(container, toggleButton) {
        this.container = container;
        this.toggleButton = toggleButton;

        // Toggle button events
        if (toggleButton) {
            toggleButton.addEventListener('click', this._handleToggleClick);
        }

        // Cart container events
        this._setupContainerEvents(container);

        // Document-level events
        this._setupDocumentEvents();

        // Cart business logic events
        this._setupCartEvents();
    }

    /**
     * Setup events for cart container
     * @param {HTMLElement} container - Cart container
     * @private
     */
    _setupContainerEvents(container) {
        // Close button
        const closeBtn = container.querySelector('.cart-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', this._handleCloseClick);
        }

        // Action buttons
        const primaryAction = container.querySelector('.cart-action-primary');
        if (primaryAction) {
            primaryAction.addEventListener('click', () => this._handlePrimaryAction());
        }

        const clearBtn = container.querySelector('.cart-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this._handleClear());
        }

        const saveBtn = container.querySelector('.cart-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this._handleSave());
        }

        // Item controls (delegated events)
        const itemsList = container.querySelector('.cart-items-list');
        if (itemsList) {
            itemsList.addEventListener('click', this._handleItemControlClick);
            itemsList.addEventListener('change', this._handleItemInputChange);
        }
    }

    /**
     * Setup document-level events
     * @private
     */
    _setupDocumentEvents() {
        // Outside click to close
        document.addEventListener('click', this._handleOutsideClick);

        // Escape key to close
        document.addEventListener('keydown', this._handleKeyDown);
    }

    /**
     * Setup cart business logic events
     * @private
     */
    _setupCartEvents() {
        this.cart.on('itemAdded', (data) => {
            this.renderer.trackActivity('add', data.item.name);
            this.cartUI.render();
            this.cartUI._showNotification('Позиция добавлена в корзину', 'success');
            this.cartUI._animateBadge();
        });

        this.cart.on('itemRemoved', (data) => {
            this.renderer.trackActivity('remove', data.item.name);
            this.cartUI.render();
            this.cartUI._showNotification('Позиция удалена из корзины', 'info');
        });

        this.cart.on('itemUpdated', (data) => {
            this.renderer.trackActivity('update', data.item.name);
            this.cartUI.render();
        });

        this.cart.on('cleared', () => {
            this.renderer.trackActivity('clear');
            this.cartUI.render();
            this.cartUI._showNotification('Корзина очищена', 'info');
        });

        this.cart.on('error', (data) => {
            this.cartUI._showNotification(`Ошибка: ${data.error.message}`, 'error');
        });
    }

    /**
     * Handle toggle button click
     * @param {Event} e
     * @private
     */
    _handleToggleClick(e) {
        e.preventDefault();
        this.cartUI.toggle();
    }

    /**
     * Handle close button click
     * @private
     */
    _handleCloseClick() {
        this.cartUI.hide();
    }

    /**
     * Handle outside click
     * @param {Event} e
     * @private
     */
    _handleOutsideClick(e) {
        if (this.cartUI.isVisible &&
            this.container &&
            !this.container.contains(e.target) &&
            e.target !== this.toggleButton &&
            !this.toggleButton?.contains(e.target)) {
            this.cartUI.hide();
        }
    }

    /**
     * Handle escape key
     * @param {Event} e
     * @private
     */
    _handleKeyDown(e) {
        if (e.key === 'Escape' && this.cartUI.isVisible) {
            this.cartUI.hide();
        }
    }

    /**
     * Handle item control clicks (quantity buttons, remove)
     * @param {Event} e
     * @private
     */
    _handleItemControlClick(e) {
        const cartItem = e.target.closest('.cart-item');
        if (!cartItem) return;

        const itemKey = cartItem.dataset.itemKey;

        if (e.target.closest('.quantity-decrease')) {
            this._changeQuantity(itemKey, -1);
        } else if (e.target.closest('.quantity-increase')) {
            this._changeQuantity(itemKey, 1);
        } else if (e.target.closest('.cart-item-remove')) {
            this.cart.removeItem(itemKey);
        }
    }

    /**
     * Handle input field changes
     * @param {Event} e
     * @private
     */
    _handleItemInputChange(e) {
        if (e.target.classList.contains('quantity-input')) {
            const cartItem = e.target.closest('.cart-item');
            const itemKey = cartItem.dataset.itemKey;
            const newQuantity = parseInt(e.target.value, 10);

            if (newQuantity > 0) {
                this.cart.updateQuantity(itemKey, newQuantity);
            }
        }
    }

    /**
     * Change item quantity
     * @param {string} itemKey - Item key
     * @param {number} delta - Quantity change
     * @private
     */
    _changeQuantity(itemKey, delta) {
        const item = this.cart.getItem(itemKey);
        if (item) {
            const newQuantity = (item.quantity || 1) + delta;
            if (newQuantity > 0) {
                this.cart.updateQuantity(itemKey, newQuantity);
            }
        }
    }

    /**
     * Handle primary action (add to project)
     * @private
     */
    _handlePrimaryAction() {
        // Trigger custom event for integration
        this.container.dispatchEvent(new CustomEvent('cart:primaryAction', {
            detail: {
                cart: this.cart,
                items: this.cart.getItems()
            }
        }));
    }

    /**
     * Handle cart clearing
     * @private
     */
    async _handleClear() {
        const itemCount = this.cart.getItemCount();
        const totalQuantity = this.cart.getTotalQuantity();

        if (itemCount === 0) {
            this.cartUI._showNotification('Корзина уже пуста', 'info');
            return;
        }

        const options = {
            title: 'Очистка корзины',
            message: `Вы уверены, что хотите удалить все ${itemCount} позиций (${totalQuantity} единиц) из корзины?`,
            confirmText: 'Очистить',
            cancelText: 'Отмена',
            type: 'warning',
            additionalOptions: [
                {
                    id: 'save-before-clear',
                    label: 'Сохранить корзину перед очисткой',
                    checked: false
                }
            ]
        };

        try {
            const result = await this.cartUI.showConfirmDialog(options);

            if (result.confirmed) {
                // Save before clearing if requested
                if (result.options && result.options['save-before-clear']) {
                    await this._saveCartToHistory();
                }

                this.cart.clear();
                this.cartUI._showNotification('Корзина очищена', 'success');

                // Hide cart if configured
                if (this.config.hideOnClear) {
                    setTimeout(() => this.cartUI.hide(), 500);
                }
            }
        } catch (error) {
            console.error('Error during cart clear:', error);
            this.cartUI._showNotification('Произошла ошибка при очистке корзины', 'error');
        }
    }

    /**
     * Handle cart saving
     * @private
     */
    _handleSave() {
        // Manual save trigger
        if (this.cart.storage) {
            this.cart._saveToStorage();
            this.cartUI._showNotification('Корзина сохранена', 'success');
        }
    }

    /**
     * Save cart to history before clearing
     * @private
     */
    async _saveCartToHistory() {
        try {
            const cartData = {
                items: this.cart.getItems(),
                timestamp: new Date().toISOString(),
                type: 'manual_save',
                itemCount: this.cart.getItemCount(),
                totalQuantity: this.cart.getTotalQuantity()
            };

            const historyKey = `cart_history_${Date.now()}`;
            localStorage.setItem(historyKey, JSON.stringify(cartData));

            // Keep only last 5 saves
            this._cleanupCartHistory();

            this.cartUI._showNotification('Корзина сохранена в историю', 'info');
        } catch (error) {
            console.error('Failed to save cart to history:', error);
            throw error;
        }
    }

    /**
     * Cleanup old cart history entries
     * @private
     */
    _cleanupCartHistory() {
        const historyKeys = Object.keys(localStorage)
            .filter(key => key.startsWith('cart_history_'))
            .sort();

        // Keep only last 5 entries
        while (historyKeys.length > 5) {
            const oldestKey = historyKeys.shift();
            localStorage.removeItem(oldestKey);
        }
    }

    /**
     * Cleanup event listeners
     */
    cleanup() {
        if (this.toggleButton) {
            this.toggleButton.removeEventListener('click', this._handleToggleClick);
        }

        document.removeEventListener('click', this._handleOutsideClick);
        document.removeEventListener('keydown', this._handleKeyDown);

        // Note: Cart events will be cleaned up by the cart instance itself
    }

    /**
     * Get debug information
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            module: 'CartEventHandler',
            hasToggleButton: !!this.toggleButton,
            hasContainer: !!this.container,
            config: this.config
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartEventHandler;
}

// Global export for browser usage
if (typeof window !== 'undefined') {
    window.CartEventHandler = CartEventHandler;
}
