/**
 * Full Theme for Pagination Component
 * Complete pagination theme with page info, navigation, and page size selector
 * Addresses user requirement for "X of Y pages" display
 */

import { formatNumber } from '../utils/helpers.js';
import { CSS_CLASSES, DATA_ATTRIBUTES, ACTIONS } from '../utils/constants.js';

/**
 * Full theme implementation - complete pagination with all features
 */
export class FullTheme {
    constructor() {
        this.name = 'full';
        this.description = 'Complete pagination with page info, navigation, and page size selector';
    }

    /**
     * Generates complete pagination HTML
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
            showPageInfo = true,
            showPageSizeSelect = true,
            showNavigation = true,
            pageSizes = [20, 50, 100],
            className = '',
            id = ''
        } = options;

        return `
            <div class="${CSS_CLASSES.CONTAINER} ${className}" ${id ? `id="${id}"` : ''}>
                ${showPageInfo ? this._renderPageInfo(state) : ''}
                ${showNavigation ? this._renderNavigation(state) : ''}
                ${showPageSizeSelect ? this._renderPageSizeSelect(pageSize, pageSizes) : ''}
            </div>
        `;
    }

    /**
     * Renders page information section
     * @private
     * @param {Object} state - Pagination state
     * @returns {string} HTML string
     */
    _renderPageInfo(state) {
        const { currentPage, totalPages, totalItems, startItem, endItem } = state;

        const pageText = totalPages > 1
            ? `Страница ${formatNumber(currentPage)} из ${formatNumber(totalPages)}`
            : 'Страница 1';

        const itemsText = totalItems > 0
            ? `Записи ${formatNumber(startItem)}-${formatNumber(endItem)} из ${formatNumber(totalItems)}`
            : 'Нет записей';

        return `
            <div class="${CSS_CLASSES.INFO}">
                <div class="pagination-page-info">
                    <span class="page-current">${pageText}</span>
                </div>
                <div class="pagination-items-info">
                    <span class="items-range">${itemsText}</span>
                </div>
            </div>
        `;
    }

    /**
     * Renders navigation controls
     * @private
     * @param {Object} state - Pagination state
     * @returns {string} HTML string
     */
    _renderNavigation(state) {
        const { currentPage, totalPages, hasPrev, hasNext } = state;

        if (totalPages <= 1) {
            return `<div class="${CSS_CLASSES.NAV}"></div>`;
        }

        return `
            <nav class="${CSS_CLASSES.NAV}" aria-label="Навигация по страницам">
                <ul class="pagination pagination-sm mb-0">
                    ${this._renderPrevButton(hasPrev, currentPage)}
                    ${this._renderPageNumbers(currentPage, totalPages)}
                    ${this._renderNextButton(hasNext, currentPage)}
                </ul>
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
        const disabled = !hasPrev ? 'disabled' : '';
        const targetPage = Math.max(1, currentPage - 1);

        return `
            <li class="page-item ${disabled}">
                <button class="page-link"
                        ${DATA_ATTRIBUTES.ACTION}="${ACTIONS.PREV}"
                        ${DATA_ATTRIBUTES.PAGE}="${targetPage}"
                        ${!hasPrev ? 'disabled' : ''}
                        aria-label="Предыдущая страница">
                    <i class="fas fa-chevron-left"></i>
                </button>
            </li>
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
        const disabled = !hasNext ? 'disabled' : '';
        const targetPage = currentPage + 1;

        return `
            <li class="page-item ${disabled}">
                <button class="page-link"
                        ${DATA_ATTRIBUTES.ACTION}="${ACTIONS.NEXT}"
                        ${DATA_ATTRIBUTES.PAGE}="${targetPage}"
                        ${!hasNext ? 'disabled' : ''}
                        aria-label="Следующая страница">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </li>
        `;
    }

