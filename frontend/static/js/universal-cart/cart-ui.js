/**
 * Cart UI for Universal Cart
 *
 * UI компоненты и рендеринг для универсальной корзины
 * Использует Bootstrap 5 для современного интерфейса
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

class CartUI {
    /**
     * Конструктор CartUI
     * @param {UniversalCart} cart - Экземпляр корзины
     */
    constructor(cart) {
        this.cart = cart;
        this.config = cart.config;

        // UI Elements (будут найдены при инициализации)
        this.container = null;
        this.badge = null;
        this.toggleButton = null;
        this.itemsList = null;
        this.summary = null;

        // UI State
        this.isVisible = false;
        this.isAnimating = false;

        // Templates
        this.templates = {};

        // Initialize UI
        this._init();
    }

    /**
     * Инициализация UI
     * @private
     */
    _init() {
        try {
            // Find or create UI elements
            this._setupElements();

            // Load templates
            this._loadTemplates();

            // Setup event listeners
            this._setupEventListeners();

            // Subscribe to cart events
            this._subscribeToCartEvents();

            // Initial render
            this.render();

            if (this.config.debug) {
                console.log('[CartUI] Initialized successfully');
            }

        } catch (error) {
            console.error('[CartUI] Initialization failed:', error);
        }
    }

    /**
     * Настройка DOM элементов
     * @private
     */
    _setupElements() {
        // Find existing cart container or create new one
        this.container = document.getElementById('universal-cart-container');

        if (!this.container) {
            this.container = this._createCartContainer();
            document.body.appendChild(this.container);
        }

        // Find toggle button (usually in navbar or toolbar)
        this.toggleButton = document.querySelector('[data-cart-toggle]');
        if (this.toggleButton) {
            this.badge = this.toggleButton.querySelector('.cart-badge') ||
                        this._createBadge();
        }

        // Setup internal elements
        this.itemsList = this.container.querySelector('.cart-items-list');
        this.summary = this.container.querySelector('.cart-summary');
    }

    /**
     * Создание контейнера корзины
     * @returns {HTMLElement}
     * @private
     */
    _createCartContainer() {
        const container = document.createElement('div');
        container.id = 'universal-cart-container';
        container.className = 'universal-cart position-fixed';
        container.innerHTML = this._getCartTemplate();

        return container;
    }

    /**
     * Создание бейджа с количеством
     * @returns {HTMLElement}
     * @private
     */
    _createBadge() {
        const badge = document.createElement('span');
        badge.className = 'cart-badge badge bg-primary position-absolute';
        badge.style.display = 'none';

        if (this.toggleButton) {
            this.toggleButton.style.position = 'relative';
            this.toggleButton.appendChild(badge);
        }

        return badge;
    }

    /**
     * Загрузка шаблонов
     * @private
     */
    _loadTemplates() {
        this.templates = {
            cartContainer: this._getCartTemplate(),
            cartItem: this._getCartItemTemplate(),
            cartSummary: this._getCartSummaryTemplate(),
            emptyState: this._getEmptyStateTemplate()
        };
    }

    /**
     * Основной шаблон корзины
     * @returns {string}
     * @private
     */
    _getCartTemplate() {
        return `
            <div class="cart-panel bg-white shadow-lg border rounded">
                <div class="cart-header border-bottom p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="fas fa-shopping-cart me-2"></i>
                            Корзина оборудования
                        </h5>
                        <button type="button" class="btn-close cart-close" aria-label="Закрыть"></button>
                    </div>
                </div>

                <div class="cart-body">
                    <div class="cart-items-list"></div>
                    <div class="cart-summary p-3 border-top"></div>
                </div>

                <div class="cart-footer border-top p-3">
                    <div class="d-grid gap-2">
                        <button type="button" class="btn btn-primary cart-action-primary">
                            <i class="fas fa-plus me-2"></i>
                            Добавить в проект
                        </button>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-outline-secondary cart-clear">
                                <i class="fas fa-trash me-2"></i>
                                Очистить
                            </button>
                            <button type="button" class="btn btn-outline-info cart-save">
                                <i class="fas fa-save me-2"></i>
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Шаблон элемента корзины
     * @returns {string}
     * @private
     */
    _getCartItemTemplate() {
        return `
            <div class="cart-item border-bottom p-3" data-item-key="{{itemKey}}">
                <div class="d-flex align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">{{name}}</h6>
                        <small class="text-muted">{{category}}</small>
                        {{#serial_number}}
                        <div class="badge bg-light text-dark mt-1">S/N: {{serial_number}}</div>
                        {{/serial_number}}
                    </div>
                    <div class="cart-item-controls d-flex align-items-center ms-3">
                        <div class="quantity-controls me-2">
                            <div class="input-group input-group-sm">
                                <button class="btn btn-outline-secondary btn-sm quantity-decrease" type="button">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input type="number" class="form-control text-center quantity-input"
                                       value="{{quantity}}" min="1" max="99" style="width: 60px;">
                                <button class="btn btn-outline-secondary btn-sm quantity-increase" type="button">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        <button type="button" class="btn btn-outline-danger btn-sm cart-item-remove">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Шаблон сводки корзины
     * @returns {string}
     * @private
     */
    _getCartSummaryTemplate() {
        return `
            <div class="cart-summary-content">
                <div class="row text-center">
                    <div class="col-6">
                        <div class="summary-stat">
                            <div class="h4 mb-1 text-primary">{{itemCount}}</div>
                            <small class="text-muted">позиций</small>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="summary-stat">
                            <div class="h4 mb-1 text-success">{{totalQuantity}}</div>
                            <small class="text-muted">единиц</small>
                        </div>
                    </div>
                </div>
                {{#maxItemsWarning}}
                <div class="alert alert-warning alert-sm mt-2 mb-0">
                    <i class="fas fa-exclamation-triangle me-1"></i>
                    Достигнут лимит: {{itemCount}}/{{maxItems}}
                </div>
                {{/maxItemsWarning}}
            </div>
        `;
    }

    /**
     * Шаблон пустого состояния
     * @returns {string}
     * @private
     */
    _getEmptyStateTemplate() {
        return `
            <div class="cart-empty-state text-center p-4">
                <div class="empty-icon mb-3">
                    <i class="fas fa-shopping-cart fa-3x text-muted"></i>
                </div>
                <h5 class="text-muted mb-2">Корзина пуста</h5>
                <p class="text-muted mb-0">
                    Добавьте оборудование из поиска или с помощью сканера
                </p>
            </div>
        `;
    }

    /**
     * Настройка обработчиков событий
     * @private
     */
    _setupEventListeners() {
        // Toggle button
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        }

        // Close button
        const closeBtn = this.container.querySelector('.cart-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // Action buttons
        const primaryAction = this.container.querySelector('.cart-action-primary');
        if (primaryAction) {
            primaryAction.addEventListener('click', () => this._handlePrimaryAction());
        }

        const clearBtn = this.container.querySelector('.cart-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this._handleClear());
        }

        const saveBtn = this.container.querySelector('.cart-save');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this._handleSave());
        }

        // Item controls (delegated events)
        this.itemsList.addEventListener('click', (e) => {
            this._handleItemControlClick(e);
        });

        this.itemsList.addEventListener('change', (e) => {
            this._handleItemInputChange(e);
        });

        // Outside click to close
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.container.contains(e.target) &&
                e.target !== this.toggleButton &&
                !this.toggleButton?.contains(e.target)) {
                this.hide();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Подписка на события корзины
     * @private
     */
    _subscribeToCartEvents() {
        this.cart.on('itemAdded', () => {
            this.render();
            this._showNotification('Позиция добавлена в корзину', 'success');
        });

        this.cart.on('itemRemoved', () => {
            this.render();
            this._showNotification('Позиция удалена из корзины', 'info');
        });

        this.cart.on('itemUpdated', () => {
            this.render();
        });

        this.cart.on('cleared', () => {
            this.render();
            this._showNotification('Корзина очищена', 'info');
        });

        this.cart.on('error', (data) => {
            this._showNotification(`Ошибка: ${data.error.message}`, 'error');
        });
    }

    /**
     * Рендеринг всего UI корзины
     */
    render() {
        this._updateBadge();
        this._updateItemsList();
        this._updateSummary();
        this._updateActionButtons();
    }

    /**
     * Обновление бейджа с количеством
     * @private
     */
    _updateBadge() {
        if (!this.badge) return;

        const count = this.cart.getItemCount();

        if (count > 0) {
            this.badge.textContent = count;
            this.badge.style.display = 'block';
        } else {
            this.badge.style.display = 'none';
        }
    }

    /**
     * Обновление списка позиций
     * @private
     */
    _updateItemsList() {
        const items = this.cart.getItems();

        if (items.length === 0) {
            this.itemsList.innerHTML = this.templates.emptyState;
        } else {
            this.itemsList.innerHTML = items.map(item =>
                this._renderItem(item)
            ).join('');
        }
    }

    /**
     * Рендеринг отдельной позиции
     * @param {Object} item - Позиция оборудования
     * @returns {string}
     * @private
     */
    _renderItem(item) {
        const template = this.templates.cartItem;
        const itemKey = this.cart._generateItemKey(item);

        return template
            .replace(/\{\{itemKey\}\}/g, itemKey)
            .replace(/\{\{name\}\}/g, this._escapeHtml(item.name))
            .replace(/\{\{category\}\}/g, this._escapeHtml(item.category || 'Без категории'))
            .replace(/\{\{quantity\}\}/g, item.quantity || 1)
            .replace(/\{\{#serial_number\}\}(.*?)\{\{\/serial_number\}\}/gs,
                item.serial_number ? '$1'.replace(/\{\{serial_number\}\}/g, item.serial_number) : '');
    }

    /**
     * Обновление сводки корзины
     * @private
     */
    _updateSummary() {
        const itemCount = this.cart.getItemCount();
        const totalQuantity = this.cart.getTotalQuantity();
        const maxItems = this.config.maxItems;

        const summaryData = {
            itemCount: itemCount,
            totalQuantity: totalQuantity,
            maxItems: maxItems,
            maxItemsWarning: itemCount >= maxItems * 0.8 // Warning at 80%
        };

        let summaryHtml = this.templates.cartSummary;

        // Simple template replacement
        for (const [key, value] of Object.entries(summaryData)) {
            if (key === 'maxItemsWarning') {
                const warningPattern = /\{\{#maxItemsWarning\}\}(.*?)\{\{\/maxItemsWarning\}\}/gs;
                summaryHtml = summaryHtml.replace(warningPattern,
                    value ? '$1'.replace(/\{\{itemCount\}\}/g, itemCount).replace(/\{\{maxItems\}\}/g, maxItems) : '');
            } else {
                summaryHtml = summaryHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
            }
        }

        this.summary.innerHTML = summaryHtml;
    }

    /**
     * Обновление кнопок действий
     * @private
     */
    _updateActionButtons() {
        const primaryAction = this.container.querySelector('.cart-action-primary');
        const clearBtn = this.container.querySelector('.cart-clear');

        const isEmpty = this.cart.isEmpty();

        if (primaryAction) {
            primaryAction.disabled = isEmpty;
        }

        if (clearBtn) {
            clearBtn.disabled = isEmpty;
        }
    }

    /**
     * Показ корзины
     */
    show() {
        if (this.isVisible || this.isAnimating) return;

        this.isAnimating = true;
        this.container.style.display = 'block';

        // Animate in
        setTimeout(() => {
            this.container.classList.add('show');
            this.isVisible = true;
            this.isAnimating = false;
        }, 10);
    }

    /**
     * Скрытие корзины
     */
    hide() {
        if (!this.isVisible || this.isAnimating) return;

        this.isAnimating = true;
        this.container.classList.remove('show');

        // Animate out
        setTimeout(() => {
            this.container.style.display = 'none';
            this.isVisible = false;
            this.isAnimating = false;
        }, 300);
    }

    /**
     * Переключение видимости корзины
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Обработка кликов по элементам управления позициями
     * @param {Event} e - Событие клика
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
     * Обработка изменения полей ввода
     * @param {Event} e - Событие изменения
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
     * Изменение количества позиции
     * @param {string} itemKey - Ключ позиции
     * @param {number} delta - Изменение количества
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
     * Обработка основного действия
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
     * Обработка очистки корзины
     * @private
     */
    _handleClear() {
        if (confirm('Вы уверены, что хотите очистить корзину?')) {
            this.cart.clear();
        }
    }

    /**
     * Обработка сохранения корзины
     * @private
     */
    _handleSave() {
        // Manual save trigger
        if (this.cart.storage) {
            this.cart._saveToStorage();
            this._showNotification('Корзина сохранена', 'success');
        }
    }

    /**
     * Показ уведомления
     * @param {string} message - Текст сообщения
     * @param {string} type - Тип уведомления
     * @private
     */
    _showNotification(message, type = 'info') {
        // Integration with existing notification system
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`[CartUI] ${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Экранирование HTML
     * @param {string} text - Текст для экранирования
     * @returns {string}
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Получение отладочной информации UI
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            isVisible: this.isVisible,
            isAnimating: this.isAnimating,
            hasContainer: !!this.container,
            hasBadge: !!this.badge,
            hasToggleButton: !!this.toggleButton,
            containerInDOM: this.container && document.contains(this.container)
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartUI;
}
