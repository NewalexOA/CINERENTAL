/**
 * Compact Theme for Pagination Component
 * Simplified pagination theme for top/bottom positions
 * Features minimal "X of Y" navigation without clutter
 */

import { formatNumber } from '../utils/helpers.js';
import { CSS_CLASSES, DATA_ATTRIBUTES, ACTIONS } from '../utils/constants.js';

/**
 * Compact theme implementation - minimal pagination for secondary positions
 */
export class CompactTheme {
    constructor() {
        this.name = 'compact';
        this.description = 'Compact pagination with simple navigation and page info';
    }

    /**
     * Generates compact pagination HTML
     * @param {Object} state - Pagination state
     * @param {Object} options - Theme options
     * @returns {string} HTML string
     */
    render(state, options = {}) {
        const {
            currentPage,
            totalPages,
            totalItems,
            hasNext,
            hasPrev
        } = state;

        const {
            showPageInfo = true,
            showNavigation = true,
            className = '',
            id = ''
        } = options;

        if (totalPages <= 1 && !showPageInfo) {
            return `<div class="${CSS_CLASSES.CONTAINER} ${className}" ${id ? `id="${id}"` : ''}></div>`;
        }

        return `
            <div class="${CSS_CLASSES.CONTAINER} pagination-compact ${className}" ${id ? `id="${id}"` : ''}>
                ${showPageInfo ? this._renderPageInfo(state) : ''}
                ${showNavigation && totalPages > 1 ? this._renderNavigation(state) : ''}
            </div>
        `;
    }

    /**
     * Renders compact page information
     * @private
     * @param {Object} state - Pagination state
     * @returns {string} HTML string
     */
    _renderPageInfo(state) {
        const { currentPage, totalPages, totalItems } = state;

        if (totalItems === 0) {
            return `
                <div class="${CSS_CLASSES.INFO}">
                    <span class="pagination-compact-info text-muted">Нет записей</span>
                </div>
            `;
        }

        const pageText = totalPages > 1
            ? `${formatNumber(currentPage)} из ${formatNumber(totalPages)}`
            : '1 из 1';

        return `
            <div class="${CSS_CLASSES.INFO}">
                <span class="pagination-compact-info">
                    Страница ${pageText}
                    <span class="text-muted">(${formatNumber(totalItems)} записей)</span>
                </span>
            </div>
        `;
    }

    /**
     * Renders compact navigation controls
     * @private
     * @param {Object} state - Pagination state
     * @returns {string} HTML string
     */
    _renderNavigation(state) {
        const { currentPage, totalPages, hasPrev, hasNext } = state;

        return `
            <nav class="${CSS_CLASSES.NAV}" aria-label="Навигация по страницам">
                <div class="btn-group btn-group-sm" role="group">
                    ${this._renderPrevButton(hasPrev, currentPage)}
                    ${this._renderPageInput(currentPage, totalPages)}
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
                    class="btn btn-outline-secondary ${!hasPrev ? 'disabled' : ''}"
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
                    class="btn btn-outline-secondary ${!hasNext ? 'disabled' : ''}"
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
     * Renders page input for direct navigation
     * @private
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     * @returns {string} HTML string
     */
    _renderPageInput(currentPage, totalPages) {
        return `
            <div class="btn btn-outline-secondary pagination-page-input" style="cursor: default;">
                <input type="number"
                       class="form-control form-control-sm border-0 text-center"
                       style="width: 60px; background: transparent; box-shadow: none;"
                       value="${currentPage}"
                       min="1"
                       max="${totalPages}"
                       ${DATA_ATTRIBUTES.ACTION}="${ACTIONS.GOTO_PAGE}"
                       aria-label="Номер страницы"
                       title="Введите номер страницы">
                <span class="ms-1 text-muted">из ${formatNumber(totalPages)}</span>
            </div>
        `;
    }

    /**
     * Returns CSS styles for this theme
     * @returns {string} CSS string
     */
    getStyles() {
        return `
            .pagination-compact {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
                padding: 0.5rem 0;
                font-size: 0.875rem;
            }

            .pagination-compact .${CSS_CLASSES.INFO} {
                flex: 1;
                min-width: 0;
            }

            .pagination-compact-info {
                color: var(--bs-body-color);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .pagination-compact .${CSS_CLASSES.NAV} {
                flex-shrink: 0;
            }

            .pagination-page-input {
                display: flex !important;
                align-items: center;
                padding: 0.25rem 0.5rem !important;
                min-width: 120px;
            }

            .pagination-page-input input {
                font-size: 0.875rem;
            }

            .pagination-page-input input:focus {
                outline: none;
                border: none !important;
                box-shadow: none !important;
            }

            /* Responsive design */
            @media (max-width: 576px) {
                .pagination-compact {
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    text-align: center;
                }

                .pagination-compact .${CSS_CLASSES.INFO} {
                    order: 2;
                }

                .pagination-compact .${CSS_CLASSES.NAV} {
                    order: 1;
                }

                .pagination-compact-info {
                    white-space: normal;
                }

                .pagination-page-input {
                    min-width: 100px;
                }
            }

            @media (max-width: 400px) {
                .pagination-page-input {
                    min-width: 90px;
                }

                .pagination-page-input input {
                    width: 45px;
                }
            }
        `;
    }
}
