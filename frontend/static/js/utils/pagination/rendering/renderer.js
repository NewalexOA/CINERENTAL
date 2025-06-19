/**
 * DOM Renderer for Pagination Component
 * Handles HTML rendering, DOM manipulation, and event handling
 */

import { globalTemplateEngine } from './templates.js';
import {
    CSS_CLASSES,
    DATA_ATTRIBUTES,
    ACTIONS,
    THEMES,
    ERROR_MESSAGES
} from '../utils/constants.js';
import {
    getElement,
    createElementFromHTML,
    safeCallback,
    debounce
} from '../utils/helpers.js';

/**
 * DOM renderer for pagination component
 */
export class PaginationRenderer {
    constructor(container, options = {}) {
        this.container = getElement(container);
        if (!this.container) {
            throw new Error(ERROR_MESSAGES.INVALID_CONTAINER);
        }

        this.options = {
            theme: THEMES.FULL,
            debounceMs: 300,
            ...options
        };

        this.currentState = null;
        this.eventListeners = [];
        this.isRendering = false;

        // Initialize event delegation
        this._setupEventDelegation();

        // Inject theme styles
        globalTemplateEngine.injectStyles(this.options.theme);
    }

    /**
     * Renders pagination with new state
     * @param {Object} state - Pagination state
     * @param {Object} callbacks - Event callbacks
     */
    render(state, callbacks = {}) {
        if (this.isRendering) return;

        try {
            this.isRendering = true;
            this.currentState = state;
            this.callbacks = callbacks;

            const html = globalTemplateEngine.render(
                this.options.theme,
                state,
                this._getThemeOptions()
            );

            this._updateDOM(html);
            this._updateLoadingState(state.loading);
            this._updateErrorState(state.error);

        } catch (error) {
            console.error('Error rendering pagination:', error);
            this._showError(error.message);
        } finally {
            this.isRendering = false;
        }
    }

    /**
     * Updates only loading state without full re-render
     * @param {boolean} loading - Loading state
     */
    setLoading(loading) {
        if (this.currentState) {
            this.currentState.loading = loading;
            this._updateLoadingState(loading);
        }
    }

    /**
     * Updates only error state without full re-render
     * @param {string|Error|null} error - Error state
     */
    setError(error) {
        if (this.currentState) {
            this.currentState.error = error;
            this._updateErrorState(error);
        }
    }

    /**
     * Changes theme and re-renders
     * @param {string} themeName - New theme name
     */
    setTheme(themeName) {
        const validation = globalTemplateEngine.validateTheme(themeName);
        if (!validation.isValid) {
            console.warn(`Invalid theme '${themeName}', keeping current theme`);
            return;
        }

        this.options.theme = themeName;
        globalTemplateEngine.injectStyles(themeName);

        if (this.currentState) {
            this.render(this.currentState, this.callbacks);
        }
    }

    /**
     * Updates theme options and re-renders
     * @param {Object} newOptions - New theme options
     */
    updateOptions(newOptions) {
        Object.assign(this.options, newOptions);

        if (this.currentState) {
            this.render(this.currentState, this.callbacks);
        }
    }

    /**
     * Gets current container element
     * @returns {Element} Container element
     */
    getContainer() {
        return this.container;
    }

    /**
     * Gets current theme name
     * @returns {string} Theme name
     */
    getTheme() {
        return this.options.theme;
    }

    /**
     * Destroys the renderer and cleans up
     */
    destroy() {
        this._removeAllEventListeners();
        this.container.innerHTML = '';
        this.currentState = null;
        this.callbacks = null;
    }

    /**
     * Sets up event delegation for the container
     * @private
     */
    _setupEventDelegation() {
        const debouncedHandler = debounce(
            this._handleEvent.bind(this),
            this.options.debounceMs
        );

        // Handle clicks
        const clickHandler = (event) => {
            const target = event.target.closest(`[${DATA_ATTRIBUTES.ACTION}]`);
            if (target) {
                event.preventDefault();
                this._handleEvent(event, target);
            }
        };

        // Handle input changes (for page number input)
        const inputHandler = (event) => {
            const target = event.target;
            if (target.hasAttribute(DATA_ATTRIBUTES.ACTION)) {
                debouncedHandler(event, target);
            }
        };

        // Handle key presses (Enter key for inputs)
        const keyHandler = (event) => {
            if (event.key === 'Enter') {
                const target = event.target;
                if (target.hasAttribute(DATA_ATTRIBUTES.ACTION)) {
                    event.preventDefault();
                    this._handleEvent(event, target);
                }
            }
        };

        this.container.addEventListener('click', clickHandler);
        this.container.addEventListener('change', inputHandler);
        this.container.addEventListener('keypress', keyHandler);

        // Store for cleanup
        this.eventListeners.push(
            () => this.container.removeEventListener('click', clickHandler),
            () => this.container.removeEventListener('change', inputHandler),
            () => this.container.removeEventListener('keypress', keyHandler)
        );
    }

