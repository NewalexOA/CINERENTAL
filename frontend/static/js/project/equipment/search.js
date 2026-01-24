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
 * Safely get booking dates from daterangepicker or use fallback values
 * @returns {Object} Object with startDate and endDate in YYYY-MM-DD format
 */
function getBookingDates() {
    try {
        const dateRange = document.getElementById('newBookingPeriod');

        // Check if element exists and daterangepicker is initialized
        if (dateRange && typeof $ !== 'undefined') {
            const daterangepicker = $(dateRange).data('daterangepicker');

            if (daterangepicker && daterangepicker.startDate && daterangepicker.endDate) {
                return {
                    startDate: daterangepicker.startDate.format('YYYY-MM-DD'),
                    endDate: daterangepicker.endDate.format('YYYY-MM-DD')
                };
            }
        }

        // Fallback: use today and tomorrow
        console.warn('DateRangePicker not available, using fallback dates');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return {
            startDate: today.toISOString().split('T')[0],
            endDate: tomorrow.toISOString().split('T')[0]
        };
    } catch (error) {
        console.error('Error getting booking dates:', error);

        // Emergency fallback
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return {
            startDate: today.toISOString().split('T')[0],
            endDate: tomorrow.toISOString().split('T')[0]
        };
    }
}

/**
 * Initialize category filter
 */
export async function initializeCategoryFilter() {
    const categoryFilterSelect = document.getElementById('categoryFilter');
    if (!categoryFilterSelect) return;

    try {
        const categories = await api.get('/categories/');

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
    console.log('=== CATALOG: Setting up pagination buttons ===');

    const prevPageButton = document.getElementById('catalogPrevPage');
    const nextPageButton = document.getElementById('catalogNextPage');

    console.log('CATALOG: prevPageButton found:', !!prevPageButton);
    console.log('CATALOG: nextPageButton found:', !!nextPageButton);

    if (prevPageButton) {
        console.log('CATALOG: Adding click listener to prevPageButton');
        prevPageButton.addEventListener('click', (e) => {
            console.log('=== CATALOG: Previous button clicked! ===');
            console.log('CATALOG: Event:', e);
            console.log('CATALOG: currentPage before:', currentPage);
            console.log('CATALOG: Check (currentPage > 1):', currentPage > 1);
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                console.log('CATALOG: currentPage after decrement:', currentPage);
                console.log('CATALOG: Calling searchEquipmentInCatalog()...');
                searchEquipmentInCatalog();
            } else {
                console.log('CATALOG: Previous button disabled - currentPage is not > 1');
            }
        });
    } else {
        console.warn('CATALOG: catalogPrevPage button not found!');
    }

    if (nextPageButton) {
        console.log('CATALOG: Adding click listener to nextPageButton');
        nextPageButton.addEventListener('click', (e) => {
            console.log('=== CATALOG: Next button clicked! ===');
            console.log('CATALOG: Event:', e);
            console.log('CATALOG: currentPage before:', currentPage);
            console.log('CATALOG: totalPages:', totalPages);
            console.log('CATALOG: Check (currentPage < totalPages):', currentPage < totalPages);
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                console.log('CATALOG: currentPage after increment:', currentPage);
                console.log('CATALOG: Calling searchEquipmentInCatalog()...');
                searchEquipmentInCatalog();
            } else {
                console.log('CATALOG: Next button disabled - currentPage is not < totalPages');
            }
        });
    } else {
        console.warn('CATALOG: catalogNextPage button not found!');
    }

    console.log('CATALOG: Pagination buttons setup complete');

    // AUTO-INITIALIZE: Load catalog data to enable pagination buttons
    console.log('CATALOG: Auto-initializing catalog data...');
    searchEquipmentInCatalog();
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

        const { startDate, endDate } = getBookingDates();

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
        const { startDate, endDate } = getBookingDates();

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

// DEBUG: Test pagination buttons functionality
window.testCatalogPagination = function() {
    console.log('=== TESTING CATALOG PAGINATION ===');
    console.log('Current state:', { currentPage, totalPages, pageSize, totalCount });

    const prevPageButton = document.getElementById('catalogPrevPage');
    const nextPageButton = document.getElementById('catalogNextPage');

    console.log('Elements found:', {
        prevPageButton: !!prevPageButton,
        nextPageButton: !!nextPageButton
    });

    if (prevPageButton) {
        console.log('PrevButton parent classes:', prevPageButton.parentElement.className);
        console.log('PrevButton disabled state:', prevPageButton.parentElement.classList.contains('disabled'));
    }

    if (nextPageButton) {
        console.log('NextButton parent classes:', nextPageButton.parentElement.className);
        console.log('NextButton disabled state:', nextPageButton.parentElement.classList.contains('disabled'));
    }

    console.log('Try clicking nextPageButton manually...');
    if (nextPageButton && !nextPageButton.parentElement.classList.contains('disabled')) {
        nextPageButton.click();
    } else {
        console.log('NextButton is disabled or not found');
    }
};