    /**
     * Renders page numbers with smart truncation
     * @private
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     * @returns {string} HTML string
     */
    _renderPageNumbers(currentPage, totalPages) {
        const pages = this._calculatePageNumbers(currentPage, totalPages);

        return pages.map(page => {
            if (page === '...') {
                return `
                    <li class="page-item disabled">
                        <span class="page-link">...</span>
                    </li>
                `;
            }

            const isActive = page === currentPage;
            return `
                <li class="page-item ${isActive ? 'active' : ''}">
                    <button class="page-link"
                            ${DATA_ATTRIBUTES.ACTION}="${ACTIONS.GOTO_PAGE}"
                            ${DATA_ATTRIBUTES.PAGE}="${page}"
                            ${isActive ? 'aria-current="page"' : ''}
                            aria-label="Страница ${page}">
                        ${page}
                    </button>
                </li>
            `;
        }).join('');
    }

    /**
     * Calculates which page numbers to show
     * @private
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     * @returns {Array} Array of page numbers and ellipsis
     */
    _calculatePageNumbers(currentPage, totalPages) {
        const delta = 2; // Number of pages to show around current page
        const range = [];
        const rangeWithDots = [];

        // Always include first page
        range.push(1);

        // Add pages around current page
        for (let i = Math.max(2, currentPage - delta);
             i <= Math.min(totalPages - 1, currentPage + delta);
             i++) {
            range.push(i);
        }

        // Always include last page if more than 1 page
        if (totalPages > 1) {
            range.push(totalPages);
        }

        // Add ellipsis where needed
        let prev = 0;
        for (const page of range) {
            if (page - prev === 2) {
                rangeWithDots.push(prev + 1);
            } else if (page - prev !== 1) {
                rangeWithDots.push('...');
            }
            rangeWithDots.push(page);
            prev = page;
        }

        return rangeWithDots;
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
            <div class="${CSS_CLASSES.SIZE_SELECT}">
                <div class="pagination-size-wrapper">
                    <label for="pageSize" class="form-label mb-0 me-2">Записей на странице:</label>
                    <select class="form-select form-select-sm"
                            ${DATA_ATTRIBUTES.ACTION}="${ACTIONS.PAGE_SIZE}"
                            style="width: auto; display: inline-block;">
                        ${availableSizes.map(size => `
                            <option value="${size}" ${size === currentPageSize ? 'selected' : ''}>
                                ${size}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
        `;
    }

    /**
     * Returns CSS styles for this theme
     * @returns {string} CSS string
     */
    getStyles() {
        return `
            .${CSS_CLASSES.CONTAINER} {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 1rem;
                padding: 0.75rem 0;
            }

            .${CSS_CLASSES.INFO} {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
                min-width: 200px;
            }

            .pagination-page-info {
                font-weight: 500;
                color: var(--bs-body-color);
            }

            .pagination-items-info {
                font-size: 0.875rem;
                color: var(--bs-text-muted);
            }

            .${CSS_CLASSES.NAV} .pagination {
                margin: 0;
            }

            .${CSS_CLASSES.SIZE_SELECT} .pagination-size-wrapper {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
            }

            .${CSS_CLASSES.SIZE_SELECT} .form-select {
                min-width: 80px;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .${CSS_CLASSES.CONTAINER} {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 0.75rem;
                }

                .${CSS_CLASSES.INFO} {
                    text-align: center;
                    min-width: auto;
                }

                .${CSS_CLASSES.NAV} {
                    display: flex;
                    justify-content: center;
                }

                .${CSS_CLASSES.SIZE_SELECT} {
                    display: flex;
                    justify-content: center;
                }
            }

            @media (max-width: 480px) {
                .${CSS_CLASSES.NAV} .pagination {
                    flex-wrap: wrap;
                    justify-content: center;
                }

                .${CSS_CLASSES.SIZE_SELECT} .pagination-size-wrapper {
                    flex-direction: column;
                    text-align: center;
                }
            }
        `;
    }
}
