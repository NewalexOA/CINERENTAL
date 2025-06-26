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

        this.cart.on('itemDatesUpdated', (data) => {
            this.renderer.trackActivity('update_dates', data.item.name);
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
        // In embedded mode, close button should only minimize/collapse, not completely hide
        if (this.cartUI.isEmbedded) {
            console.log('[CartEventHandler] Close button clicked in embedded mode - minimizing cart');
            // For embedded mode, we could implement a minimize/collapse feature
            // For now, just keep it visible since it's part of the page flow
            return;
        } else {
            console.log('[CartEventHandler] Close button clicked in floating mode - hiding cart');
            this.cartUI.hide();
        }
    }

    /**
     * Handle outside click
     * @param {Event} e
     * @private
     */
    _handleOutsideClick(e) {
        // Only handle outside clicks for floating mode, not embedded mode
        if (this.cartUI.isVisible &&
            !this.cartUI.isEmbedded && // Don't hide embedded carts on outside click
            this.container &&
            !this.container.contains(e.target) &&
            e.target !== this.toggleButton &&
            !this.toggleButton?.contains(e.target)) {
            console.log('[CartEventHandler] Hiding cart due to outside click (floating mode)');
            this.cartUI.hide();
        }
    }

    /**
     * Handle escape key
     * @param {Event} e
     * @private
     */
    _handleKeyDown(e) {
        // Only handle Escape key for floating mode, not embedded mode
        if (e.key === 'Escape' && this.cartUI.isVisible && !this.cartUI.isEmbedded) {
            console.log('[CartEventHandler] Hiding cart due to Escape key (floating mode)');
            this.cartUI.hide();
        }
    }

    /**
     * Handle item control clicks (quantity buttons, remove, dates)
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
        } else if (e.target.closest('.date-display')) {
            this._handleDateEdit(itemKey);
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
     * Handle date editing for cart item
     * @param {string} itemKey - Item key
     * @private
     */
    _handleDateEdit(itemKey) {
        const item = this.cart.getItem(itemKey);
        if (!item) {
            console.error('[CartEventHandler] Item not found for date edit:', itemKey);
            return;
        }

        console.log('[CartEventHandler] Opening inline date edit for:', item.name);
        this._createInlineDatePicker(itemKey, item);
    }

    /**
     * Create inline date picker in place of date display
     * @param {string} itemKey - Item key
     * @param {Object} item - Cart item
     * @private
     */
    _createInlineDatePicker(itemKey, item) {
        // Find the date display element
        const dateDisplay = document.querySelector(`[data-item-key="${itemKey}"] .date-display`);
        if (!dateDisplay) {
            console.error('[CartEventHandler] Date display element not found for:', itemKey);
            return;
        }

        // Store original content
        const originalContent = dateDisplay.innerHTML;
        dateDisplay.dataset.originalContent = originalContent;

        // Create inline datepicker input
        const dateInput = document.createElement('input');
        dateInput.type = 'text';
        dateInput.className = 'form-control form-control-sm cart-date-input';
        dateInput.placeholder = 'ДД.ММ.ГГГГ - ДД.ММ.ГГГГ';
        dateInput.style.fontSize = '0.75em';
        dateInput.style.width = '160px';
        dateInput.style.minWidth = '160px';

        // Set current value
        if (item.custom_start_date && item.custom_end_date && typeof moment !== 'undefined') {
            dateInput.value = moment(item.custom_start_date).format('DD.MM.YYYY') + ' - ' + moment(item.custom_end_date).format('DD.MM.YYYY');
        } else {
            // Use project dates as default
            dateInput.value = this._getProjectDatesDisplay();
        }

        // Replace date display with input
        dateDisplay.innerHTML = '';
        dateDisplay.appendChild(dateInput);
        dateDisplay.style.cursor = 'default';

        // Initialize daterangepicker if available
        if (typeof $ !== 'undefined' && $.fn.daterangepicker) {
            $(dateInput).daterangepicker({
                autoUpdateInput: true,
                singleDatePicker: false,
                autoApply: false,
                locale: {
                    format: 'DD.MM.YYYY',
                    separator: ' - ',
                    applyLabel: 'Применить',
                    cancelLabel: 'Отмена',
                    fromLabel: 'От',
                    toLabel: 'До',
                    customRangeLabel: 'Настроить',
                    weekLabel: 'Н',
                    daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
                    monthNames: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                                'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
                    firstDay: 1
                }
            });

            // Handle apply
            $(dateInput).on('apply.daterangepicker', (ev, picker) => {
                const startDate = picker.startDate.hour(0).minute(0).format('YYYY-MM-DDTHH:mm:ss');
                const endDate = picker.endDate.hour(23).minute(59).format('YYYY-MM-DDTHH:mm:ss');

                console.log('[CartEventHandler] Applying new dates:', { startDate, endDate });

                // Update cart item dates
                this.cart.updateItemDates(itemKey, startDate, endDate);

                // Restore original display
                this._restoreInlineDateDisplay(dateDisplay, itemKey);
            });

            // Handle cancel
            $(dateInput).on('cancel.daterangepicker', () => {
                console.log('[CartEventHandler] Date picker cancelled');
                // Restore original display without changes
                this._restoreInlineDateDisplay(dateDisplay, itemKey);
            });

            // Handle hide (when clicking outside)
            $(dateInput).on('hide.daterangepicker', () => {
                console.log('[CartEventHandler] Date picker hidden');
                // Small delay to allow apply/cancel to execute first
                setTimeout(() => {
                    this._restoreInlineDateDisplay(dateDisplay, itemKey);
                }, 100);
            });

            // Auto-open datepicker
            $(dateInput).data('daterangepicker').show();

            // Focus input
            dateInput.focus();
        } else {
            console.warn('[CartEventHandler] daterangepicker not available');
            // Fallback - simple input behavior
            this._setupFallbackInputHandlers(dateInput, dateDisplay, itemKey);
        }
    }

    /**
     * Setup fallback input handlers when daterangepicker is not available
     * @private
     */
    _setupFallbackInputHandlers(dateInput, dateDisplay, itemKey) {
        dateInput.addEventListener('blur', () => {
            this._restoreInlineDateDisplay(dateDisplay, itemKey);
        });

        dateInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this._restoreInlineDateDisplay(dateDisplay, itemKey);
            } else if (e.key === 'Enter') {
                // Try to parse dates and update
                const value = dateInput.value.trim();
                if (value) {
                    const dates = this._parseDateRange(value);
                    if (dates) {
                        this.cart.updateItemDates(itemKey, dates.start, dates.end);
                    }
                }
                this._restoreInlineDateDisplay(dateDisplay, itemKey);
            }
        });

        dateInput.focus();
    }

    /**
     * Restore date display from inline editing
     * @private
     */
    _restoreInlineDateDisplay(dateDisplay, itemKey) {
        const originalContent = dateDisplay.dataset.originalContent;
        if (originalContent) {
            dateDisplay.innerHTML = originalContent;
            dateDisplay.style.cursor = 'pointer';
            delete dateDisplay.dataset.originalContent;

            // Re-attach click listener
            const newDateDisplay = dateDisplay.querySelector('.date-display') || dateDisplay;
            newDateDisplay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._handleDateEdit(itemKey);
            });
        }
    }

    /**
     * Get project dates display string
     * @private
     */
    _getProjectDatesDisplay() {
        // Try to get from project data
        if (window.projectData && window.projectData.start_date && window.projectData.end_date) {
            if (typeof moment !== 'undefined') {
                return moment(window.projectData.start_date).format('DD.MM.YYYY') + ' - ' + moment(window.projectData.end_date).format('DD.MM.YYYY');
            }
        }

        // Fallback
        return '27.06.2025 - 28.06.2025';
    }

    /**
     * Create date picker modal HTML
     * @returns {HTMLElement}
     * @private
     */
    _createDatePickerModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade cart-date-picker-modal';
        modal.id = 'cartDatePickerModal';
        modal.tabIndex = -1;
        modal.setAttribute('aria-labelledby', 'cartDatePickerModalLabel');
        modal.setAttribute('aria-hidden', 'true');

        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="cartDatePickerModalLabel">
                            <i class="fas fa-calendar-alt me-2"></i>
                            Настройка дат аренды
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
                    </div>
                    <div class="modal-body">
                        <div class="equipment-info mb-3">
                            <h6 id="modalEquipmentName" class="mb-1"></h6>
                            <small class="text-muted" id="modalEquipmentCategory"></small>
                        </div>

                        <div class="date-options">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="dateOption" id="useProjectDates" value="project" checked>
                                <label class="form-check-label" for="useProjectDates">
                                    <strong>Использовать даты проекта</strong>
                                    <div class="small text-muted" id="projectDatesDisplay">Загрузка...</div>
                                </label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="dateOption" id="useCustomDates" value="custom">
                                <label class="form-check-label" for="useCustomDates">
                                    <strong>Указать кастомные даты</strong>
                                    <div class="small text-muted">Установить индивидуальные даты для этой позиции</div>
                                </label>
                            </div>
                        </div>

                        <div class="custom-date-inputs" id="customDateInputs" style="display: none;">
                            <label class="form-label">Период аренды:</label>
                            <input type="text" class="form-control" id="customDateRange"
                                   placeholder="ДД.ММ.ГГГГ - ДД.ММ.ГГГГ">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-primary" id="saveDateBtn">Сохранить</button>
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Populate modal with item data
     * @param {HTMLElement} modal - Modal element
     * @param {string} itemKey - Item key
     * @param {Object} item - Cart item
     * @private
     */
    _populateModal(modal, itemKey, item) {
        // Store item key in modal for later use
        modal.dataset.itemKey = itemKey;

        // Set equipment info
        modal.querySelector('#modalEquipmentName').textContent = item.name || 'Неизвестное оборудование';
        modal.querySelector('#modalEquipmentCategory').textContent = item.category || 'Без категории';

        // Get project dates
        const projectDates = this._getProjectDates();
        const projectDatesDisplay = modal.querySelector('#projectDatesDisplay');

        if (projectDates.start && projectDates.end) {
            const startFormatted = this._formatDate(projectDates.start);
            const endFormatted = this._formatDate(projectDates.end);
            projectDatesDisplay.textContent = `${startFormatted} - ${endFormatted}`;
        } else {
            projectDatesDisplay.textContent = 'Даты проекта не установлены';
        }

        // Set current selection
        const useProjectDates = modal.querySelector('#useProjectDates');
        const useCustomDates = modal.querySelector('#useCustomDates');
        const customDateInputs = modal.querySelector('#customDateInputs');
        const customDateRange = modal.querySelector('#customDateRange');

        if (item.use_project_dates !== false) {
            useProjectDates.checked = true;
            customDateInputs.style.display = 'none';
        } else {
            useCustomDates.checked = true;
            customDateInputs.style.display = 'block';

            // Set custom dates if available
            if (item.custom_start_date && item.custom_end_date) {
                const startFormatted = this._formatDate(item.custom_start_date);
                const endFormatted = this._formatDate(item.custom_end_date);
                customDateRange.value = `${startFormatted} - ${endFormatted}`;
            }
        }

        // Setup event listeners
        this._setupModalEventListeners(modal);
    }

    /**
     * Setup event listeners for modal
     * @param {HTMLElement} modal - Modal element
     * @private
     */
    _setupModalEventListeners(modal) {
        // Radio button change
        const dateOptions = modal.querySelectorAll('input[name="dateOption"]');
        const customDateInputs = modal.querySelector('#customDateInputs');

        dateOptions.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'custom') {
                    customDateInputs.style.display = 'block';
                    this._initializeDatePicker(modal);
                } else {
                    customDateInputs.style.display = 'none';
                }
            });
        });

        // Save button
        const saveBtn = modal.querySelector('#saveDateBtn');
        saveBtn.addEventListener('click', () => this._saveDates(modal));

        // Initialize date picker if custom dates are selected
        if (modal.querySelector('#useCustomDates').checked) {
            this._initializeDatePicker(modal);
        }
    }

    /**
     * Initialize date picker for custom dates
     * @param {HTMLElement} modal - Modal element
     * @private
     */
    _initializeDatePicker(modal) {
        const dateRangeInput = modal.querySelector('#customDateRange');

        // Check if daterangepicker is available
        if (typeof $ !== 'undefined' && $.fn.daterangepicker) {
            $(dateRangeInput).daterangepicker({
                autoUpdateInput: false,
                locale: {
                    format: 'DD.MM.YYYY',
                    separator: ' - ',
                    applyLabel: 'Применить',
                    cancelLabel: 'Отмена',
                    fromLabel: 'С',
                    toLabel: 'По',
                    customRangeLabel: 'Выбрать',
                    weekLabel: 'Н',
                    daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
                    monthNames: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                               'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
                    firstDay: 1
                }
            });

            $(dateRangeInput).on('apply.daterangepicker', function(ev, picker) {
                $(this).val(picker.startDate.format('DD.MM.YYYY') + ' - ' + picker.endDate.format('DD.MM.YYYY'));
            });

            $(dateRangeInput).on('cancel.daterangepicker', function(ev, picker) {
                $(this).val('');
            });
        }
    }

    /**
     * Save dates from modal
     * @param {HTMLElement} modal - Modal element
     * @private
     */
    _saveDates(modal) {
        const itemKey = modal.dataset.itemKey;
        const useProjectDates = modal.querySelector('#useProjectDates').checked;

        if (useProjectDates) {
            // Reset to project dates
            this.cart.updateItemDates(itemKey, null, null);
        } else {
            // Use custom dates
            const customDateRange = modal.querySelector('#customDateRange').value;

            if (!customDateRange) {
                this.cartUI._showNotification('Выберите период аренды', 'warning');
                return;
            }

            // Parse date range
            const dates = this._parseDateRange(customDateRange);
            if (!dates) {
                this.cartUI._showNotification('Неверный формат дат', 'error');
                return;
            }

            this.cart.updateItemDates(itemKey, dates.start, dates.end);
        }

        // Close modal
        const bsModal = bootstrap.Modal.getInstance(modal);
        bsModal.hide();

        this.cartUI._showNotification('Даты обновлены', 'success');
    }

    /**
     * Parse date range string
     * @param {string} dateRange - Date range string (DD.MM.YYYY - DD.MM.YYYY)
     * @returns {Object|null} Parsed dates or null if invalid
     * @private
     */
    _parseDateRange(dateRange) {
        try {
            const parts = dateRange.split(' - ');
            if (parts.length !== 2) return null;

            const startDate = moment(parts[0], 'DD.MM.YYYY');
            const endDate = moment(parts[1], 'DD.MM.YYYY');

            if (!startDate.isValid() || !endDate.isValid()) return null;

            return {
                start: startDate.format('YYYY-MM-DD'),
                end: endDate.format('YYYY-MM-DD')
            };
        } catch (error) {
            console.error('Error parsing date range:', error);
            return null;
        }
    }

    /**
     * Get project dates
     * @returns {Object}
     * @private
     */
    _getProjectDates() {
        if (typeof window !== 'undefined' && window.projectData) {
            return {
                start: window.projectData.start_date,
                end: window.projectData.end_date
            };
        }
        return { start: null, end: null };
    }

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string}
     * @private
     */
    _formatDate(dateString) {
        if (!dateString) return '';

        try {
            if (typeof moment !== 'undefined') {
                return moment(dateString).format('DD.MM.YYYY');
            } else {
                const date = new Date(dateString);
                return date.toLocaleDateString('ru-RU');
            }
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
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
