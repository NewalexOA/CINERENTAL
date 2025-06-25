/**
 * Cart Templates Module
 * Handles all HTML template generation for Universal Cart
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

class CartTemplates {
    /**
     * @param {Object} config - Configuration object
     */
    constructor(config = {}) {
        this.config = config;
    }

    /**
     * Main cart container template
     * @returns {string}
     */
    getCartTemplate() {
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
     * Cart item template
     * @returns {string}
     */
    getCartItemTemplate() {
        return `
            <div class="cart-item border-bottom p-3" data-item-key="{{itemKey}}">
                <div class="d-flex align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">
                            <a href="/equipment/{{id}}" target="_blank" class="text-decoration-none text-dark">
                                {{name}}
                            </a>
                        </h6>
                        <small class="text-muted d-block">
                            <i class="fas fa-barcode me-1"></i>{{barcode}}
                        </small>
                        <small class="text-muted">{{category}}</small>
                        {{#serial_number}}
                        <div class="badge bg-light text-dark mt-1">
                            <i class="fas fa-tag me-1"></i>S/N: {{serial_number}}
                        </div>
                        {{/serial_number}}
                        {{#replacement_cost}}
                        <div class="small text-muted mt-1">
                            <i class="fas fa-ruble-sign me-1"></i>{{replacement_cost}} ₽
                        </div>
                        {{/replacement_cost}}
                    </div>
                    <div class="cart-item-controls d-flex align-items-center ms-3">
                        {{#hasSerial}}
                        <!-- Equipment with serial number - only remove button -->
                        <div class="quantity-display me-2">
                            <span class="badge bg-primary fs-6">1</span>
                        </div>
                        <button type="button" class="btn btn-outline-danger btn-sm cart-item-remove"
                                title="Удалить из корзины">
                            <i class="fas fa-times"></i>
                        </button>
                        {{/hasSerial}}
                        {{#noSerial}}
                        <!-- Equipment without serial number - quantity controls -->
                        <div class="quantity-controls me-2">
                            <div class="input-group input-group-sm" style="width: 120px;">
                                <button class="btn btn-outline-secondary quantity-decrease" type="button"
                                        title="Уменьшить количество" {{#quantityOne}}disabled{{/quantityOne}}>
                                    {{#quantityOne}}
                                    <i class="fas fa-trash"></i>
                                    {{/quantityOne}}
                                    {{#quantityMultiple}}
                                    <i class="fas fa-minus"></i>
                                    {{/quantityMultiple}}
                                </button>
                                <input type="number" class="form-control text-center quantity-input fw-bold"
                                       value="{{quantity}}" min="1" max="99" readonly>
                                <button class="btn btn-outline-secondary quantity-increase" type="button"
                                        title="Увеличить количество">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        {{#quantityOne}}
                        <button type="button" class="btn btn-outline-danger btn-sm cart-item-remove ms-2"
                                title="Удалить из корзины">
                            <i class="fas fa-times"></i>
                        </button>
                        {{/quantityOne}}
                        {{/noSerial}}
                    </div>
                </div>
                {{#showCostInfo}}
                <div class="cart-item-cost mt-2 pt-2 border-top">
                    <small class="text-muted">
                        <i class="fas fa-calculator me-1"></i>
                        Стоимость: {{dailyCost}} ₽/день × {{quantity}} = {{totalCost}} ₽/день
                    </small>
                </div>
                {{/showCostInfo}}
            </div>
        `;
    }

    /**
     * Cart summary template
     * @returns {string}
     */
    getCartSummaryTemplate() {
        return `
            <div class="cart-summary-content">
                <!-- Main Statistics -->
                <div class="row text-center mb-3">
                    <div class="col-4">
                        <div class="summary-stat">
                            <div class="h4 mb-1 text-primary position-relative">
                                {{itemCount}}
                                {{#itemCountTrend}}
                                <span class="trend-indicator trend-{{itemCountTrend}}">
                                    <i class="fas fa-arrow-{{itemCountTrendIcon}} fa-xs"></i>
                                </span>
                                {{/itemCountTrend}}
                            </div>
                            <small class="text-muted">позиций</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="summary-stat">
                            <div class="h4 mb-1 text-success">{{totalQuantity}}</div>
                            <small class="text-muted">единиц</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="summary-stat">
                            <div class="h4 mb-1 text-info">{{serialCount}}</div>
                            <small class="text-muted">с S/N</small>
                        </div>
                    </div>
                </div>

                <!-- Cost Information -->
                {{#showCostSummary}}
                <div class="cart-cost-summary p-3 bg-light rounded mb-3">
                    <div class="row text-center">
                        <div class="col-6">
                            <div class="cost-stat">
                                <div class="h5 mb-1 text-warning">
                                    <i class="fas fa-ruble-sign me-1"></i>{{dailyCost}}
                                </div>
                                <small class="text-muted">₽/день</small>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="cost-stat">
                                <div class="h5 mb-1 text-secondary">
                                    <i class="fas fa-shield-alt me-1"></i>{{replacementCost}}
                                </div>
                                <small class="text-muted">₽ страховка</small>
                            </div>
                        </div>
                    </div>
                </div>
                {{/showCostSummary}}

                <!-- Progress Bar for Item Limit -->
                {{#showLimitProgress}}
                <div class="limit-progress mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <small class="text-muted">Заполнение корзины</small>
                        <small class="text-muted">{{itemCount}}/{{maxItems}}</small>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar {{progressBarClass}}"
                             style="width: {{progressPercent}}%"
                             role="progressbar">
                        </div>
                    </div>
                </div>
                {{/showLimitProgress}}

                <!-- Alerts and Warnings -->
                {{#maxItemsWarning}}
                <div class="alert alert-warning alert-sm mb-2">
                    <i class="fas fa-exclamation-triangle me-1"></i>
                    Достигнут лимит: {{itemCount}}/{{maxItems}}
                </div>
                {{/maxItemsWarning}}

                {{#highCostWarning}}
                <div class="alert alert-info alert-sm mb-2">
                    <i class="fas fa-info-circle me-1"></i>
                    Высокая стоимость аренды: {{dailyCost}} ₽/день
                </div>
                {{/highCostWarning}}

                <!-- Recent Activity -->
                {{#showRecentActivity}}
                <div class="recent-activity mt-2">
                    <small class="text-muted d-block mb-1">
                        <i class="fas fa-clock me-1"></i>Последнее действие
                    </small>
                    <small class="text-muted">{{lastActivity}}</small>
                </div>
                {{/showRecentActivity}}
            </div>
        `;
    }

    /**
     * Empty state template
     * @returns {string}
     */
    getEmptyStateTemplate() {
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
     * Progress overlay template
     * @param {string} message - Progress message
     * @param {number} percent - Progress percentage
     * @returns {string}
     */
    getProgressTemplate(message = 'Обработка...', percent = 0) {
        return `
            <div class="cart-progress-overlay" id="cart-progress-overlay">
                <div class="progress-content">
                    <div class="progress-spinner"></div>
                    <div class="progress-message">${message}</div>
                    <div class="progress">
                        <div class="progress-bar"
                             role="progressbar"
                             style="width: ${percent}%"
                             aria-valuenow="${percent}"
                             aria-valuemin="0"
                             aria-valuemax="100">
                            ${percent}%
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Process template with conditional logic
     * @param {string} template - Template string
     * @param {Object} data - Data object
     * @returns {string}
     */
    processTemplate(template, data) {
        let result = template;

        // Handle conditionals first
        const conditionals = this._extractConditionals(template);

        conditionals.forEach(conditional => {
            const { tag, content } = conditional;
            const pattern = new RegExp(`\\{\\{#${tag}\\}\\}(.*?)\\{\\{\\/${tag}\\}\\}`, 'gs');

            result = result.replace(pattern, data[tag] ? content : '');
        });

        // Handle simple value replacements
        Object.keys(data).forEach(key => {
            const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            result = result.replace(pattern, data[key] || '');
        });

        return result;
    }

    /**
     * Extract conditional blocks from template
     * @param {string} template - Template string
     * @returns {Array}
     * @private
     */
    _extractConditionals(template) {
        const conditionals = [];
        const pattern = /\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs;
        let match;

        while ((match = pattern.exec(template)) !== null) {
            conditionals.push({
                tag: match[1],
                content: match[2]
            });
        }

        return conditionals;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string}
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartTemplates;
}

// Global export for browser usage
if (typeof window !== 'undefined') {
    window.CartTemplates = CartTemplates;
}
