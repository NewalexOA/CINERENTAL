/**
 * Subcategories management module
 * Handles operations for subcategories
 */

import { api } from './utils/api.js';
import { showToast } from './utils/common.js';
import {
    setButtonLoading,
    escapeHtml,
    showTableLoading,
    showTableError,
    showTableEmpty
} from './utils/ui-helpers.js';

/**
 * Load subcategories for a given category
 * @param {number} categoryId - Parent category ID
 * @returns {Promise<Array>} - Array of subcategories
 */
export async function loadSubcategories(categoryId) {
    try {
        const subcategories = await api.get(`/categories/${categoryId}/subcategories`);
        return subcategories;
    } catch (error) {
        console.error('[Subcategories] Error loading subcategories:', error);
        showToast('Ошибка при загрузке подкатегорий', 'danger');
        throw error;
    }
}

/**
 * Render subcategories in the table
 * @param {Array} subcategories - Array of subcategory objects
 * @param {HTMLElement} table - Table element to render into
 */
export function renderSubcategories(subcategories, table = document.getElementById('subcategoriesTable')) {
    if (!table) {
        console.error('[Subcategories] Table element not found');
        return;
    }

    table.innerHTML = '';

    if (!subcategories || subcategories.length === 0) {
        showTableEmpty(table, 3, 'Нет подкатегорий');
        return;
    }

    subcategories.forEach(subcategory => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${subcategory.id}</td>
            <td>${escapeHtml(subcategory.name)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary edit-subcategory"
                        data-subcategory-id="${subcategory.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-subcategory"
                        data-subcategory-id="${subcategory.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        table.appendChild(row);
    });

    // Add event listeners for editing and deleting subcategories
    attachSubcategoryEventListeners();
}

/**
 * Attach event listeners to subcategory action buttons
 */
function attachSubcategoryEventListeners() {
    document.querySelectorAll('.edit-subcategory').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const subcategoryId = e.target.closest('button').dataset.subcategoryId;
            openEditSubcategoryForm(subcategoryId);
        });
    });

    document.querySelectorAll('.delete-subcategory').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const subcategoryId = e.target.closest('button').dataset.subcategoryId;
            deleteSubcategory(subcategoryId);
        });
    });
}

/**
 * Add a new subcategory
 * @returns {Promise<void>}
 */
export async function addSubcategory() {
    console.log('[Subcategories] Adding new subcategory');
    const categoryId = document.getElementById('subcategoryCategoryId').value;
    const name = document.getElementById('subcategoryName').value;

    // Validation
    if (!name.trim()) {
        console.warn('[Subcategories] Add subcategory validation failed: empty name');
        showToast('Необходимо указать название подкатегории', 'warning');
        return;
    }

    const saveButton = document.getElementById('saveSubcategory');
    const restoreButton = setButtonLoading(saveButton, 'Сохранение...');

    try {
        const data = {
            parent_id: parseInt(categoryId),
            name: name,
            description: ''
        };
        console.log('[Subcategories] Sending add subcategory request:', data);
        await api.post('/categories/', data);
        console.log('[Subcategories] Subcategory added successfully');
        showToast('Подкатегория успешно добавлена', 'success');

        // Reset form and update list
        document.getElementById('subcategoryName').value = '';
        document.getElementById('addSubcategoryForm').style.display = 'none';

        const subcategories = await loadSubcategories(categoryId);
        renderSubcategories(subcategories);
    } catch (error) {
        console.error('[Subcategories] Error adding subcategory:', error);
        showToast('Ошибка при добавлении подкатегории', 'danger');
    } finally {
        restoreButton();
    }
}

/**
 * Open the edit subcategory form
 * @param {number} subcategoryId - ID of the subcategory to edit
 */
