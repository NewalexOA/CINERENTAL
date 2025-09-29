/**
 * Cart Renderer Module
 * Handles rendering of cart UI elements
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

class CartRenderer {
    /**
     * @param {Object} cart - UniversalCart instance
     * @param {Object} templates - CartTemplates instance
     * @param {Object} config - Configuration object
     */
    constructor(cart, templates, config = {}) {
        this.cart = cart;
        this.templates = templates;
        this.config = config;

        console.log('[CartRenderer] Constructor called with config:', {
            renderMode: config.renderMode,
            showCostInfo: config.showCostInfo,
            config
        });

        // Activity tracking
        this._previousItemCount = 0;
        this._lastAction = null;
    }

    /**
     * Render single cart item
     * @param {Object} item - Equipment item
     * @returns {string}
     */
    renderItem(item) {
        const itemKey = this.cart._generateItemKey(item);
        const quantity = item.quantity || 1;
        const hasSerial = !!item.serial_number;
        const dailyCost = item.daily_cost || 0;
        const totalCost = dailyCost * quantity;

        // Get dates display
        const datesInfo = this._getItemDatesDisplay(item);

        const data = {
            itemKey,
            id: item.id || '',
            name: this.templates.escapeHtml(item.name),
            barcode: this.templates.escapeHtml(item.barcode || 'Нет'),
            category: this.templates.escapeHtml(item.category || 'Без категории'),
            quantity,
            dailyCost: dailyCost.toLocaleString('ru-RU'),
            totalCost: totalCost.toLocaleString('ru-RU'),

            // Dates information
            dates_display: datesInfo.display,
            use_project_dates: datesInfo.useProjectDates,
            custom_dates: datesInfo.customDates,

            // Conditionals
            serial_number: item.serial_number,
            replacement_cost: item.replacement_cost,
            hasSerial,
            noSerial: !hasSerial,
            quantityOne: quantity === 1,
            quantityMultiple: quantity > 1,
            showCostInfo: this.config.showCostInfo && dailyCost > 0
        };

        return this.templates.processTemplate(
            this.templates.getCartItemTemplate(),
            data
        );
    }

    /**
     * Get item dates display information
     * @param {Object} item - Equipment item
     * @returns {Object} Dates display info
     * @private
     */
    _getItemDatesDisplay(item) {
        // Check if item has explicit start_date and end_date (from test data or booking)
        if (item.start_date && item.end_date) {
            const startFormatted = this._formatDateWithTime(item.start_date, true); // true for start date
            const endFormatted = this._formatDateWithTime(item.end_date, false); // false for end date
            return {
                display: `${startFormatted} - ${endFormatted}`,
                useProjectDates: false,
                customDates: true
            };
        }

        const useProjectDates = item.use_project_dates !== false;

        if (useProjectDates) {
            // Use project dates
            const projectDates = this._getProjectDates();
            if (projectDates.start && projectDates.end) {
                const startFormatted = this._formatDateWithTime(projectDates.start, true);
                const endFormatted = this._formatDateWithTime(projectDates.end, false);
                return {
                    display: `${startFormatted} - ${endFormatted}`,
                    useProjectDates: true,
                    customDates: false
                };
            } else {
                return {
                    display: 'Даты проекта не установлены',
                    useProjectDates: true,
                    customDates: false
                };
            }
        } else {
            // Use custom dates
            if (item.custom_start_date && item.custom_end_date) {
                const startFormatted = this._formatDateWithTime(item.custom_start_date, true);
                const endFormatted = this._formatDateWithTime(item.custom_end_date, false);
                return {
                    display: `${startFormatted} - ${endFormatted}`,
                    useProjectDates: false,
                    customDates: true
                };
            } else {
                return {
                    display: 'Кастомные даты не установлены',
                    useProjectDates: false,
                    customDates: true
                };
            }
        }
    }

    /**
     * Get project dates from window.projectData
     * @returns {Object} Project dates
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
     * Format date for display with time (for daterangepicker compatibility)
     * @param {string} dateString - ISO date string
     * @param {boolean} isStartDate - Whether this is a start date (affects default time)
     * @returns {string} Formatted date with time
     * @private
     */
    _formatDateWithTime(dateString, isStartDate = true) {
        if (!dateString) return '';

        try {
            // Check if moment is available (as in the existing project)
            if (typeof moment !== 'undefined') {
                const date = moment(dateString);
                // If the date doesn't have time, add default times
                if (date.format('HH:mm') === '00:00') {
                    if (isStartDate) {
                        return date.hour(0).minute(0).format('DD.MM.YYYY HH:mm');
                    } else {
                        return date.hour(23).minute(59).format('DD.MM.YYYY HH:mm');
                    }
                }
                return date.format('DD.MM.YYYY HH:mm');
            } else {
                // Fallback to native Date
                const date = new Date(dateString);
                // If time is midnight, set appropriate default time
                if (date.getHours() === 0 && date.getMinutes() === 0) {
                    if (!isStartDate) {
                        date.setHours(23, 59);
                    }
                }
                return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            }
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }

    /**
     * Format date for display (legacy method for backward compatibility)
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date with time
     * @private
     */
    _formatDate(dateString) {
        return this._formatDateWithTime(dateString, true);
    }

    /**
     * Update cart summary
     * @param {HTMLElement} summaryElement - Summary container
     */
    updateSummary(summaryElement) {
        const items = this.cart.getItems();
        const itemCount = this.cart.getItemCount();
        const totalQuantity = this.cart.getTotalQuantity();
        const maxItems = this.config.maxItems;

        // Calculate statistics
        const serialCount = items.filter(item => item.serial_number).length;
        const dailyCost = items.reduce((sum, item) =>
            sum + ((item.daily_cost || 0) * (item.quantity || 1)), 0);
        const replacementCost = items.reduce((sum, item) =>
            sum + ((item.replacement_cost || 0) * (item.quantity || 1)), 0);

        // Progress calculations
        const progressPercent = maxItems > 0 ? Math.round((itemCount / maxItems) * 100) : 0;
        const progressBarClass = progressPercent >= 90 ? 'bg-danger' :
                                 progressPercent >= 70 ? 'bg-warning' : 'bg-success';

        // Trend analysis
        const prevCount = this._previousItemCount || 0;
        const itemCountTrend = itemCount > prevCount ? 'up' :
                              itemCount < prevCount ? 'down' : null;
        const itemCountTrendIcon = itemCountTrend === 'up' ? 'up' : 'down';

        // Store for next comparison
        this._previousItemCount = itemCount;

        const data = {
            itemCount,
            totalQuantity,
            serialCount,
            maxItems,
            dailyCost: dailyCost.toLocaleString('ru-RU'),
            replacementCost: replacementCost.toLocaleString('ru-RU'),
            progressPercent,
            progressBarClass,
            itemCountTrend,
            itemCountTrendIcon,
            lastActivity: this._getLastActivity(),

            // Conditionals
            maxItemsWarning: itemCount >= maxItems * 0.9,
            highCostWarning: dailyCost > 10000,
            showCostSummary: this.config.showCostInfo && (dailyCost > 0 || replacementCost > 0),
            showLimitProgress: maxItems > 0 && itemCount > 0,
            showRecentActivity: this.config.showActivity && this._lastAction
        };

        summaryElement.innerHTML = this.templates.processTemplate(
            this.templates.getCartSummaryTemplate(),
            data
        );
    }

    /**
     * Update cart badge
     * @param {HTMLElement} badgeElement - Badge element
     */
    updateBadge(badgeElement) {
        if (!badgeElement) return;

        const count = this.cart.getItemCount();

        if (count > 0) {
            badgeElement.textContent = count;
            badgeElement.style.display = 'block';
        } else {
            badgeElement.style.display = 'none';
        }
    }

    /**
     * Update cart items list with mode-aware rendering
     * @param {HTMLElement} itemsListElement - Items container
     */
    updateItemsList(itemsListElement) {
        const items = this.cart.getItems();

        console.log('[CartRenderer] updateItemsList called:', {
            itemCount: items.length,
            renderMode: this.config.renderMode,
            element: itemsListElement
        });

        if (items.length === 0) {
            itemsListElement.innerHTML = this.templates.getEmptyStateTemplate();
            return;
        }

        // Choose rendering mode based on configuration
        switch (this.config.renderMode) {
            case 'table':
                console.log('[CartRenderer] Calling renderAsTable()');
                this.renderAsTable(itemsListElement, items);
                break;
            case 'compact':
                console.log('[CartRenderer] Calling renderAsCompact()');
                this.renderAsCompact(itemsListElement, items);
                break;
            default: // 'cards'
                console.log('[CartRenderer] Calling renderAsCards() (default)');
                this.renderAsCards(itemsListElement, items);
        }
    }

    /**
     * Render items as table
     * @param {HTMLElement} container - Container element
     * @param {Array} items - Equipment items
     */
    renderAsTable(container, items) {
        console.log('[CartRenderer] renderAsTable() starting:', {
            itemCount: items.length,
            container: container
        });

        // Create table structure
        const tableTemplate = this.templates.getTableTemplate();
        console.log('[CartRenderer] Got table template:', tableTemplate.substring(0, 200) + '...');
        container.innerHTML = tableTemplate;

        // Find table body and populate with rows
        const tableBody = container.querySelector('.table-body');
        console.log('[CartRenderer] Table body found:', !!tableBody);

        if (tableBody) {
            const rows = items.map(item => {
                const row = this.renderTableRow(item);
                console.log('[CartRenderer] Generated row for item:', {
                    itemId: item.id,
                    rowSnippet: row.substring(0, 100) + '...'
                });
                return row;
            }).join('');
            tableBody.innerHTML = rows;
            console.log('[CartRenderer] Table rows inserted, total HTML length:', rows.length);
        }

        // Initialize daterangepicker for period inputs and hook change -> custom dates
        this._initializeDateRangePickers(container);

        // After render, re-log number of date displays for diagnostics
        const dd = container.querySelectorAll('.booking-period-input');
        console.log('[CartRenderer] booking-period-input count:', dd.length);

        // Bind apply event to persist dates into item (custom dates) immediately
        const tableBodyEl = container.querySelector('.table-body');
        if (tableBodyEl) {
            const inputs = tableBodyEl.querySelectorAll('.booking-period-input');
            console.log('[CartRenderer] binding apply handlers for inputs:', inputs.length);
            inputs.forEach((input) => {
                $(input).off('apply.daterangepicker').on('apply.daterangepicker', (ev, picker) => {
                    const row = input.closest('tr[data-item-key]');
                    if (!row) return;
                    const itemKey = row.getAttribute('data-item-key');
                    // Update cart item dates as custom
                    if (typeof this.cart.updateItemDates === 'function') {
                        this.cart.updateItemDates(itemKey, picker.startDate.format('YYYY-MM-DDTHH:mm:ss'), picker.endDate.format('YYYY-MM-DDTHH:mm:ss'));
                    }
                    // Update input display
                    input.value = `${picker.startDate.format('DD.MM.YYYY HH:mm')} - ${picker.endDate.format('DD.MM.YYYY HH:mm')}`;
                });
            });
        }

        // Track activity
        this.trackActivity('table_render', `${items.length} items`);
        console.log('[CartRenderer] renderAsTable() completed');
    }

    /**
     * Render single table row
     * @param {Object} item - Equipment item
     * @returns {string}
     */
    renderTableRow(item) {
        const itemKey = this.cart._generateItemKey(item);
        const quantity = item.quantity || 1;
        const hasSerial = !!item.serial_number;

        // Get dates display
        const datesInfo = this._getItemDatesDisplay(item);

        const data = {
            itemKey,
            id: item.id || '',
            name: this.templates.escapeHtml(item.name),
            barcode: this.templates.escapeHtml(item.barcode || 'Нет'),
            category: this.templates.escapeHtml(item.category || 'Без категории'),
            quantity,

            // Dates information
            dates_display: datesInfo.display,
            periodDisplay: datesInfo.display,
            use_project_dates: datesInfo.useProjectDates,
            custom_dates: datesInfo.customDates,

            // Conditionals for template
            serial_number: item.serial_number,
            serialNumber: item.serial_number,
            hasSerial,
            noSerial: !hasSerial,
            hasMultiple: quantity > 1 && !hasSerial,
            quantityOne: quantity === 1,
            quantityMultiple: quantity > 1,
            quantityMoreThanOne: quantity > 1,
            showQuantityControls: this.config.showQuantityControls && !hasSerial,
            showAdvancedControls: this.config.showAdvancedControls,
            showRemoveButtons: this.config.showRemoveButtons
        };

        return this.templates.processTemplate(
            this.templates.getTableRowTemplate(),
            data
        );
    }

    /**
     * Render items as compact cards
     * @param {HTMLElement} container - Container element
     * @param {Array} items - Equipment items
     */
    renderAsCompact(container, items) {
        const compactItems = items.map(item => this.renderCompactItem(item)).join('');
        container.innerHTML = `<div class="compact-items-list">${compactItems}</div>`;

        // Track activity
        this.trackActivity('compact_render', `${items.length} items`);
    }

    /**
     * Render single compact item
     * @param {Object} item - Equipment item
     * @returns {string}
     */
    renderCompactItem(item) {
        const itemKey = this.cart._generateItemKey(item);
        const quantity = item.quantity || 1;
        const hasSerial = !!item.serial_number;

        return `
            <div class="compact-item border-bottom py-2" data-item-key="${itemKey}">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <div class="fw-semibold">${this.templates.escapeHtml(item.name)}</div>
                        <small class="text-muted">${this.templates.escapeHtml(item.barcode || 'Нет')}</small>
                        ${hasSerial ? `<span class="badge bg-light text-dark ms-2">S/N: ${item.serial_number}</span>` : ''}
                    </div>
                    <div class="d-flex align-items-center">
                        ${hasSerial ?
                            '<span class="badge bg-primary me-2">1</span>' :
                            `<span class="badge bg-secondary me-2">${quantity}</span>`
                        }
                        ${this.config.showRemoveButtons ?
                            '<button type="button" class="btn btn-outline-danger btn-sm cart-item-remove"><i class="fas fa-times fa-xs"></i></button>' :
                            ''
                        }
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render items as cards (original behavior)
     * @param {HTMLElement} container - Container element
     * @param {Array} items - Equipment items
     */
    renderAsCards(container, items) {
        const cardItems = items.map(item => this.renderItem(item)).join('');
        container.innerHTML = cardItems;

        // Track activity
        this.trackActivity('cards_render', `${items.length} items`);
    }

    /**
     * Update action buttons state
     * @param {HTMLElement} container - Cart container
     */
    updateActionButtons(container) {
        const primaryAction = container.querySelector('.cart-action-primary');
        const clearBtn = container.querySelector('.cart-clear');

        const isEmpty = this.cart.isEmpty();

        if (primaryAction) {
            primaryAction.disabled = isEmpty;
        }

        if (clearBtn) {
            clearBtn.disabled = isEmpty;
        }
    }

    /**
     * Track user activity for display
     * @param {string} type - Activity type
     * @param {string} itemName - Item name (optional)
     */
    trackActivity(type, itemName = '') {
        this._lastAction = {
            type,
            itemName,
            timestamp: new Date()
        };
    }

    /**
     * Get last activity description
     * @returns {string}
     * @private
     */
    _getLastActivity() {
        const lastAction = this._lastAction;
        if (!lastAction) return '';

        const timeAgo = this._getTimeAgo(lastAction.timestamp);

        switch (lastAction.type) {
            case 'add':
                return `Добавлен "${lastAction.itemName}" ${timeAgo}`;
            case 'remove':
                return `Удален "${lastAction.itemName}" ${timeAgo}`;
            case 'update':
                return `Изменено количество ${timeAgo}`;
            case 'clear':
                return `Корзина очищена ${timeAgo}`;
            default:
                return `Действие ${timeAgo}`;
        }
    }

    /**
     * Get human-readable time ago
     * @param {Date} timestamp
     * @returns {string}
     * @private
     */
    _getTimeAgo(timestamp) {
        if (!timestamp) return '';

        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'только что';
        if (minutes < 60) return `${minutes} мин назад`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} ч назад`;

        return 'давно';
    }

    /**
     * Get debug information
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            module: 'CartRenderer',
            itemCount: this.cart.getItemCount(),
            lastActivity: this._lastAction,
            previousItemCount: this._previousItemCount,
            config: this.config
        };
    }



    /**
     * Initialize daterangepicker for booking period inputs
     * @param {HTMLElement} container - Container element with input fields
     * @private
     */
    _initializeDateRangePickers(container) {
        if (!container) {
            console.warn('[CartRenderer] _initializeDateRangePickers: container is undefined');
            return;
        }

        const periodInputs = container.querySelectorAll('.booking-period-input');

        periodInputs.forEach(input => {
            // Skip if already initialized
            if ($(input).data('daterangepicker')) {
                return;
            }

            // Get current value to parse existing dates
            const currentValue = input.value;
            let initialStartDate, initialEndDate;

            if (currentValue && currentValue.includes(' - ')) {
                const [startStr, endStr] = currentValue.split(' - ');

                // Parse with the exact format DD.MM.YYYY HH:mm
                initialStartDate = moment(startStr, 'DD.MM.YYYY HH:mm', true);
                initialEndDate = moment(endStr, 'DD.MM.YYYY HH:mm', true);

                // If parsing with time fails, try without time
                if (!initialStartDate.isValid()) {
                    initialStartDate = moment(startStr, 'DD.MM.YYYY', true);
                }
                if (!initialEndDate.isValid()) {
                    initialEndDate = moment(endStr, 'DD.MM.YYYY', true);
                }
            }

            // Get locale from global scope or fallback
            const locale = (typeof DATERANGEPICKER_LOCALE_WITH_TIME !== 'undefined')
                ? DATERANGEPICKER_LOCALE_WITH_TIME
                : {
                    format: 'DD.MM.YYYY HH:mm',
                    applyLabel: 'Применить',
                    cancelLabel: 'Отмена',
                    fromLabel: 'С',
                    toLabel: 'По',
                    customRangeLabel: 'Произвольный период',
                    daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
                    monthNames: [
                        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
                    ],
                    firstDay: 1
                };

            // Configure date picker with time support
            const options = {
                timePicker: true,
                timePicker24Hour: true,
                timePickerIncrement: 1,
                showDropdowns: true,
                autoUpdateInput: true,
                locale: locale
            };

            // Add initial dates if they exist and are valid
            if (initialStartDate && initialStartDate.isValid() &&
                initialEndDate && initialEndDate.isValid()) {
                options.startDate = initialStartDate;
                options.endDate = initialEndDate;
            } else {
                // Use default times if no existing data
                options.startDate = moment().hour(0).minute(0);
                options.endDate = moment().hour(23).minute(59);
            }

            $(input).daterangepicker(options);

            // Set the correct display value after initialization
            const picker = $(input).data('daterangepicker');
            if (picker && picker.startDate && picker.endDate) {
                const displayValue = picker.startDate.format('DD.MM.YYYY HH:mm') + ' - ' + picker.endDate.format('DD.MM.YYYY HH:mm');
                $(input).val(displayValue);
            }

            // Handle apply event
            $(input).on('apply.daterangepicker', (ev, picker) => {
                const itemId = input.getAttribute('data-item-id');
                const displayValue = picker.startDate.format('DD.MM.YYYY HH:mm') + ' - ' + picker.endDate.format('DD.MM.YYYY HH:mm');
                $(input).val(displayValue);

                // Trigger custom event for cart to handle
                container.dispatchEvent(new CustomEvent('cartItemDateChanged', {
                    detail: {
                        itemId: itemId,
                        startDate: picker.startDate.format('YYYY-MM-DDTHH:mm:ss'),
                        endDate: picker.endDate.format('YYYY-MM-DDTHH:mm:ss')
                    }
                }));
            });

            // Handle cancel event
            $(input).on('cancel.daterangepicker', (ev, picker) => {
                $(input).val($(input).attr('value')); // Restore original value
            });
        });
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartRenderer;
}

// Global export for browser usage
if (typeof window !== 'undefined') {
    window.CartRenderer = CartRenderer;
}
