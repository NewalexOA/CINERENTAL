/**
 * Project Equipment Filters
 * Provides filtering and pagination for equipment list in project view
 */

import { api } from '../../utils/api.js';
import { showToast } from '../../utils/common.js';
import { initializeBookingPeriodPickers } from './availability.js';
import { initializeActionButtonEventListeners } from './ui.js';
import { Pagination } from '../../utils/pagination.js';

// Logging configuration
const LOG_CONFIG = {
    filters: {
        enabled: false, // Set to true for development debugging
        logInit: false,
        logDataLoad: false
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
        const equipmentCard = document.querySelector('.card:has(#equipmentList)');
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

        // Add CSS for Bootstrap grid-based table layout
        const style = document.createElement('style');
        style.textContent = `
            .equipment-table {
                table-layout: fixed !important;
                width: 100% !important;
            }
            .equipment-table th:nth-child(1),
            .equipment-table td:nth-child(1) {
                width: 33.33% !important; /* 4/12 */
            }
            .equipment-table th:nth-child(2),
            .equipment-table td:nth-child(2) {
                width: 16.67% !important; /* 2/12 */
            }
            .equipment-table th:nth-child(3),
            .equipment-table td:nth-child(3) {
                width: 16.67% !important; /* 2/12 */
            }
            .equipment-table th:nth-child(4),
            .equipment-table td:nth-child(4) {
                width: 8.33% !important; /* 1/12 */
                text-align: center;
            }
            .equipment-table th:nth-child(5),
            .equipment-table td:nth-child(5) {
                width: 16.67% !important; /* 2/12 */
                text-align: center;
            }
            .equipment-table th:nth-child(6),
            .equipment-table td:nth-child(6) {
                width: 8.33% !important; /* 1/12 */
                display: none; /* Hidden dates column - moved to last position */
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .equipment-table th:nth-child(1),
                .equipment-table td:nth-child(1) {
                    width: 60% !important;
                }
                .equipment-table th:nth-child(2),
                .equipment-table td:nth-child(2) {
                    width: 40% !important;
                }
                .equipment-table th:nth-child(3),
                .equipment-table td:nth-child(3),
                .equipment-table th:nth-child(4),
                .equipment-table td:nth-child(4),
                .equipment-table th:nth-child(5),
                .equipment-table td:nth-child(5),
                .equipment-table th:nth-child(6),
                .equipment-table td:nth-child(6) {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);

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
                autoLoadOnInit: false, // Temporarily disable for debugging
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

        // Manual initial load after slight delay to ensure DOM is ready
        setTimeout(() => {
            if (LOG_CONFIG.filters.enabled && LOG_CONFIG.filters.logInit) {
                console.log('EQUIPMENT FILTERS: Manually triggering initial data load...');
            }
            this.pagination.loadData();
        }, 100);
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

            // Update equipment table with new data
            this.updateEquipmentTable(response.items);

            // Return pagination data for the Pagination component
            return {
                items: response.items,
                total: response.total,
                pages: response.pages,
                page: response.page
            };

        } catch (error) {
            console.error('Error loading equipment data:', error);
            showToast('Ошибка загрузки списка оборудования', 'danger');
            throw error; // Re-throw for pagination component error handling
        }
    }

    updateEquipmentTable(bookings) {
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

        // Update equipment count (get current state from pagination component)
        const paginationState = this.pagination ? this.pagination.getState() : { totalItems: 0 };
        const countElement = document.getElementById('equipmentCount');
        if (countElement) {
            countElement.textContent = `${paginationState.totalItems} позиций`;
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
                <span class="quantity d-none">${booking.quantity}</span>
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
            <td class="text-center">${booking.quantity}</td>
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
