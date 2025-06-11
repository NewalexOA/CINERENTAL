/**
 * Project Equipment Filters
 * Provides filtering and pagination for equipment list in project view
 */

import { api } from '../../utils/api.js';
import { showToast } from '../../utils/common.js';

class ProjectEquipmentFilters {
    constructor(projectId) {
        this.projectId = projectId;
        this.currentPage = 1;
        this.pageSize = 50;
        this.totalItems = 0;
        this.totalPages = 1;
        this.filters = {
            search: '',
            category: '',
            dateFilter: 'all'
        };

        this.init();
    }

    init() {
        this.createFilterUI();
        this.loadCategories();
        this.loadEquipmentList();
        this.setupEventListeners();
    }

    createFilterUI() {
        const equipmentCard = document.querySelector('.card:has(#equipmentList)');
        if (!equipmentCard) return;

        const cardBody = equipmentCard.querySelector('.card-body');
        if (!cardBody) return;

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
                    <div class="col-md-3">
                        <select class="form-select" id="equipmentDateFilter">
                            <option value="all">Все позиции</option>
                            <option value="different">Отличающиеся даты</option>
                            <option value="matching">Совпадающие даты</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <select class="form-select" id="equipmentPageSize">
                            <option value="20">20</option>
                            <option value="50" selected>50</option>
                            <option value="all">Все</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="enhanced-pagination mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="pagination-info">
                        Показано <span id="equipmentPageStart">1</span>-<span id="equipmentPageEnd">50</span>
                        из <span id="equipmentTotalItems">0</span> позиций
                    </div>
                    <div class="pagination-controls">
                        <button class="btn btn-outline-secondary btn-sm" id="equipmentPrevPage" disabled>
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <span class="mx-2">
                            <span id="equipmentCurrentPage">1</span> из <span id="equipmentTotalPages">1</span>
                        </span>
                        <button class="btn btn-outline-secondary btn-sm" id="equipmentNextPage" disabled>
                            <i class="fas fa-chevron-right"></i>
                        </button>
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

    setupEventListeners() {
        // Search input with debounce
        const searchInput = document.getElementById('equipmentSearchInput');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.filters.search = searchInput.value.trim();
                    this.currentPage = 1;
                    this.loadEquipmentList();
                }, 300);
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('equipmentCategoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.filters.category = categoryFilter.value;
                this.currentPage = 1;
                this.loadEquipmentList();
            });
        }

        // Date filter
        const dateFilter = document.getElementById('equipmentDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.filters.dateFilter = dateFilter.value;
                this.currentPage = 1;
                this.loadEquipmentList();
            });
        }

        // Page size
        const pageSizeSelect = document.getElementById('equipmentPageSize');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', () => {
                const newSize = pageSizeSelect.value;
                this.pageSize = newSize === 'all' ? 999999 : parseInt(newSize);
                this.currentPage = 1;
                this.loadEquipmentList();
            });
        }

        // Pagination buttons
        const prevButton = document.getElementById('equipmentPrevPage');
        const nextButton = document.getElementById('equipmentNextPage');

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadEquipmentList();
                }
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.loadEquipmentList();
                }
            });
        }
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

    async loadEquipmentList() {
        try {
            // Build query parameters
            const params = new URLSearchParams({
                page: this.currentPage,
                size: this.pageSize
            });

            if (this.filters.search) {
                params.append('search', this.filters.search);
            }
            if (this.filters.category) {
                params.append('category_id', this.filters.category);
            }
            if (this.filters.dateFilter !== 'all') {
                params.append('date_filter', this.filters.dateFilter);
            }

            // Use the new paginated endpoint
            const response = await api.get(`/projects/${this.projectId}/bookings/paginated?${params.toString()}`);

            this.totalItems = response.total;
            this.totalPages = response.pages;
            this.currentPage = response.page;

            this.updateEquipmentTable(response.items);
            this.updatePaginationUI();

        } catch (error) {
            console.error('Error loading equipment list:', error);
            showToast('Ошибка загрузки списка оборудования', 'danger');
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

        // Update equipment count
        const countElement = document.getElementById('equipmentCount');
        if (countElement) {
            countElement.textContent = `${this.totalItems} позиций`;
        }
    }

    createEquipmentRow(booking) {
        const row = document.createElement('tr');
        row.dataset.bookingId = booking.id;
        row.dataset.hasSerialNumber = booking.serial_number ? 'true' : 'false';
        row.dataset.equipmentId = booking.equipment_id;

        const hasSerialNumber = booking.serial_number && booking.serial_number.trim().length > 0;

        row.innerHTML = `
            <td>
                <div>${booking.equipment_name}${booking.quantity > 1 ? ` (x${booking.quantity})` : ''}</div>
                <small class="text-muted">${booking.barcode || ''}</small>
                ${booking.serial_number ? `<small class="text-muted d-block">S/N: ${booking.serial_number}</small>` : ''}
            </td>
            <td>
                <div>${booking.category_name || 'Без категории'}</div>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm booking-period-input"
                       data-booking-id="${booking.id}"
                       value="${this.formatDateTime(booking.start_date)} - ${this.formatDateTime(booking.end_date)}"
                       placeholder="ДД.ММ.ГГГГ ЧЧ:ММ - ДД.ММ.ГГГГ ЧЧ:ММ">
            </td>
            <td class="text-center">${booking.quantity}</td>
            <td class="equipment-dates-cell" style="display: none;">
                ${booking.has_different_dates ? `<small class="text-info">${this.formatDateTime(booking.start_date)} - ${this.formatDateTime(booking.end_date)}</small>` : ''}
            </td>
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
        `;

        return row;
    }

    updatePaginationUI() {
        // Update pagination info
        const startItem = (this.currentPage - 1) * this.pageSize + 1;
        const endItem = Math.min(this.currentPage * this.pageSize, this.totalItems);

        const elements = {
            pageStart: document.getElementById('equipmentPageStart'),
            pageEnd: document.getElementById('equipmentPageEnd'),
            totalItems: document.getElementById('equipmentTotalItems'),
            currentPage: document.getElementById('equipmentCurrentPage'),
            totalPages: document.getElementById('equipmentTotalPages'),
            prevButton: document.getElementById('equipmentPrevPage'),
            nextButton: document.getElementById('equipmentNextPage')
        };

        if (elements.pageStart) elements.pageStart.textContent = startItem;
        if (elements.pageEnd) elements.pageEnd.textContent = endItem;
        if (elements.totalItems) elements.totalItems.textContent = this.totalItems;
        if (elements.currentPage) elements.currentPage.textContent = this.currentPage;
        if (elements.totalPages) elements.totalPages.textContent = this.totalPages;

        // Update button states
        if (elements.prevButton) {
            elements.prevButton.disabled = this.currentPage <= 1;
        }
        if (elements.nextButton) {
            elements.nextButton.disabled = this.currentPage >= this.totalPages;
        }
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

    if (!projectId) {
        console.error('Project ID not found');
        return;
    }

    new ProjectEquipmentFilters(projectId);
}

export { ProjectEquipmentFilters };