    /**
     * Handles pagination events
     * @private
     * @param {Event} event - DOM event
     * @param {Element} target - Target element
     */
    _handleEvent(event, target) {
        if (!this.callbacks) return;

        const action = target.getAttribute(DATA_ATTRIBUTES.ACTION);
        const page = parseInt(target.getAttribute(DATA_ATTRIBUTES.PAGE)) || null;
        const size = parseInt(target.getAttribute(DATA_ATTRIBUTES.SIZE)) || null;

        switch (action) {
            case ACTIONS.PREV:
                safeCallback(this.callbacks.onPageChange, page || (this.currentState.currentPage - 1));
                break;

            case ACTIONS.NEXT:
                safeCallback(this.callbacks.onPageChange, page || (this.currentState.currentPage + 1));
                break;

            case ACTIONS.GOTO_PAGE:
                if (target.type === 'number') {
                    // Handle input field
                    const inputValue = parseInt(target.value);
                    if (inputValue && inputValue !== this.currentState.currentPage) {
                        safeCallback(this.callbacks.onPageChange, inputValue);
                    }
                } else if (page) {
                    // Handle button click
                    safeCallback(this.callbacks.onPageChange, page);
                }
                break;

            case ACTIONS.PAGE_SIZE:
                const newSize = size || parseInt(target.value);
                if (newSize && newSize !== this.currentState.pageSize) {
                    safeCallback(this.callbacks.onPageSizeChange, newSize);
                }
                break;

            default:
                console.warn(`Unknown pagination action: ${action}`);
        }
    }

    /**
     * Updates DOM with new HTML
     * @private
     * @param {string} html - New HTML content
     */
    _updateDOM(html) {
        // Use innerHTML for performance
        this.container.innerHTML = html;
    }

    /**
     * Updates loading state UI
     * @private
     * @param {boolean} loading - Loading state
     */
    _updateLoadingState(loading) {
        const container = this.container.querySelector(`.${CSS_CLASSES.CONTAINER}`);
        if (!container) return;

        if (loading) {
            container.classList.add(CSS_CLASSES.LOADING);
            this._disableAllControls(true);
        } else {
            container.classList.remove(CSS_CLASSES.LOADING);
            this._disableAllControls(false);
        }
    }

    /**
     * Updates error state UI
     * @private
     * @param {string|Error|null} error - Error state
     */
    _updateErrorState(error) {
        const container = this.container.querySelector(`.${CSS_CLASSES.CONTAINER}`);
        if (!container) return;

        // Remove existing error display
        const existingError = container.querySelector(`.${CSS_CLASSES.ERROR}`);
        if (existingError) {
            existingError.remove();
        }

        if (error) {
            container.classList.add(CSS_CLASSES.ERROR);
            this._showErrorMessage(error, container);
        } else {
            container.classList.remove(CSS_CLASSES.ERROR);
        }
    }

    /**
     * Shows error message in UI
     * @private
     * @param {string|Error} error - Error to display
     * @param {Element} container - Container element
     */
    _showErrorMessage(error, container) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorHtml = `
            <div class="${CSS_CLASSES.ERROR} alert alert-danger alert-sm mt-2" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${errorMessage}
            </div>
        `;

        const errorElement = createElementFromHTML(errorHtml);
        container.appendChild(errorElement);
    }

    /**
     * Disables or enables all pagination controls
     * @private
     * @param {boolean} disabled - Whether to disable controls
     */
    _disableAllControls(disabled) {
        const controls = this.container.querySelectorAll('button, input, select');
        controls.forEach(control => {
            control.disabled = disabled;
        });
    }

    /**
     * Shows error in container
     * @private
     * @param {string} message - Error message
     */
    _showError(message) {
        this.container.innerHTML = `
            <div class="${CSS_CLASSES.ERROR} alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Ошибка пагинации: ${message}
            </div>
        `;
    }

    /**
     * Gets theme-specific render options
     * @private
     * @returns {Object} Theme options
     */
    _getThemeOptions() {
        return {
            className: this.options.className || '',
            id: this.options.id || '',
            showPageInfo: this.options.showPageInfo !== false,
            showPageSizeSelect: this.options.showPageSizeSelect !== false,
            showNavigation: this.options.showNavigation !== false,
            pageSizes: this.options.pageSizes || [20, 50, 100]
        };
    }

    /**
     * Removes all event listeners
     * @private
     */
    _removeAllEventListeners() {
        this.eventListeners.forEach(removeListener => {
            try {
                removeListener();
            } catch (error) {
                console.warn('Error removing event listener:', error);
            }
        });
        this.eventListeners = [];
    }
}