export async function openEditSubcategoryForm(subcategoryId) {
    const table = document.getElementById('subcategoriesTable');
    showTableLoading(table, 3, 'Загрузка...');

    try {
        const subcategory = await api.get(`/categories/${subcategoryId}`);

        // Restore table and populate form
        const categoryId = document.getElementById('subcategoryCategoryId').value;
        const subcategories = await loadSubcategories(categoryId);
        renderSubcategories(subcategories);

        document.getElementById('editSubcategoryId').value = subcategory.id;
        document.getElementById('editSubcategoryName').value = subcategory.name;

        document.getElementById('editSubcategoryForm').style.display = 'block';
        document.getElementById('addSubcategoryForm').style.display = 'none';
    } catch (error) {
        console.error('[Subcategories] Error loading subcategory:', error);
        showToast('Ошибка при загрузке подкатегории', 'danger');

        // Restore table on error
        const categoryId = document.getElementById('subcategoryCategoryId').value;
        try {
            const subcategories = await loadSubcategories(categoryId);
            renderSubcategories(subcategories);
        } catch (e) {
            showTableError(document.getElementById('subcategoriesTable'), 3, 'Не удалось загрузить подкатегории');
        }
    }
}

/**
 * Update a subcategory
 */
export async function updateSubcategory() {
    console.log('[Subcategories] Updating subcategory');
    const subcategoryId = document.getElementById('editSubcategoryId').value;
    const name = document.getElementById('editSubcategoryName').value;

    // Validation
    if (!name.trim()) {
        console.warn('[Subcategories] Update subcategory validation failed: empty name');
        showToast('Необходимо указать название подкатегории', 'warning');
        return;
    }

    const updateButton = document.getElementById('updateSubcategory');
    const restoreButton = setButtonLoading(updateButton, 'Обновление...');

    try {
        console.log(`[Subcategories] Loading current subcategory data for ${subcategoryId}`);
        const subcategory = await api.get(`/categories/${subcategoryId}`);

        const data = {
            name,
            description: subcategory.description,
            parent_id: subcategory.parent_id
        };

        console.log(`[Subcategories] Sending update request for subcategory ${subcategoryId}:`, data);
        await api.put(`/categories/${subcategoryId}`, data);
        console.log('[Subcategories] Subcategory updated successfully');
        showToast('Подкатегория успешно обновлена', 'success');

        document.getElementById('editSubcategoryForm').style.display = 'none';

        const categoryId = document.getElementById('subcategoryCategoryId').value;
        const subcategories = await loadSubcategories(categoryId);
        renderSubcategories(subcategories);
    } catch (error) {
        console.error('[Subcategories] Error updating subcategory:', error);
        showToast('Ошибка при обновлении подкатегории', 'danger');
    } finally {
        restoreButton();
    }
}

/**
 * Delete a subcategory
 * @param {number} subcategoryId - ID of the subcategory to delete
 */
export async function deleteSubcategory(subcategoryId) {
    console.log(`[Subcategories] Attempting to delete subcategory ${subcategoryId}`);
    if (!confirm('Вы уверены, что хотите удалить эту подкатегорию?\n\nВнимание: Это помечает подкатегорию как удаленную. Подкатегория не будет видна в списке, но данные сохранятся в системе.')) {
        console.log('[Subcategories] Subcategory deletion cancelled by user');
        return;
    }

    const table = document.getElementById('subcategoriesTable');
    showTableLoading(table, 3, 'Удаление...');

    try {
        console.log(`[Subcategories] Sending delete request for subcategory ${subcategoryId}`);
        await api.delete(`/categories/${subcategoryId}`);
        console.log('[Subcategories] Subcategory deleted successfully');
        showToast('Подкатегория успешно удалена', 'success');

        const categoryId = document.getElementById('subcategoryCategoryId').value;
        const subcategories = await loadSubcategories(categoryId);
        renderSubcategories(subcategories);
    } catch (error) {
        console.error('[Subcategories] Error deleting subcategory:', error);

        // Try to extract more detailed error message
        let errorMessage = 'Ошибка при удалении подкатегории';
        if (error.response && error.response.data && error.response.data.detail) {
            if (typeof error.response.data.detail === 'string') {
                errorMessage = error.response.data.detail;
            }
        }

        showToast(errorMessage, 'danger');

        // Restore table on error
        const categoryId = document.getElementById('subcategoryCategoryId').value;
        try {
            const subcategories = await loadSubcategories(categoryId);
            renderSubcategories(subcategories);
        } catch (e) {
            console.error('[Subcategories] Error reloading subcategories after deletion error:', e);
            showTableError(table, 3, 'Не удалось загрузить подкатегории');
        }
    }
}
