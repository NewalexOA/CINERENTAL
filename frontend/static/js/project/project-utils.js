/**
 * Project utility functions
 */

import { showToast } from '../utils/common.js';
import { api } from '../utils/api.js';

/**
 * Extract project ID from current URL
 * @returns {string|null} - Project ID or null if not found
 */
export function getProjectIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    const projectId = pathParts[pathParts.length - 1];
    return projectId && projectId !== 'new' ? projectId : null;
}

/**
 * Refresh project data and update UI
 * @param {Function} updateCallback - Callback function to update UI with new data
 * @returns {Promise<boolean>} - Success status
 */
export async function refreshProjectData(updateCallback) {
    const projectId = getProjectIdFromUrl();
    if (!projectId) {
        return false;
    }

    try {
        const updatedProject = await api.get(`/projects/${projectId}`);
        if (typeof updateCallback === 'function') {
            updateCallback(updatedProject);
        }
        return true;
    } catch (error) {
        console.error('Error refreshing project data:', error);
        return false;
    }
}

/**
 * Show loading state
 */
export function showLoading() {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) {
        loadingEl.classList.remove('d-none');
    }
}

/**
 * Hide loading state
 */
export function hideLoading() {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) {
        loadingEl.classList.add('d-none');
    }
}

/**
 * Execute function with loading state
 * @param {Function} fn - Function to execute
 * @returns {Promise} - Promise that resolves with the function result
 */
export async function withLoading(fn) {
    try {
        showLoading();
        return await fn();
    } finally {
        hideLoading();
    }
}

/**
 * Calculate total amount for booking
 * @param {number} replacementCost - Equipment replacement cost
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {number} quantity - Equipment quantity
 * @returns {number} - Total amount
 */
export function calculateBookingAmount(replacementCost, startDate, endDate, quantity = 1) {
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    return replacementCost * 0.01 * days * quantity;
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted amount
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Get status text
 * @param {string} status - Status code
 * @returns {string} - Status text
 */
export function getStatusText(status) {
    const statusMap = {
        'draft': 'Черновик',
        'active': 'Активный',
        'completed': 'Завершен',
        'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
}

/**
 * Get status class
 * @param {string} status - Status code
 * @returns {string} - Status class
 */
export function getStatusClass(status) {
    const classMap = {
        'draft': 'secondary',
        'active': 'primary',
        'completed': 'success',
        'cancelled': 'danger'
    };
    return classMap[status] || 'secondary';
}

/**
 * Validate project dates
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {boolean} - Whether dates are valid
 */
export function validateProjectDates(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        showToast('Некорректные даты', 'danger');
        return false;
    }

    if (end < start) {
        showToast('Дата окончания не может быть раньше даты начала', 'danger');
        return false;
    }

    return true;
}

/**
 * Validate project form
 * @param {Object} formData - Form data
 * @returns {boolean} - Whether form is valid
 */
export function validateProjectForm(formData) {
    if (!formData.name?.trim()) {
        showToast('Введите название проекта', 'danger');
        return false;
    }

    if (!formData.client_id) {
        showToast('Выберите клиента', 'danger');
        return false;
    }

    if (!validateProjectDates(formData.start_date, formData.end_date)) {
        return false;
    }

    return true;
}

/**
 * Update status buttons
 * @param {string} currentStatus - Current project status
 */
export function updateStatusButtons(currentStatus) {
    document.querySelectorAll('[data-status]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === currentStatus);
    });
}
