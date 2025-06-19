/**
 * Equipment Theme for Pagination Component
 * Специальная тема для страницы оборудования с форматом:
 * "Показано 1-20 из 300. [20▼] [<] 1 из 15 [>]"
 */

import { formatNumber } from '../utils/helpers.js';
import { CSS_CLASSES, DATA_ATTRIBUTES, ACTIONS } from '../utils/constants.js';

/**
 * Equipment theme implementation - кастомная тема для страницы оборудования
 */
export class EquipmentTheme {
    constructor() {
        this.name = 'equipment';
        this.description = 'Кастомная тема для страницы оборудования с селектором размера страницы';
    }

    /**
     * Generates equipment pagination HTML
     * @param {Object} state - Pagination state
     * @param {Object} options - Theme options
     * @returns {string} HTML string
     */
    render(state, options = {}) {
        const {
            currentPage,
            totalPages,
            totalItems,
            pageSize,
            startItem,
            endItem,
            hasNext,
            hasPrev
        } = state;

        const {
            showPageSizeSelect = true,
            pageSizes = [20, 50, 100],
            className = '',
            id = ''
        } = options;

        return `
            <div class="${CSS_CLASSES.CONTAINER} equipment-pagination ${className}" ${id ? `id="${id}"` : ''}>
                ${this._renderRecordsInfo(state)}
                ${this._renderControls(state, { showPageSizeSelect, pageSizes })}
            </div>
        `;
    }

    /**
     * Renders records information ("Показано 1-20 из 300.")
     * @private
     * @param {Object} state - Pagination state
     * @returns {string} HTML string
     */
    _renderRecordsInfo(state) {
        const { startItem, endItem, totalItems } = state;

        if (totalItems === 0) {
            return `
                <div class="${CSS_CLASSES.INFO} equipment-records-info">
                    <span class="text-muted">Нет записей.</span>
                </div>
            `;
        }

        return `
            <div class="${CSS_CLASSES.INFO} equipment-records-info">
                <span>Показано ${formatNumber(startItem)}-${formatNumber(endItem)} из ${formatNumber(totalItems)}.</span>
            </div>
        `;
    }

    /**
     * Renders controls (page size selector + navigation)
     * @private
     * @param {Object} state - Pagination state
     * @param {Object} options - Render options
     * @returns {string} HTML string
     */
    _renderControls(state, options) {
        const { showPageSizeSelect, pageSizes } = options;
        const { totalPages } = state;

        return `
            <div class="equipment-controls d-flex align-items-center gap-3">
                ${showPageSizeSelect ? this._renderPageSizeSelect(state.pageSize, pageSizes) : ''}
                ${totalPages > 1 ? this._renderNavigation(state) : ''}
            </div>
        `;
    }

    /**
     * Renders page size selector
     * @private
     * @param {number} currentPageSize - Current page size
     * @param {Array} availableSizes - Available page sizes
     * @returns {string} HTML string
     */
    _renderPageSizeSelect(currentPageSize, availableSizes) {
        return `
            <div class="equipment-page-size">
                <select class="form-select form-select-sm"
                        ${DATA_ATTRIBUTES.ACTION}="${ACTIONS.PAGE_SIZE}"
                        style="width: auto; min-width: 80px;">
                    ${availableSizes.map(size => `
                        <option value="${size}" ${size === currentPageSize ? 'selected' : ''}>
                            ${size}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    /**
     * Renders navigation controls with "X из Y" format
     * @private
     * @param {Object} state - Pagination state
     * @returns {string} HTML string
     */
    _renderNavigation(state) {
        const { currentPage, totalPages, hasPrev, hasNext } = state;

        return `
            <nav class="${CSS_CLASSES.NAV} equipment-navigation" aria-label="Навигация по страницам">
                <div class="d-flex align-items-center gap-2">
                    ${this._renderPrevButton(hasPrev, currentPage)}
                    ${this._renderPageDisplay(currentPage, totalPages)}
                    ${this._renderNextButton(hasNext, currentPage)}
                </div>
            </nav>
        `;
    }

    /**
     * Renders previous button
     * @private
     * @param {boolean} hasPrev - Has previous page
     * @param {number} currentPage - Current page
     * @returns {string} HTML string
     */
    _renderPrevButton(hasPrev, currentPage) {
        const targetPage = Math.max(1, currentPage - 1);

        return `
            <button type="button"
                    class="btn btn-outline-secondary btn-sm ${!hasPrev ? 'disabled' : ''}"
                    ${DATA_ATTRIBUTES.ACTION}="${ACTIONS.PREV}"
                    ${DATA_ATTRIBUTES.PAGE}="${targetPage}"
                    ${!hasPrev ? 'disabled' : ''}
                    aria-label="Предыдущая страница"
                    title="Предыдущая страница">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
    }

    /**
     * Renders next button
     * @private
     * @param {boolean} hasNext - Has next page
     * @param {number} currentPage - Current page
     * @returns {string} HTML string
     */
    _renderNextButton(hasNext, currentPage) {
        const targetPage = currentPage + 1;

        return `
            <button type="button"
                    class="btn btn-outline-secondary btn-sm ${!hasNext ? 'disabled' : ''}"
                    ${DATA_ATTRIBUTES.ACTION}="${ACTIONS.NEXT}"
                    ${DATA_ATTRIBUTES.PAGE}="${targetPage}"
                    ${!hasNext ? 'disabled' : ''}
                    aria-label="Следующая страница"
                    title="Следующая страница">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }

    /**
     * Renders page display ("1 из 15")
     * @private
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     * @returns {string} HTML string
     */
    _renderPageDisplay(currentPage, totalPages) {
        return `
            <div class="equipment-page-display px-2 fw-medium text-nowrap">
                ${formatNumber(currentPage)} из ${formatNumber(totalPages)}
            </div>
        `;
    }

    /**
     * Returns CSS styles for this theme
     * @returns {string} CSS string
     */
    getStyles() {
        return `
            .equipment-pagination {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 0;
                gap: 1rem;
            }

            .equipment-records-info {
                flex: 1;
                min-width: 0;
                color: var(--bs-body-color);
                font-size: 0.9rem;
            }

            .equipment-controls {
                flex-shrink: 0;
            }

            .equipment-page-size .form-select {
                font-size: 0.875rem;
                padding: 0.25rem 0.5rem;
                border-radius: 0.375rem;
            }

            .equipment-navigation .btn {
                padding: 0.25rem 0.5rem;
                font-size: 0.875rem;
                border-radius: 0.375rem;
            }

            .equipment-page-display {
                font-size: 0.875rem;
                color: var(--bs-body-color);
                min-width: 60px;
                text-align: center;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .equipment-pagination {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 0.75rem;
                    text-align: center;
                }

                .equipment-records-info {
                    text-align: center;
                    min-width: auto;
                }

                .equipment-controls {
                    justify-content: center;
                    flex-wrap: wrap;
                }
            }

            @media (max-width: 480px) {
                .equipment-controls {
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .equipment-page-display {
                    min-width: 50px;
                }
            }
        `;
    }
}
