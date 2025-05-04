/**
 * Common utility functions for the project
 */

// Date formatting constants
export const DATE_FORMAT = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
};

export const DATETIME_FORMAT = {
    ...DATE_FORMAT,
    hour: '2-digit',
    minute: '2-digit'
};

// Date range picker locale settings
export const DATERANGEPICKER_LOCALE = {
    format: 'DD.MM.YYYY',
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

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
export function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU', DATE_FORMAT);
}

/**
 * Format date and time for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date and time
 */
export function formatDateTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ru-RU', DATETIME_FORMAT);
}

/**
 * Format date range
 * @param {string} start - Start date
 * @param {string} end - End date
 * @returns {string} - Formatted date range
 */
export function formatDateRange(start, end) {
    return `${formatDate(start)} - ${formatDate(end)}`;
}

/**
 * Format currency amount
 * @param {number|string} amount - Amount to format
 * @returns {string} - Formatted currency
 */
export function formatCurrency(amount) {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
        console.warn('Invalid amount passed to formatCurrency:', amount);
        return '0 ₽';
    }
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(numericAmount);
}

/**
 * Validate form
 * @param {HTMLFormElement|string} formElement - Form element or selector
 * @returns {boolean} - Whether form is valid
 */
export function validateForm(formElement) {
    const form = formElement instanceof HTMLFormElement ? formElement : document.querySelector(formElement);
    if (!form) return false;

    form.classList.add('was-validated');
    return form.checkValidity();
}

/**
 * Initialize date range picker
 * @param {HTMLElement} element - Element to initialize picker on
 * @param {Object} options - Additional options
 * @returns {daterangepicker} - Initialized picker instance
 */
export function initDateRangePicker(element, options = {}) {
    const defaultOptions = {
        locale: DATERANGEPICKER_LOCALE,
        opens: 'right',
        autoApply: true,
        ...options
    };

    return new daterangepicker(element, defaultOptions);
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, danger, warning, info)
 */
export function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

/**
 * Create toast container
 * @returns {HTMLElement} - Toast container element
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to execute immediately
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}
