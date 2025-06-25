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

        const data = {
            itemKey,
            id: item.id || '',
            name: this.templates.escapeHtml(item.name),
            barcode: this.templates.escapeHtml(item.barcode || 'Нет'),
            category: this.templates.escapeHtml(item.category || 'Без категории'),
            quantity,
            dailyCost: dailyCost.toLocaleString('ru-RU'),
            totalCost: totalCost.toLocaleString('ru-RU'),

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
     * Update items list
     * @param {HTMLElement} itemsListElement - Items list container
     */
    updateItemsList(itemsListElement) {
        const items = this.cart.getItems();

        if (items.length === 0) {
            itemsListElement.innerHTML = this.templates.getEmptyStateTemplate();
        } else {
            itemsListElement.innerHTML = items.map(item =>
                this.renderItem(item)
            ).join('');
        }
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
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartRenderer;
}

// Global export for browser usage
if (typeof window !== 'undefined') {
    window.CartRenderer = CartRenderer;
}
