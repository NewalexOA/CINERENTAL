/**
 * Bookings Theme for Pagination Component
 * Специальная тема для страницы бронирований с форматом:
 * "Показано 1-20 из 300. [20▼] [<] 1 из 15 [>]"
 */

import { formatNumber } from '../utils/helpers.js';
import { CSS_CLASSES, DATA_ATTRIBUTES, ACTIONS } from '../utils/constants.js';

/**
 * Bookings theme implementation - кастомная тема для страницы бронирований
 */
export class BookingsTheme {
    constructor() {
        this.name = 'bookings';
        this.description = 'Кастомная тема для страницы бронирований с селектором размера страницы';
    }

    /**
     * Generates bookings pagination HTML
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
            <div class="${CSS_CLASSES.CONTAINER} bookings-pagination ${className}" ${id ? `id="${id}"` : ''}>
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
                <div class="${CSS_CLASSES.INFO} bookings-records-info">
                    <span class="text-muted">Нет бронирований.</span>
                </div>
            `;
        }

        return `
            <div class="${CSS_CLASSES.INFO} bookings-records-info">
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
            <div class="bookings-controls d-flex align-items-center gap-3">
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
            <div class="bookings-page-size">
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
            <nav class="${CSS_CLASSES.NAV} bookings-navigation" aria-label="Навигация по страницам">
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
            <div class="bookings-page-display px-2 fw-medium text-nowrap">
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
        /* Bookings Pagination Theme Styles */
        .bookings-pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem 0;
        }

        /* Bottom pagination with border */
        #bookingsPagination .bookings-pagination {
            border-top: 1px solid #dee2e6;
            margin-top: 1rem;
        }

        .bookings-pagination .bookings-records-info {
            flex: 1;
            font-weight: 500;
            color: #495057;
        }

        .bookings-pagination .bookings-controls {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .bookings-pagination .bookings-page-size {
            display: flex;
            align-items: center;
        }

        .bookings-pagination .bookings-navigation .btn {
            border: 1px solid #6c757d;
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
        }

        .bookings-pagination .bookings-navigation .btn:hover:not(:disabled) {
            background-color: #e9ecef;
            border-color: #adb5bd;
        }

        .bookings-pagination .bookings-page-display {
            color: #495057;
            font-size: 0.9rem;
            min-width: 80px;
            text-align: center;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .bookings-pagination {
                flex-direction: column;
                gap: 0.75rem;
                text-align: center;
            }

            .bookings-pagination .bookings-records-info {
                order: 2;
                flex: none;
            }

            .bookings-pagination .bookings-controls {
                order: 1;
                justify-content: center;
                flex-wrap: wrap;
                gap: 0.75rem;
            }

            .bookings-pagination .bookings-page-display {
                min-width: 60px;
                font-size: 0.85rem;
            }
        }

        @media (max-width: 576px) {
            .bookings-pagination .bookings-controls {
                flex-direction: column;
                gap: 0.5rem;
            }

            .bookings-pagination .bookings-navigation .d-flex {
                gap: 0.5rem;
            }

            .bookings-pagination .bookings-page-display {
                font-size: 0.8rem;
                padding: 0.25rem 0.5rem;
            }
        }
        `;
    }
}
