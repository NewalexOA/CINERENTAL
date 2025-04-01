/**
 * Common utilities for project functionality
 *
 * This file contains shared functions used across project-related modules:
 * - Date formatting
 * - Status and color utilities
 * - Common API operations
 */

// Date formatting constants
const DATE_FORMAT = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
};

const DATETIME_FORMAT = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
};

// Date range picker locale settings
const DATERANGEPICKER_LOCALE = {
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
 * Format date for project display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
function formatProjectDate(dateString) {
    if (!dateString) return '-';
    // Use the global formatDate if available, otherwise format locally
    if (typeof window.formatDate === 'function') {
        return window.formatDate(dateString);
    }
    return new Date(dateString).toLocaleDateString('ru-RU', DATE_FORMAT);
}

/**
 * Format date and time for project display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date and time
 */
function formatProjectDateTime(dateString) {
    if (!dateString) return '-';
    // Use the global formatDateTime if available, otherwise format locally
    if (typeof window.formatDateTime === 'function') {
        return window.formatDateTime(dateString);
    }
    return new Date(dateString).toLocaleString('ru-RU', DATETIME_FORMAT);
}

/**
 * Get Bootstrap color class for project status
 * @param {string} status - Project status
 * @returns {string} - Bootstrap color class
 */
function getStatusColor(status) {
    const statusColors = {
        'PENDING': 'warning',
        'CONFIRMED': 'primary',
        'IN_PROGRESS': 'info',
        'COMPLETED': 'success',
        'CANCELLED': 'danger',
        'DRAFT': 'secondary',
        'ACTIVE': 'success'
    };

    return statusColors[status] || 'secondary';
}

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency
 */
function formatProjectCurrency(amount) {
    // Use the global formatCurrency if available, otherwise format locally
    if (typeof window.formatCurrency === 'function') {
        return window.formatCurrency(amount);
    }
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Show toast notification (uses the global showToast if available)
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, danger, warning, info)
 */
function showProjectToast(message, type = 'success') {
    // Use the global showToast if available
    if (typeof window.showToast === 'function') {
        return window.showToast(message, type);
    }

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

    const toastContainer = document.getElementById('toastContainer') || document.body;
    toastContainer.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });

    bsToast.show();

    // Remove from DOM after hiding
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
    const classes = {
        'DRAFT': 'bg-secondary',
        'ACTIVE': 'bg-success',
        'COMPLETED': 'bg-info',
        'CANCELLED': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
}

// Helper function to get status name
function getStatusName(status) {
    const names = {
        'DRAFT': 'Черновик',
        'ACTIVE': 'Активный',
        'COMPLETED': 'Завершенный',
        'CANCELLED': 'Отмененный'
    };
    return names[status] || status;
}

// Helper function for date range formatting
function formatDateRange(start, end) {
    const startDate = moment(start).format('DD.MM.YYYY');
    const endDate = moment(end).format('DD.MM.YYYY');
    return `${startDate} - ${endDate}`;
}
