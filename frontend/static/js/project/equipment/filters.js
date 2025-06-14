/**
 * ProjectEquipmentFilters - Enhanced equipment filtering and pagination
 *
 * DEBUG INSTRUCTIONS:
 * To enable detailed logging for debugging pagination issues, run in browser console:
 *
 * // Enable all logging:
 * window.logger.enable()
 *
 * // Or enable specific components:
 * window.logger.enableComponent('filters', { dataLoad: true })
 * window.logger.enableComponent('pagination', { stateChanges: true })
 *
 * // Disable all logging:
 * window.logger.disable()
 */

/**
 * Project Equipment Filters
 * Provides filtering and pagination for equipment list in project view
 */

import { api } from '../../utils/api.js';
import { showToast } from '../../utils/common.js';
import { initializeBookingPeriodPickers } from './availability.js';
import { initializeActionButtonEventListeners } from './ui.js';
import { Pagination } from '../../utils/pagination.js';

import { getLogConfig } from '../../utils/logger.js';

// Get logging configuration from global logger
const LOG_CONFIG = {
    get filters() {
        return getLogConfig('filters');
    }
};

class ProjectEquipmentFilters {
    constructor(projectId) {
        this.projectId = projectId;
        this.filters = {
            search: '',
            category: '',
            dateFilter: 'all'
        };

        // Initialize pagination component after DOM setup
        this.pagination = null;

        this.init();
    }

    init() {
        this.createFilterUI();
        this.loadCategories();
        this.setupFilterEventListeners();
        this.initializePagination();
    }

    createFilterUI() {
        // Find equipment card by locating the equipmentList element and getting its parent card
        const equipmentList = document.getElementById('equipmentList');
        const equipmentCard = equipmentList?.closest('.card');
        if (!equipmentCard) return;

        const cardBody = equipmentCard.querySelector('.card-body');
        if (!cardBody) return;

        // Add class to table immediately
        const table = cardBody.querySelector('table');
        if (table) {
            table.classList.add('equipment-table');

            // Remove inline width styles from headers that conflict with our CSS
            const headers = table.querySelectorAll('th[style*="width"]');
            headers.forEach(header => {
                // Remove only width from style attribute, keep other styles
                const style = header.getAttribute('style');
                if (style) {
                    const newStyle = style.replace(/width\s*:\s*[^;]+;?/gi, '').trim();
                    if (newStyle) {
                        header.setAttribute('style', newStyle);
                    } else {
                        header.removeAttribute('style');
                    }
                }
            });
        }

        // Equipment table styles are loaded via base.html

        // Create filters container
        const filtersHTML = `
            <div class="enhanced-equipment-filters mb-3">
                <div class="row g-3">
                    <div class="col-md-4">
                        <input type="text" class="form-control" id="equipmentSearchInput"
                               placeholder="Поиск по названию, штрихкоду, серийному номеру">
                    </div>
                    <div class="col-md-3">
                        <select class="form-select" id="equipmentCategoryFilter">
                            <option value="">Все категории</option>
                        </select>
                    </div>
                    <div class="col-md-5">
                        <select class="form-select" id="equipmentDateFilter">
                            <option value="all">Все позиции</option>
                            <option value="different">Отличающиеся даты</option>
                            <option value="matching">Совпадающие даты</option>
                        </select>
                    </div>
                </div>
            </div>

        `;

        // Insert filters before table
        const tableContainer = cardBody.querySelector('.table-responsive');
        if (tableContainer) {
            tableContainer.insertAdjacentHTML('beforebegin', filtersHTML);
        }
    }

