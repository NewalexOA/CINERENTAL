/**
 * Equipment search functionality
 */

import { api } from '../../utils/api.js';
import { showToast } from '../../utils/common.js';
import { displaySearchResults, updatePaginationUI } from './ui.js';

// Search state
let currentPage = 1;
let totalPages = 1;
let pageSize = 20;
let totalCount = 0;
let searchDebounceTimer;

/**
 * Initialize category filter
 */
export async function initializeCategoryFilter() {
    const categoryFilterSelect = document.getElementById('categoryFilter');
    if (!categoryFilterSelect) return;

    try {
        const categories = await api.get('/categories');

        // Clear existing options except the first one
        while (categoryFilterSelect.options.length > 1) {
            categoryFilterSelect.remove(1);
        }

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryFilterSelect.appendChild(option);
        });

        categoryFilterSelect.addEventListener('change', () => {
            currentPage = 1;
            searchEquipmentInCatalog();
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('Ошибка загрузки категорий', 'warning');
    }
}

/**
 * Setup search input with debounce (unified search field)
 */
export function setupSearchInput() {
    const searchInput = document.getElementById('barcodeInput');
    if (searchInput) {
        // Debounced search on input
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            const query = searchInput.value.trim();
            if (query.length === 0 || query.length >= 3) {
                searchDebounceTimer = setTimeout(() => {
                    currentPage = 1;
                    searchEquipmentInCatalog();
                }, 500);
            }
        });

        // Immediate search on Enter
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    // Try barcode search first, fallback to catalog search
                    searchEquipmentByBarcode().catch(() => {
                        searchEquipmentInCatalog();
                    });
                }
            }
        });
    }
}

/**
 * Setup pagination buttons
 */
export function setupPaginationButtons() {
    const prevPageButton = document.getElementById('catalogPrevPage');
    const nextPageButton = document.getElementById('catalogNextPage');

    if (prevPageButton) {
        prevPageButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                searchEquipmentInCatalog();
            }
        });
    }

    if (nextPageButton) {
        nextPageButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                searchEquipmentInCatalog();
            }
        });
    }
}

/**
 * Search equipment by barcode
 */
export async function searchEquipmentByBarcode() {
    const barcodeInput = document.getElementById('barcodeInput');
    const barcode = barcodeInput.value.trim();

    if (!barcode) {
        showToast('Введите штрих-код', 'warning');
        return;
    }

    try {
        const equipment = await api.get(`/equipment/barcode/${barcode}`);

        const dateRange = document.getElementById('newBookingPeriod');
        const dates = $(dateRange).data('daterangepicker');
        const startDate = dates.startDate.format('YYYY-MM-DD');
        const endDate = dates.endDate.format('YYYY-MM-DD');

        const availability = await api.get(`/equipment/${equipment.id}/availability`, {
            start_date: startDate,
            end_date: endDate
        });

        displaySearchResults([{
            ...equipment,
            availability: availability
        }]);
    } catch (error) {
        console.error('Error searching by barcode:', error);
        showToast('Оборудование не найдено или произошла ошибка', 'danger');
    }
}

/**
 * Search equipment in catalog (unified search field)
 */
export async function searchEquipmentInCatalog() {
    const searchInput = document.getElementById('barcodeInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchSpinner = document.getElementById('search-spinner');

    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (query.length > 0 && query.length < 3) return;

    try {
        if (searchSpinner) searchSpinner.classList.remove('d-none');

        const params = new URLSearchParams({
            page: currentPage,
            size: pageSize
        });

        if (query) params.append('query', query);
        if (categoryFilter?.value) params.append('category_id', categoryFilter.value);

        const response = await api.get(`/equipment/paginated?${params.toString()}`);

        totalCount = response.total;
        totalPages = response.pages;
        currentPage = response.page;
        pageSize = response.size;

        // Check availability for each equipment item
        const dateRange = document.getElementById('newBookingPeriod');
        const dates = $(dateRange).data('daterangepicker');
        const startDate = dates.startDate.format('YYYY-MM-DD');
        const endDate = dates.endDate.format('YYYY-MM-DD');

        // Show loading state while checking availability
        if (searchSpinner) {
            searchSpinner.innerHTML = '<div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Проверка доступности...</span></div>';
        }

        // Check availability for all items in parallel
        const equipmentWithAvailability = await Promise.all(
            response.items.map(async (equipment) => {
                try {
                    const availability = await api.get(`/equipment/${equipment.id}/availability`, {
                        start_date: startDate,
                        end_date: endDate
                    });
                    return {
                        ...equipment,
                        availability: availability
                    };
                } catch (error) {
                    console.error(`Error checking availability for equipment ${equipment.id}:`, error);
                    // If availability check fails, assume available
                    return {
                        ...equipment,
                        availability: { is_available: true }
                    };
                }
            })
        );

        displaySearchResults(equipmentWithAvailability);
        updatePaginationUI();
    } catch (error) {
        console.error('Error searching equipment:', error);
        showToast('Ошибка при поиске оборудования', 'danger');
        displaySearchResults([]);
    } finally {
        if (searchSpinner) searchSpinner.classList.add('d-none');
    }
}

export { currentPage, totalPages, pageSize, totalCount };
