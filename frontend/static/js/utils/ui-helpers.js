/**
 * UI Helper functions
 * Common utilities for UI manipulation across the application
 */

/**
 * Resets the global loader state
 * Ensures the loader is hidden regardless of its current state
 */
export function resetLoader() {
    window.loaderCounter = 0;
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.setAttribute('hidden', '');
        if (getComputedStyle(loader).display !== 'none') {
            loader.style.display = 'none';
        }
    }
    console.log('[UI] Loader state has been forcibly reset');
}

/**
 * Sets button to loading state and returns function to restore original state
 * @param {HTMLButtonElement} button - Button element to modify
 * @param {string} loadingText - Text to display while loading
 * @returns {Function} Function to restore button to original state
 */
export function setButtonLoading(button, loadingText = 'Загрузка...') {
    if (!button) return () => {};

    const originalText = button.innerHTML;
    const originalDisabled = button.disabled;

    button.disabled = true;
    button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${loadingText}`;

    return function restoreButton() {
        button.disabled = originalDisabled;
        button.innerHTML = originalText;
    };
}

/**
 * Helper function for HTML escaping
 * @param {string} str - String to escape
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Shows an inline loading indicator in a table
 * @param {HTMLElement} tableBody - Table body element
 * @param {number} colSpan - Number of columns to span
 * @param {string} message - Loading message to display
 */
export function showTableLoading(tableBody, colSpan, message = 'Загрузка...') {
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="${colSpan}" class="text-center">
                <div class="spinner-border spinner-border-sm text-primary"></div> ${message}
            </td>
        </tr>
    `;
}

/**
 * Shows an error message in a table
 * @param {HTMLElement} tableBody - Table body element
 * @param {number} colSpan - Number of columns to span
 * @param {string} message - Error message to display
 */
export function showTableError(tableBody, colSpan, message = 'Ошибка при загрузке данных') {
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="${colSpan}" class="text-center text-danger">${message}</td>
        </tr>
    `;
}

/**
 * Shows an empty state message in a table
 * @param {HTMLElement} tableBody - Table body element
 * @param {number} colSpan - Number of columns to span
 * @param {string} message - Message to display
 */
export function showTableEmpty(tableBody, colSpan, message = 'Нет данных') {
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="${colSpan}" class="text-center">${message}</td>
        </tr>
    `;
}