    setupFilterEventListeners() {
        // Search input with debounce
        const searchInput = document.getElementById('equipmentSearchInput');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.filters.search = searchInput.value.trim();
                    this.pagination.reset(); // Reset to first page and reload
                }, 300);
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('equipmentCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.filters.category = categoryFilter.value;
                this.pagination.reset(); // Reset to first page and reload
            });
        }

        // Date filter
        const dateFilter = document.getElementById('equipmentDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.filters.dateFilter = dateFilter.value;
                this.pagination.reset(); // Reset to first page and reload
            });
        }
    }

    initializePagination() {
        if (LOG_CONFIG.filters.enabled && LOG_CONFIG.filters.logInit) {
            console.log('=== EQUIPMENT FILTERS: Initializing pagination ===');
        }

        // Check if required DOM elements exist for primary pagination (bottom)
        const requiredElements = [
            '#equipmentBottomPageStart', '#equipmentBottomPageEnd', '#equipmentBottomTotalItems',
            '#equipmentBottomCurrentPage', '#equipmentBottomTotalPages',
            '#equipmentBottomPrevPage', '#equipmentBottomNextPage', '#equipmentBottomPageSize'
        ];
        const missingElements = [];

        requiredElements.forEach(selector => {
            const element = document.querySelector(selector);
            if (!element) {
                missingElements.push(selector);
            }
        });

        if (missingElements.length > 0) {
            console.error('EQUIPMENT FILTERS: Missing required elements:', missingElements);
            return;
        }

        if (LOG_CONFIG.filters.enabled && LOG_CONFIG.filters.logInit) {
            console.log('EQUIPMENT FILTERS: All required elements found');
        }

        // Create primary pagination (bottom) - this one controls the data
        this.pagination = new Pagination({
            selectors: {
                pageStart: '#equipmentBottomPageStart',
                pageEnd: '#equipmentBottomPageEnd',
                totalItems: '#equipmentBottomTotalItems',
                currentPage: '#equipmentBottomCurrentPage',
                totalPages: '#equipmentBottomTotalPages',
                prevButton: '#equipmentBottomPrevPage',
                nextButton: '#equipmentBottomNextPage',
                pageSizeSelect: '#equipmentBottomPageSize'
            },
            options: {
                pageSize: 20,
                pageSizes: [20, 50, 'all'],
                showPageInfo: true,
                showPageSizeSelect: true,
                autoLoadOnInit: true, // Enable automatic data loading on initialization
                persistPageSize: true, // Enable page size persistence
                storageKey: `project_equipment_pagesize_${this.projectId}`, // Unique key per project
                useUrlParams: false // Disabled for now, can be enabled later
            },
            callbacks: {
                onDataLoad: async (page, size) => {
                    if (LOG_CONFIG.filters.enabled && LOG_CONFIG.filters.logDataLoad) {
                        console.log('EQUIPMENT FILTERS: Loading data for page:', page, 'size:', size);
                    }
                    return await this.loadEquipmentData(page, size);
                }
            }
        });

        // Add secondary pagination (top) that syncs with primary
        this.pagination.addSecondaryPagination({
            pageStart: '#equipmentTopPageStart',
            pageEnd: '#equipmentTopPageEnd',
            totalItems: '#equipmentTopTotalItems',
            currentPage: '#equipmentTopCurrentPage',
            totalPages: '#equipmentTopTotalPages',
            prevButton: '#equipmentTopPrevPage',
            nextButton: '#equipmentTopNextPage',
            pageSizeSelect: '#equipmentTopPageSize'
        });

        if (LOG_CONFIG.filters.enabled && LOG_CONFIG.filters.logInit) {
            console.log('EQUIPMENT FILTERS: Pagination instance created:', this.pagination);
        }

        // Data will be loaded automatically due to autoLoadOnInit: true
    }

    async loadCategories() {
        try {
            const categories = await api.get('/categories');
            const categorySelect = document.getElementById('equipmentCategoryFilter');

            if (categorySelect && categories) {
                // Clear existing options except first
                while (categorySelect.options.length > 1) {
                    categorySelect.remove(1);
                }

                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadEquipmentData(page, size) {
        try {
            // Build query parameters
            const params = new URLSearchParams({
                page: page,
                size: size
            });

            if (this.filters.search) {
                params.append('query', this.filters.search);
            }
            if (this.filters.category) {
                params.append('category_id', this.filters.category);
            }
            if (this.filters.dateFilter !== 'all') {
                params.append('date_filter', this.filters.dateFilter);
            }

            // Use the new paginated endpoint
            const response = await api.get(`/projects/${this.projectId}/bookings/paginated?${params.toString()}`);

            // Log API response using global logger
            if (LOG_CONFIG.filters.enabled && LOG_CONFIG.filters.dataLoad) {
                console.log('EQUIPMENT FILTERS: API Response:', {
                    url: `/projects/${this.projectId}/bookings/paginated?${params.toString()}`,
                    params: { page, size, filters: this.filters },
                    response: response,
                    structure: {
                        items: response.items?.length || 0,
                        total: response.total,
                        pages: response.pages,
                        page: response.page,
                        size: response.size
                    }
                });
            }

            // Update equipment table with new data and total count
            this.updateEquipmentTable(response.items, response.total);

            // Return pagination data for the Pagination component
            // Calculate pages if not provided or incorrect
            const calculatedPages = size === 'all' ? 1 : Math.ceil((response.total || 0) / size);

            if (LOG_CONFIG.filters.enabled && LOG_CONFIG.filters.dataLoad) {
                console.log('EQUIPMENT FILTERS: Pagination calculation:', {
                    originalPages: response.pages,
                    calculatedPages: calculatedPages,
                    finalPages: response.pages || calculatedPages
                });
            }

            const result = {
                items: response.items,
                total: response.total,
                pages: response.pages || calculatedPages,
                page: response.page
            };

            if (LOG_CONFIG.filters.enabled && LOG_CONFIG.filters.dataLoad) {
                console.log('EQUIPMENT FILTERS: Final result:', result);
            }

            return result;

        } catch (error) {
            console.error('Error loading equipment data:', error);
            showToast('Ошибка загрузки списка оборудования', 'danger');
            throw error; // Re-throw for pagination component error handling
        }
    }

    updateEquipmentTable(bookings, total) {
        const tbody = document.getElementById('equipmentList');
        if (!tbody) return;

        // Clear existing rows
        tbody.innerHTML = '';

        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Нет оборудования</td></tr>';
            return;
        }

        bookings.forEach(booking => {
            const row = this.createEquipmentRow(booking);
            tbody.appendChild(row);
        });

        // Update equipment count with actual total from API response
        const countElement = document.getElementById('equipmentCount');
        if (countElement) {
            countElement.textContent = `${total || 0} позиций`;
        }

        // Initialize date pickers for booking period inputs
        setTimeout(() => {
            initializeBookingPeriodPickers();
            // Reinitialize action button event listeners after pagination
            initializeActionButtonEventListeners();
        }, 100);
    }

    createEquipmentRow(booking) {
        const row = document.createElement('tr');
        row.dataset.bookingId = booking.id;
        row.dataset.hasSerialNumber = booking.serial_number ? 'true' : 'false';
        row.dataset.equipmentId = booking.equipment_id;

        const hasSerialNumber = booking.serial_number && booking.serial_number.trim().length > 0;
        const equipmentName = booking.equipment_name || 'Неизвестное оборудование';
        const equipmentId = booking.equipment_id;

        row.innerHTML = `
            <td>
                <div>${equipmentId ? `<a href="/equipment/${equipmentId}">${equipmentName}</a>` : equipmentName}${booking.quantity > 1 ? ` (x${booking.quantity})` : ''}</div>
                <small class="text-muted"><i class="fas fa-barcode me-1"></i>${booking.barcode || ''}</small>
                ${booking.serial_number ? `<small class="text-muted d-block">S/N: ${booking.serial_number}</small>` : ''}
            </td>
            <td>
                <div>${booking.category_name || 'Без категории'}</div>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm booking-period-input"
                       data-booking-id="${booking.id}"
                       data-start-date="${booking.start_date}"
                       data-end-date="${booking.end_date}"
                       value="${this.formatDateTime(booking.start_date)} - ${this.formatDateTime(booking.end_date)}"
                       placeholder="ДД.ММ.ГГГГ ЧЧ:ММ - ДД.ММ.ГГГГ ЧЧ:ММ">
            </td>
            <td class="text-center quantity">${booking.quantity}</td>
            <td class="text-center">
                <div class="btn-group btn-group-sm" role="group">
                    ${hasSerialNumber ?
                        `<button class="btn btn-outline-danger remove-booking-btn" title="Удалить">
                            <i class="fas fa-times"></i>
                        </button>` :
                        `<button class="btn btn-outline-secondary quantity-increase-btn" title="Увеличить кол-во">
                            <i class="fas fa-plus"></i>
                        </button>
                        ${booking.quantity > 1 ?
                            `<button class="btn btn-outline-secondary quantity-decrease-btn" title="Уменьшить кол-во">
                                <i class="fas fa-minus"></i>
                            </button>` :
                            `<button class="btn btn-outline-danger remove-booking-btn" title="Удалить">
                                <i class="fas fa-times"></i>
                            </button>`
                        }`
                    }
                </div>
            </td>
            <td class="equipment-dates-cell" style="display: none;">
                ${booking.has_different_dates ? `<small class="text-info">${this.formatDateTime(booking.start_date)} - ${this.formatDateTime(booking.end_date)}</small>` : ''}
            </td>
        `;

        return row;
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }
}

// Initialize filters when called
export function initializeProjectEquipmentFilters() {
    const projectIdElement = document.getElementById('project-id');
    const projectId = projectIdElement ? projectIdElement.value : null;

    if (projectId) {
        window.projectEquipmentFilters = new ProjectEquipmentFilters(projectId);
    }
}

// DEBUG: Test equipment pagination functionality
window.testEquipmentPagination = function() {
    console.log('=== TESTING EQUIPMENT PAGINATION ===');

    const prevPageButton = document.getElementById('equipmentPrevPage');
    const nextPageButton = document.getElementById('equipmentNextPage');

    console.log('Elements found:', {
        prevPageButton: !!prevPageButton,
        nextPageButton: !!nextPageButton
    });

    if (prevPageButton) {
        console.log('PrevButton classes:', prevPageButton.className);
        console.log('PrevButton disabled state:', prevPageButton.disabled);
        console.log('PrevButton parent classes:', prevPageButton.parentElement?.className);
    }

    if (nextPageButton) {
        console.log('NextButton classes:', nextPageButton.className);
        console.log('NextButton disabled state:', nextPageButton.disabled);
        console.log('NextButton parent classes:', nextPageButton.parentElement?.className);
    }

    if (window.projectEquipmentFilters && window.projectEquipmentFilters.pagination) {
        const state = window.projectEquipmentFilters.pagination.getState();
        console.log('Pagination state:', state);

        console.log('Try clicking nextPageButton manually...');
        if (nextPageButton && !nextPageButton.disabled) {
            nextPageButton.click();
        } else {
            console.log('NextButton is disabled or not found');
        }
    } else {
        console.log('projectEquipmentFilters instance not found');
    }
};

export { ProjectEquipmentFilters };
