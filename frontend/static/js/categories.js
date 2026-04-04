/**
 * Categories management module.
 * Handles CRUD operations for categories.
 */

import { api } from './utils/api.js';
import { showToast } from './utils/common.js';
import {
    resetLoader,
    setButtonLoading,
    escapeHtml,
    showTableLoading,
    showTableError,
    showTableEmpty
} from './utils/ui-helpers.js';
import {
    loadSubcategories,
    renderSubcategories,
    addSubcategory,
    updateSubcategory
} from './subcategories.js';

/**
 * Load categories without using global loader
 */
async function loadCategoriesWithoutGlobalLoader() {
    console.group('[Categories] Loading Categories');
    try {
        console.log('[Categories] Fetching categories from API...');
        const categories = await api.get('/categories/with-equipment-count');
        console.log('[Categories] Categories loaded:', categories);
        const table = document.getElementById('categoriesTable');

        if (!table) {
            console.error('[Categories] Table element not found!');
            return;
        }

        table.innerHTML = '';

        if (!categories || categories.length === 0) {
            console.warn('[Categories] No categories found');
            showTableEmpty(table, 4, 'Нет категорий');
            return;
        }

        console.log(`[Categories] Rendering ${categories.length} categories`);
        categories.forEach(category => {
            console.log('[Categories] Rendering category:', category.id, category);

            const row = document.createElement('tr');
            row.setAttribute('data-category-id', category.id);
            row.innerHTML = `
                <td>${category.id}</td>
                <td>${escapeHtml(category.name)}</td>
                <td>${category.equipment_count || 0}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary subcategories-btn"
                            data-category-id="${category.id}"
                            data-category-name="${escapeHtml(category.name)}">
                        Подкатегории
                    </button>
                    <button class="btn btn-sm btn-outline-primary edit-category"
                            data-category-id="${category.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-category"
                            data-category-id="${category.id}"
                            data-category-name="${escapeHtml(category.name)}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            table.appendChild(row);
        });

        // Add event listeners
        attachCategoryEventListeners();
    } catch (error) {
        console.error('[Categories] Failed to load categories:', error);
        const table = document.getElementById('categoriesTable');
        if (table) {
            showTableError(table, 4, 'Ошибка при загрузке категорий');
        }
        showToast('Ошибка при загрузке категорий', 'danger');
    } finally {
        console.groupEnd();
    }
}

/**
 * Attach event listeners to category buttons
 */
function attachCategoryEventListeners() {
    document.querySelectorAll('.edit-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = e.target.closest('button').dataset.categoryId;
            openEditCategoryModal(categoryId);
        });
    });

    document.querySelectorAll('.delete-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = e.target.closest('button').dataset.categoryId;
            const categoryName = e.target.closest('button').dataset.categoryName;
            deleteCategory(categoryId, categoryName);
        });
    });

    document.querySelectorAll('.subcategories-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const categoryId = e.target.dataset.categoryId;
            const categoryName = e.target.dataset.categoryName;
            openSubcategoriesModal(categoryId, categoryName);
        });
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    console.log('[Categories] Setting up event listeners');

    // Add category
    document.getElementById('addCategory').addEventListener('click', addCategory);

    // Edit category
    document.getElementById('updateCategory').addEventListener('click', updateCategory);

    // Add subcategory
    document.getElementById('addSubcategoryBtn').addEventListener('click', () => {
        console.log('[Categories] Opening add subcategory form');
        document.getElementById('addSubcategoryForm').style.display = 'block';
        document.getElementById('editSubcategoryForm').style.display = 'none';
    });

    document.getElementById('cancelSubcategory').addEventListener('click', () => {
        console.log('[Categories] Canceling add subcategory');
        document.getElementById('addSubcategoryForm').style.display = 'none';
    });

    document.getElementById('saveSubcategory').addEventListener('click', addSubcategory);

    // Cancel subcategory editing
    document.getElementById('cancelEditSubcategory').addEventListener('click', () => {
        console.log('[Categories] Canceling edit subcategory');
        document.getElementById('editSubcategoryForm').style.display = 'none';
    });

    // Update subcategory
    document.getElementById('updateSubcategory').addEventListener('click', updateSubcategory);

    // Event handlers for closing modals
    const modals = [
        'addCategoryModal', 'editCategoryModal', 'subcategoriesModal'
    ];

    modals.forEach(modalId => {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) return;

        // Reset loader when modal is shown
        modalElement.addEventListener('show.bs.modal', () => {
            console.log(`[Categories] Opening modal: ${modalId}`);
            resetLoader();
        });

        // Reset loader when modal is hidden
        modalElement.addEventListener('hidden.bs.modal', () => {
            console.log(`[Categories] Closing modal: ${modalId}`);
            resetLoader();
        });

        // Additional safety: reset loader on backdrop click
        modalElement.addEventListener('click', (event) => {
            if (event.target === modalElement) {
                console.log(`[Categories] Modal backdrop clicked: ${modalId}`);
                resetLoader();
            }
        });
    });

    // Loader failsafe check
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const loader = document.getElementById('global-loader');
            if (loader && !loader.hasAttribute('hidden')) {
                console.warn('Modal closed with Escape key, forcing loader reset');
                resetLoader();
            }
        }
    });

    // Safety: when page is loaded and when navigating to other pages
    window.addEventListener('beforeunload', resetLoader);
    window.addEventListener('pageshow', resetLoader);

    // Additional safety: periodically check for loader being visible too long
    setInterval(() => {
        const loader = document.getElementById('global-loader');
        if (loader && !loader.hasAttribute('hidden')) {
            const loaderTimestamp = parseInt(loader.dataset.timestamp || '0');
            const currentTime = Date.now();

            // If loader has been visible for more than 3 seconds, reset it
            if (currentTime - loaderTimestamp > 3000) {
                console.warn('Loader has been visible for too long, resetting');
                resetLoader();
            }
        }
    }, 3000);

    console.log('[Categories] Event listeners setup completed');
}

/**
 * Add category
 */
async function addCategory() {
    console.log('[Categories] Adding new category');
    const form = document.getElementById('addCategoryForm');
    const data = {
        name: form.elements.name.value,
        description: form.elements.description.value,
        show_in_print_overview: form.elements.show_in_print_overview.checked
    };

    // Validation
    if (!data.name.trim()) {
        console.warn('[Categories] Add category validation failed: empty name');
        showToast('Необходимо указать название категории', 'warning');
        return;
    }

    // Change button state to loading
    const addButton = document.getElementById('addCategory');
    const restoreButton = setButtonLoading(addButton, 'Добавление...');

    try {
        console.log('[Categories] Sending add category request:', data);
        const response = await api.post('/categories/', data);
        console.log('[Categories] Category added successfully:', response);
        showToast('Категория успешно добавлена', 'success');

        // Reset form and close modal
        form.reset();
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'));
        modal.hide();

        // Reload categories
        await loadCategoriesWithoutGlobalLoader();
    } catch (error) {
        console.error('[Categories] Error adding category:', error);
        showToast('Ошибка при добавлении категории', 'danger');
    } finally {
        // Restore button state
        restoreButton();
    }
}

/**
 * Open edit category modal
 */
async function openEditCategoryModal(categoryId) {
    console.log(`[Categories] Opening edit modal for category ${categoryId}`);
    try {
        const category = await api.get(`/categories/${categoryId}`);
        console.log('[Categories] Category data loaded:', category);

        const form = document.getElementById('editCategoryForm');
        form.elements.id.value = category.id;
        form.elements.name.value = category.name;
        form.elements.description.value = category.description || '';
        form.elements.show_in_print_overview.checked = category.show_in_print_overview;

        const modal = new bootstrap.Modal(document.getElementById('editCategoryModal'));
        modal.show();
    } catch (error) {
        console.error('[Categories] Error loading category for editing:', error);
        showToast('Ошибка при загрузке категории', 'danger');
    }
}

/**
 * Update category
 */
async function updateCategory() {
    console.log('[Categories] Updating category');
    const form = document.getElementById('editCategoryForm');
    const categoryId = form.elements.id.value;
    const data = {
        name: form.elements.name.value,
        description: form.elements.description.value,
        show_in_print_overview: form.elements.show_in_print_overview.checked
    };

    // Validation
    if (!data.name.trim()) {
        console.warn('[Categories] Update category validation failed: empty name');
        showToast('Необходимо указать название категории', 'warning');
        return;
    }

    // Change button state to loading
    const updateButton = document.getElementById('updateCategory');
    const restoreButton = setButtonLoading(updateButton, 'Сохранение...');

    try {
        console.log(`[Categories] Sending update request for category ${categoryId}:`, data);
        await api.put(`/categories/${categoryId}`, data);
        console.log('[Categories] Category updated successfully');
        showToast('Категория успешно обновлена', 'success');

        // Close modal and update category list
        const modal = bootstrap.Modal.getInstance(document.getElementById('editCategoryModal'));
        modal.hide();

        await loadCategoriesWithoutGlobalLoader();
    } catch (error) {
        console.error('[Categories] Error updating category:', error);
        showToast('Ошибка при обновлении категории', 'danger');
    } finally {
        // Restore button state
        restoreButton();
    }
}

/**
 * Open subcategories modal
 */
async function openSubcategoriesModal(categoryId, categoryName) {
    console.log(`[Categories] Opening subcategories modal for category ${categoryId} (${categoryName})`);
    try {
        // Prepare modal content
        document.getElementById('categoryName').textContent = categoryName || '';
        document.getElementById('subcategoryCategoryId').value = categoryId || '';
        document.getElementById('addSubcategoryForm').style.display = 'none';
        document.getElementById('editSubcategoryForm').style.display = 'none';

        const table = document.getElementById('subcategoriesTable');
        showTableLoading(table, 3, 'Загрузка подкатегорий...');

        // Show modal first for better UX
        const modal = new bootstrap.Modal(document.getElementById('subcategoriesModal'));
        modal.show();

        // Load data after modal animation completes
        setTimeout(async () => {
            try {
                console.log(`[Categories] Loading subcategories for category ${categoryId}`);
                const subcategories = await loadSubcategories(categoryId);
                renderSubcategories(subcategories);
            } catch (error) {
                console.error('[Categories] Error loading subcategories:', error);
                showTableError(table, 3, 'Ошибка при загрузке подкатегорий');
                showToast('Ошибка при загрузке подкатегорий', 'danger');
            }
        }, 300);
    } catch (error) {
        console.error('[Categories] Error in modal preparation:', error);
        showToast('Ошибка при открытии модального окна', 'danger');
        resetLoader();
    }
}

/**
 * Delete category
 */
async function deleteCategory(categoryId, categoryName) {
    console.log(`[Categories] Attempting to delete category ${categoryId} (${categoryName})`);
    if (!confirm(`Вы уверены, что хотите удалить категорию "${categoryName}"?`)) {
        console.log('[Categories] Category deletion cancelled by user');
        return;
    }

    // Find the row and add loading overlay
    const row = document.querySelector(`tr[data-category-id="${categoryId}"]`);
    if (row) {
        row.style.opacity = '0.5';
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'position-absolute top-0 left-0 w-100 h-100 d-flex justify-content-center align-items-center';
        loadingOverlay.innerHTML = '<div class="spinner-border spinner-border-sm text-primary"></div>';
        row.style.position = 'relative';
        row.appendChild(loadingOverlay);
    }

    try {
        console.log(`[Categories] Sending delete request for category ${categoryId}`);
        await api.delete(`/categories/${categoryId}`);
        console.log('[Categories] Category deleted successfully');
        showToast('Категория успешно удалена', 'success');
        await loadCategoriesWithoutGlobalLoader();
    } catch (error) {
        console.error('[Categories] Error deleting category:', error);
        showToast('Ошибка при удалении категории', 'danger');

        // Restore row appearance on error
        if (row) {
            row.style.opacity = '';
            const loadingOverlay = row.querySelector('div.position-absolute');
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
        }
    }
}

/**
 * Initialize categories page
 */
function initializeCategories() {
    console.log('%c[Categories] Initializing categories page', 'background: #222; color: #bada55; font-size: 16px;');

    // First ensure loader is reset and hidden
    resetLoader();
    console.log('[Categories] Loader reset completed');

    // Use inline loading indicator instead of global loader
    const table = document.getElementById('categoriesTable');
    if (table) {
        showTableLoading(table, 4, 'Загрузка категорий...');
    }

    // Load categories without using global loader
    loadCategoriesWithoutGlobalLoader();
    setupEventListeners();
    console.log('[Categories] Initialization completed');
}

// Initialize categories when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeCategories);

// Export functions for potential reuse in other modules
export {
    initializeCategories,
    loadCategoriesWithoutGlobalLoader
};
