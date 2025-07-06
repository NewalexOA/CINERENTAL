/**
 * Cart Dialogs Module
 * Handles all modal dialogs and confirmations for Universal Cart
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

class CartDialogs {
    constructor() {
        this._activeDialog = null;
        this._dialogId = 0;
    }

    /**
     * Show confirmation dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<Object>}
     */
    showConfirmDialog(options = {}) {
        return new Promise((resolve) => {
            const dialogId = `cart-dialog-${++this._dialogId}`;

            const defaultOptions = {
                title: 'Подтверждение',
                message: 'Вы уверены?',
                confirmText: 'Да',
                cancelText: 'Отмена',
                type: 'default', // default, warning, danger, info
                additionalOptions: []
            };

            const config = { ...defaultOptions, ...options };

            // Create dialog HTML
            const dialogHTML = this._createConfirmDialogHTML(dialogId, config);

            // Add to DOM
            document.body.insertAdjacentHTML('beforeend', dialogHTML);

            const dialog = document.getElementById(dialogId);
            this._activeDialog = dialog;

            // Setup events
            this._setupDialogEvents(dialog, resolve);

            // Show dialog
            setTimeout(() => {
                dialog.classList.add('show');
                dialog.querySelector('.modal').classList.add('show');
                dialog.querySelector('.modal').style.display = 'block';
            }, 10);
        });
    }

    /**
     * Create confirmation dialog HTML
     * @param {string} dialogId
     * @param {Object} config
     * @returns {string}
     * @private
     */
    _createConfirmDialogHTML(dialogId, config) {
        const iconClass = this._getDialogIcon(config.type);
        const buttonClass = this._getDialogButtonClass(config.type);

        const additionalOptionsHTML = config.additionalOptions.map(option => `
            <div class="form-check mt-2">
                <input class="form-check-input" type="checkbox" value="" id="${option.id}"
                       ${option.checked ? 'checked' : ''}>
                <label class="form-check-label" for="${option.id}">
                    ${this._escapeHtml(option.label)}
                </label>
            </div>
        `).join('');

        return `
            <div class="modal fade cart-dialog" id="${dialogId}" tabindex="-1" role="dialog">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="${iconClass} me-2"></i>
                                ${this._escapeHtml(config.title)}
                            </h5>
                            <button type="button" class="btn-close" data-action="cancel"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-3">${this._escapeHtml(config.message)}</p>
                            ${additionalOptionsHTML}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-action="cancel">
                                ${this._escapeHtml(config.cancelText)}
                            </button>
                            <button type="button" class="btn ${buttonClass}" data-action="confirm">
                                ${this._escapeHtml(config.confirmText)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup dialog event listeners
     * @param {HTMLElement} dialog
     * @param {Function} resolve
     * @private
     */
    _setupDialogEvents(dialog, resolve) {
        const handleClick = (e) => {
            const action = e.target.dataset.action;

            if (action === 'confirm' || action === 'cancel') {
                const result = {
                    confirmed: action === 'confirm',
                    options: {}
                };

                // Collect additional options
                const checkboxes = dialog.querySelectorAll('.form-check-input');
                checkboxes.forEach(checkbox => {
                    result.options[checkbox.id] = checkbox.checked;
                });

                this._closeDialog(dialog);
                resolve(result);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                this._closeDialog(dialog);
                resolve({ confirmed: false, options: {} });
            }
        };

        const handleOutsideClick = (e) => {
            if (e.target === dialog) {
                this._closeDialog(dialog);
                resolve({ confirmed: false, options: {} });
            }
        };

        dialog.addEventListener('click', handleClick);
        dialog.addEventListener('keydown', handleKeyDown);
        dialog.addEventListener('click', handleOutsideClick);

        // Focus management
        const confirmButton = dialog.querySelector('[data-action="confirm"]');
        if (confirmButton) {
            setTimeout(() => confirmButton.focus(), 100);
        }
    }

    /**
     * Close and remove dialog
     * @param {HTMLElement} dialog
     * @private
     */
    _closeDialog(dialog) {
        dialog.classList.remove('show');
        dialog.querySelector('.modal').classList.remove('show');
        dialog.querySelector('.modal').style.display = 'none';

        setTimeout(() => {
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
            if (this._activeDialog === dialog) {
                this._activeDialog = null;
            }
        }, 150);
    }

    /**
     * Show simple notification toast
     * @param {string} message
     * @param {string} type - success, error, info, warning
     * @param {number} duration - Duration in ms
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notificationId = `cart-notification-${++this._dialogId}`;
        const iconClass = this._getNotificationIcon(type);
        const bgClass = this._getNotificationBgClass(type);

        const notificationHTML = `
            <div class="toast cart-notification ${bgClass}" id="${notificationId}" role="alert"
                 style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
                <div class="toast-body d-flex align-items-center">
                    <i class="${iconClass} me-2"></i>
                    <span class="flex-grow-1">${this._escapeHtml(message)}</span>
                    <button type="button" class="btn-close btn-close-white ms-2"
                            onclick="this.closest('.toast').remove()"></button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', notificationHTML);

        const notification = document.getElementById(notificationId);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Auto-hide
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 150);
                }
            }, duration);
        }
    }

    /**
     * Show loading dialog
     * @param {string} message
     * @returns {Object} - Dialog controller
     */
    showLoadingDialog(message = 'Загрузка...') {
        const dialogId = `cart-loading-${++this._dialogId}`;

        const loadingHTML = `
            <div class="modal fade cart-dialog" id="${dialogId}" tabindex="-1" role="dialog"
                 data-backdrop="static" data-keyboard="false">
                <div class="modal-dialog modal-sm" role="document">
                    <div class="modal-content">
                        <div class="modal-body text-center py-4">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mb-0">${this._escapeHtml(message)}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', loadingHTML);

        const dialog = document.getElementById(dialogId);

        // Show dialog
        setTimeout(() => {
            dialog.classList.add('show');
            dialog.querySelector('.modal').classList.add('show');
            dialog.querySelector('.modal').style.display = 'block';
        }, 10);

        return {
            close: () => this._closeDialog(dialog),
            updateMessage: (newMessage) => {
                const messageEl = dialog.querySelector('.modal-body p');
                if (messageEl) {
                    messageEl.textContent = newMessage;
                }
            }
        };
    }

    /**
     * Get dialog icon class
     * @param {string} type
     * @returns {string}
     * @private
     */
    _getDialogIcon(type) {
        const icons = {
            default: 'fas fa-question-circle',
            warning: 'fas fa-exclamation-triangle',
            danger: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.default;
    }

    /**
     * Get dialog button class
     * @param {string} type
     * @returns {string}
     * @private
     */
    _getDialogButtonClass(type) {
        const classes = {
            default: 'btn-primary',
            warning: 'btn-warning',
            danger: 'btn-danger',
            info: 'btn-info'
        };
        return classes[type] || classes.default;
    }

    /**
     * Get notification icon class
     * @param {string} type
     * @returns {string}
     * @private
     */
    _getNotificationIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Get notification background class
     * @param {string} type
     * @returns {string}
     * @private
     */
    _getNotificationBgClass(type) {
        const classes = {
            success: 'bg-success text-white',
            error: 'bg-danger text-white',
            warning: 'bg-warning text-dark',
            info: 'bg-info text-white'
        };
        return classes[type] || classes.info;
    }

    /**
     * Escape HTML entities
     * @param {string} text
     * @returns {string}
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Close all active dialogs
     */
    closeAll() {
        const dialogs = document.querySelectorAll('.cart-dialog');
        dialogs.forEach(dialog => this._closeDialog(dialog));

        const notifications = document.querySelectorAll('.cart-notification');
        notifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    /**
     * Get debug information
     * @returns {Object}
     */
    getDebugInfo() {
        return {
            module: 'CartDialogs',
            activeDialog: !!this._activeDialog,
            dialogCount: this._dialogId
        };
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartDialogs;
}

// Global export for browser usage
if (typeof window !== 'undefined') {
    window.CartDialogs = CartDialogs;
}
