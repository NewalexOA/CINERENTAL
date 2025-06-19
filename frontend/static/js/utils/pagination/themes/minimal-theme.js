/**
 * Minimal Theme for Pagination Component
 * Ultra-compact pagination theme for limited space
 * Features only essential navigation with minimal visual footprint
 */

import { formatNumber } from '../utils/helpers.js';
import { CSS_CLASSES, DATA_ATTRIBUTES, ACTIONS } from '../utils/constants.js';

/**
 * Minimal theme implementation - essential navigation only
 */
export class MinimalTheme {
    constructor() {
        this.name = 'minimal';
        this.description = 'Minimal pagination with essential navigation only';
    }

    /**
     * Generates minimal pagination HTML
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
            showPageInfo = false,
            className = '',
            id = ''
        } = options;

        // Return empty if no pagination needed
        if (totalPages <= 1 && !showPageInfo) {
            return `<div class="${CSS_CLASSES.CONTAINER} ${className}" ${id ? `id="${id}"` : ''}></div>`;
        }

        return `
            <div class="${CSS_CLASSES.CONTAINER} pagination-minimal ${className}" ${id ? `id="${id}"` : ''}>
                ${showPageInfo ? this._renderPageInfo(state) : ''}
                ${totalPages > 1 ? this._renderNavigation(state) : ''}
            </div>
        `;
    }

    /**
     * Renders minimal page information
     * @private
     * @param {Object} state - Pagination state
     * @returns {string} HTML string
     */
    _renderPageInfo(state) {
        const { currentPage, totalPages, totalItems } = state;

        if (totalItems === 0) {
            return `
                <div class="${CSS_CLASSES.INFO}">
                    <small class="text-muted">0 записей</small>
                </div>
            `;
        }

        return `
            <div class="${CSS_CLASSES.INFO}">
                <small class="pagination-minimal-info">
                    ${formatNumber(currentPage)}/${formatNumber(totalPages)}
                    <span class="text-muted">(${formatNumber(totalItems)})</span>
                </small>
            </div>
        `;
    }

    /**
     * Renders minimal navigation controls
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
                    class="btn btn-outline-secondary ${!hasPrev ? 'disabled' : ''}"
                    style="padding: 0.25rem 0.5rem;"
                    ${DATA_ATTRIBUTES.ACTION}="${ACTIONS.PREV}"
                    ${DATA_ATTRIBUTES.PAGE}="${targetPage}"
                    ${!hasPrev ? 'disabled' : ''}
                    aria-label="Предыдущая страница"
                    title="Предыдущая страница">
                <i class="fas fa-chevron-left" style="font-size: 0.75rem;"></i>
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
                    style="padding: 0.25rem 0.5rem;"
                    ${DATA_ATTRIBUTES.ACTION}="${ACTIONS.NEXT}"
                    ${DATA_ATTRIBUTES.PAGE}="${targetPage}"
                    ${!hasNext ? 'disabled' : ''}
                    aria-label="Следующая страница"
                    title="Следующая страница">
                <i class="fas fa-chevron-right" style="font-size: 0.75rem;"></i>
            </button>
        `;
    }

    /**
     * Renders page display (current/total)
     * @private
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     * @returns {string} HTML string
     */
    _renderPageDisplay(currentPage, totalPages) {
        return `
            <div class="btn btn-outline-secondary pagination-minimal-display"
                 style="cursor: default; padding: 0.25rem 0.5rem; font-size: 0.75rem; min-width: 60px;">
                ${formatNumber(currentPage)}/${formatNumber(totalPages)}
            </div>
        `;
    }

    /**
     * Returns CSS styles for this theme
     * @returns {string} CSS string
     */
    getStyles() {
        return `
            .pagination-minimal {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 0.5rem;
                padding: 0.25rem 0;
                font-size: 0.75rem;
            }

            .pagination-minimal .${CSS_CLASSES.INFO} {
                display: flex;
                align-items: center;
            }

            .pagination-minimal-info {
                color: var(--bs-body-color);
                font-weight: 500;
                white-space: nowrap;
            }

            .pagination-minimal .${CSS_CLASSES.NAV} {
                flex-shrink: 0;
            }

            .pagination-minimal-display {
                display: flex !important;
                align-items: center;
                justify-content: center;
                background-color: transparent !important;
                border-color: var(--bs-border-color) !important;
                color: var(--bs-body-color) !important;
                font-weight: 500;
            }

            .pagination-minimal .btn-group .btn {
                border-radius: 0.25rem;
                margin: 0 1px;
            }

            .pagination-minimal .btn-group .btn:first-child {
                border-top-right-radius: 0;
                border-bottom-right-radius: 0;
                margin-right: 0;
            }

            .pagination-minimal .btn-group .btn:last-child {
                border-top-left-radius: 0;
                border-bottom-left-radius: 0;
                margin-left: 0;
            }

            .pagination-minimal .btn-group .btn:not(:first-child):not(:last-child) {
                border-radius: 0;
                margin: 0;
            }

            /* Responsive design */
            @media (max-width: 480px) {
                .pagination-minimal {
                    gap: 0.25rem;
                }

                .pagination-minimal-display {
                    min-width: 50px !important;
                    padding: 0.25rem 0.375rem !important;
                }

                .pagination-minimal .btn {
                    padding: 0.25rem 0.375rem !important;
                }
            }

            /* Extra small screens */
            @media (max-width: 320px) {
                .pagination-minimal {
                    font-size: 0.7rem;
                }

                .pagination-minimal-display {
                    min-width: 45px !important;
                    font-size: 0.7rem !important;
                }

                .pagination-minimal .btn i {
                    font-size: 0.7rem !important;
                }
            }
        `;
    }
}
