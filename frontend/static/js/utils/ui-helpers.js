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

/**
 * Builds a tree structure from a flat list of categories.
 * Each category in the flat list should have an `id` and an optional `parent_id`.
 * @param {Array<Object>} categoriesArray - Flat array of category objects.
 * @returns {Array<Object>} Array of root category objects, each with a `children` array.
 */
export function buildCategoryTree(categoriesArray) {
    const categoryMap = {};
    const categoryTree = [];

    categoriesArray.forEach(category => {
        categoryMap[category.id] = { ...category, children: [] };
    });

    categoriesArray.forEach(category => {
        if (category.parent_id && categoryMap[category.parent_id]) {
            categoryMap[category.parent_id].children.push(categoryMap[category.id]);
        } else {
            categoryTree.push(categoryMap[category.id]);
        }
    });

    return categoryTree;
}

/**
 * Recursively renders category options for a select element, creating a tree-like structure.
 * @param {Array<Object>} categories - Array of category objects (potentially with children).
 * @param {HTMLSelectElement} parentElement - The select element to append options to.
 * @param {number} level - Current depth level for indentation.
 * @param {?number} [selectedCategoryId=null] - Optional ID of the category to be pre-selected.
 */
export function renderCategoriesRecursive(categories, parentElement, level, selectedCategoryId = null) {
    const indent = '&nbsp;&nbsp;'.repeat(level * 2); // Indentation for hierarchy

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.innerHTML = `${indent}${category.name}`;
        if (selectedCategoryId !== null && category.id === selectedCategoryId) {
            option.selected = true;
        }
        parentElement.appendChild(option);

        if (category.children && category.children.length > 0) {
            renderCategoriesRecursive(category.children, parentElement, level + 1, selectedCategoryId);
        }
    });
}
