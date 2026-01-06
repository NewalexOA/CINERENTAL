/**
 * Projects list JavaScript functionality.
 *
 * This module contains functions for project listing, including:
 * - Pagination
 * - Filtering
 * - Searching
 * - Rendering project cards
 */

// Import API client
import { api } from './utils/api.js';
import { showToast, DATERANGEPICKER_LOCALE } from './utils/common.js';
import { Pagination } from './utils/pagination.js';

// Global pagination instance
let projectsPagination = null;

// Filter state
let filters = {
    client_id: null,
    status: null,
    payment_status: null,
    start_date: null,
    end_date: null,
    query: null
};

// View state
let currentView = 'table'; // 'table' or 'card'
let projectsData = []; // Cached projects data

// Search debouncing timer
let searchDebounceTimer;

// Initialize collapse icons animation
function initCollapseAnimations() {
    const collapseElements = document.querySelectorAll('[data-bs-toggle="collapse"]');

    collapseElements.forEach(button => {
        const targetId = button.getAttribute('data-bs-target');
        const target = document.querySelector(targetId);

        if (target) {
            target.addEventListener('show.bs.collapse', () => {
                button.classList.remove('collapsed');
            });

            target.addEventListener('hide.bs.collapse', () => {
                button.classList.add('collapsed');
            });
        }
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Load clients for dropdown
    loadClients();

    // Initialize period picker
    initPeriodPicker();

    // Initialize view toggle
    initViewToggle();

    // Initialize collapse animations
    initCollapseAnimations();

    // Initialize search handler
    initSearchHandler();

    // Initialize pagination component (this will trigger initial data load)
    initializePagination();

    // Add event listeners for instant filtering
    initFilterListeners();
});

// Initialize filter listeners for instant filtering
function initFilterListeners() {
    // Status dropdown change
    document.getElementById('searchStatus').addEventListener('change', () => {
        applyFilters();
    });

    // Payment status dropdown change
    const paymentStatusSelect = document.getElementById('searchPaymentStatus');
    if (paymentStatusSelect) {
        paymentStatusSelect.addEventListener('change', () => {
            applyFilters();
        });
    }

    // Form submit (keeping this for backward compatibility)
    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        applyFilters();
    });
}

// Initialize search handler with debouncing
function initSearchHandler() {
    const searchInput = document.getElementById('searchQuery');
    const clearButton = document.getElementById('clearSearch');
    const spinner = document.getElementById('search-spinner');

    if (!searchInput || !clearButton || !spinner) {
        console.warn('Search elements not found');
        return;
    }

    // Search input handler with debouncing
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        // Show/hide clear button based on input content
        if (query.length > 0) {
            clearButton.classList.remove('d-none');
        } else {
            clearButton.classList.add('d-none');
        }

        // Show spinner if query is long enough
        if (query.length >= 3) {
            spinner.classList.remove('d-none');
        } else {
            spinner.classList.add('d-none');
        }

        // Clear previous timer and set new timer
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            filters.query = query.length >= 3 ? query : null;
            projectsPagination.reset(); // Reset to first page and reload
        }, 300);
    });

    // Clear button handler
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        spinner.classList.add('d-none');
        clearButton.classList.add('d-none');
        filters.query = null;
        projectsPagination.reset(); // Reset to first page and reload
    });

    // Hide spinner when search is completed
    searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            spinner.classList.add('d-none');
        }, 100);
    });
}

// Initialize view toggle
function initViewToggle() {
    const tableViewBtn = document.getElementById('tableViewBtn');
    const cardViewBtn = document.getElementById('cardViewBtn');
    const tableView = document.getElementById('tableView');
    const cardView = document.getElementById('cardView');

    // Load saved preferences from localStorage
    const savedView = localStorage.getItem('projectsView') || 'table';
    currentView = savedView;

    // Set active view
    if (savedView === 'table') {
        tableViewBtn.classList.add('active');
        cardViewBtn.classList.remove('active');
        tableView.classList.remove('d-none');
        cardView.classList.add('d-none');
    } else {
        cardViewBtn.classList.add('active');
        tableViewBtn.classList.remove('active');
        cardView.classList.remove('d-none');
        tableView.classList.add('d-none');
    }

    // Button click handlers
    tableViewBtn.addEventListener('click', () => {
        if (currentView !== 'table') {
            currentView = 'table';
            localStorage.setItem('projectsView', 'table');

            // Update button active classes
            tableViewBtn.classList.add('active');
            cardViewBtn.classList.remove('active');

            // Display appropriate container
            tableView.classList.remove('d-none');
            cardView.classList.add('d-none');

            // Re-render projects if data is already loaded
            if (projectsData.length > 0) {
                renderProjects(projectsData);
            }
        }
    });

    cardViewBtn.addEventListener('click', () => {
        if (currentView !== 'card') {
            currentView = 'card';
            localStorage.setItem('projectsView', 'card');

            // Update button active classes
            cardViewBtn.classList.add('active');
            tableViewBtn.classList.remove('active');

            // Display appropriate container
            cardView.classList.remove('d-none');
            tableView.classList.add('d-none');

            // Re-render projects if data is already loaded
            if (projectsData.length > 0) {
                renderProjects(projectsData);
            }
        }
    });
}

// Load clients for select dropdown
async function loadClients() {
    try {
        const clients = await api.get('/clients');
        const select = document.getElementById('searchClient');

        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            select.appendChild(option);
        });

        // Initialize Select2 for client dropdown if it exists
        if ($.fn.select2) {
            $('#searchClient').select2({
                placeholder: 'Выберите клиента',
                allowClear: true
            });

            // Add event listener for Select2 change
            $('#searchClient').on('change', function() {
                applyFilters();
            });
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        if (typeof showToast === 'function') {
            showToast('Ошибка загрузки списка клиентов', 'danger');
        } else if (typeof showProjectToast === 'function') {
            showProjectToast('Ошибка загрузки списка клиентов', 'danger');
        }
    }
}

// Initialize period picker
function initPeriodPicker() {
    $('#searchPeriod').daterangepicker({
        autoUpdateInput: false,
        locale: {
            ...DATERANGEPICKER_LOCALE,
            cancelLabel: 'Очистить'
        }
    });

    $('#searchPeriod').on('apply.daterangepicker', function(ev, picker) {
        $(this).val(picker.startDate.format('DD.MM.YYYY') + ' - ' + picker.endDate.format('DD.MM.YYYY'));
        filters.start_date = picker.startDate.format('YYYY-MM-DD');
        filters.end_date = picker.endDate.format('YYYY-MM-DD');

        // Apply filters immediately when date range is selected
        applyFilters();
    });

    $('#searchPeriod').on('cancel.daterangepicker', function(ev, picker) {
        $(this).val('');
        filters.start_date = null;
        filters.end_date = null;

        // Apply filters immediately when date range is cleared
        applyFilters();
    });
}

// Apply search filters
function applyFilters() {
    const form = document.getElementById('searchForm');
    const formData = new FormData(form);

    // Read search query from DOM element to preserve user input
    const searchInput = document.getElementById('searchQuery');
    const searchQuery = searchInput ? searchInput.value.trim() : '';

    filters.client_id = formData.get('client_id') || null;
    filters.status = formData.get('status') || null;
    filters.payment_status = formData.get('payment_status') || null;
    filters.query = searchQuery.length >= 3 ? searchQuery : null;

    projectsPagination.reset(); // Reset to first page and reload
}

// Initialize pagination component
function initializePagination() {
    console.log('=== PROJECTS LIST: Initializing pagination ===');

    // Check if required DOM elements exist for primary pagination (bottom)
    const requiredElements = [
        '#projectsBottomPageStart', '#projectsBottomPageEnd', '#projectsBottomTotalItems',
        '#projectsBottomCurrentPage', '#projectsBottomTotalPages',
        '#projectsBottomPrevPage', '#projectsBottomNextPage', '#projectsBottomPageSize'
    ];
    const missingElements = [];

    requiredElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (!element) {
            missingElements.push(selector);
        }
    });

    if (missingElements.length > 0) {
        console.error('PROJECTS LIST: Missing required elements:', missingElements);
        return;
    }

    console.log('PROJECTS LIST: All required elements found');

    // Create primary pagination (bottom) - this one controls the data
    projectsPagination = new Pagination({
        selectors: {
            pageStart: '#projectsBottomPageStart',
            pageEnd: '#projectsBottomPageEnd',
            totalItems: '#projectsBottomTotalItems',
            currentPage: '#projectsBottomCurrentPage',
            totalPages: '#projectsBottomTotalPages',
            prevButton: '#projectsBottomPrevPage',
            nextButton: '#projectsBottomNextPage',
            pageSizeSelect: '#projectsBottomPageSize'
        },
        options: {
            pageSize: 20,
            pageSizes: [20, 50, 100],
            showPageInfo: true,
            showPageSizeSelect: true,
            autoLoadOnInit: false, // Temporarily disable for debugging
            persistPageSize: true, // Enable page size persistence
            storageKey: 'projects_list_pagesize', // Unique key for projects list
            useUrlParams: false // Disabled for now, can be enabled later
        },
        callbacks: {
            onDataLoad: async (page, size) => {
                return await loadProjectsData(page, size);
            }
        }
    });

    // Add secondary pagination (top table view) that syncs with primary
    projectsPagination.addSecondaryPagination({
        pageStart: '#projectsTopPageStart',
        pageEnd: '#projectsTopPageEnd',
        totalItems: '#projectsTopTotalItems',
        currentPage: '#projectsTopCurrentPage',
        totalPages: '#projectsTopTotalPages',
        prevButton: '#projectsTopPrevPage',
        nextButton: '#projectsTopNextPage',
        pageSizeSelect: '#projectsTopPageSize'
    });

    // Add card view paginations that sync with primary
    projectsPagination.addSecondaryPagination({
        pageStart: '#projectsCardTopPageStart',
        pageEnd: '#projectsCardTopPageEnd',
        totalItems: '#projectsCardTopTotalItems',
        currentPage: '#projectsCardTopCurrentPage',
        totalPages: '#projectsCardTopTotalPages',
        prevButton: '#projectsCardTopPrevPage',
        nextButton: '#projectsCardTopNextPage',
        pageSizeSelect: '#projectsCardTopPageSize'
    });

    projectsPagination.addSecondaryPagination({
        pageStart: '#projectsCardBottomPageStart',
        pageEnd: '#projectsCardBottomPageEnd',
        totalItems: '#projectsCardBottomTotalItems',
        currentPage: '#projectsCardBottomCurrentPage',
        totalPages: '#projectsCardBottomTotalPages',
        prevButton: '#projectsCardBottomPrevPage',
        nextButton: '#projectsCardBottomNextPage',
        pageSizeSelect: '#projectsCardBottomPageSize'
    });

    console.log('PROJECTS LIST: Pagination instance created:', projectsPagination);

    // Manual initial load after slight delay
    setTimeout(() => {
        console.log('PROJECTS LIST: Manually triggering initial data load...');
        projectsPagination.loadData();
    }, 100);
}

// Load projects data (used by pagination component)
async function loadProjectsData(page, size) {
    const projectsList = document.getElementById('projectsList');
    const spinner = document.getElementById('search-spinner');

    projectsList.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
            </td>
        </tr>
    `;

    // Clear card view containers
    document.getElementById('draftProjectsList').innerHTML = '';
    document.getElementById('activeProjectsList').innerHTML = '';
    document.getElementById('completedProjectsList').innerHTML = '';
    document.getElementById('cancelledProjectsList').innerHTML = '';

    // Hide empty group messages
    document.getElementById('emptyDraftMessage').classList.add('d-none');
    document.getElementById('emptyActiveMessage').classList.add('d-none');
    document.getElementById('emptyCompletedMessage').classList.add('d-none');
    document.getElementById('emptyCancelledMessage').classList.add('d-none');

    try {
        // Build query parameters for paginated endpoint
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('size', size);

        if (filters.client_id) params.append('client_id', filters.client_id);
        if (filters.status) params.append('project_status', filters.status);
        if (filters.payment_status) params.append('payment_status', filters.payment_status);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.query) params.append('query', filters.query);

        // Make API request to paginated endpoint
        const response = await api.get(`/projects/paginated?${params.toString()}`);

        console.log('Paginated API response:', response);

        // Extract pagination data from response
        projectsData = response.items || [];

        // Update UI with project items
        renderProjects(projectsData);

        // Hide search spinner after successful API response
        if (spinner) {
            spinner.classList.add('d-none');
        }

        // Return pagination data for the Pagination component
        return {
            items: response.items,
            total: response.total,
            pages: response.pages,
            page: response.page
        };
    } catch (error) {
        console.error('Error loading projects:', error);
        if (typeof showToast === 'function') {
            showToast('Ошибка загрузки проектов', 'danger');
        } else if (typeof showProjectToast === 'function') {
            showProjectToast('Ошибка загрузки проектов', 'danger');
        }

        projectsList.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-circle fa-2x mb-2"></i>
                    <p>Ошибка при загрузке проектов. Пожалуйста, попробуйте снова.</p>
                </td>
            </tr>
        `;

        // Show error messages in card view
        const errorMessage = `
            <div class="col-12 text-danger text-center">
                <i class="fas fa-exclamation-circle fa-2x mb-2"></i>
                <p>Ошибка при загрузке проектов. Пожалуйста, попробуйте снова.</p>
            </div>
        `;
        document.getElementById('draftProjectsList').innerHTML = errorMessage;
        document.getElementById('activeProjectsList').innerHTML = errorMessage;
        document.getElementById('completedProjectsList').innerHTML = errorMessage;
        document.getElementById('cancelledProjectsList').innerHTML = errorMessage;

        // Hide search spinner even on error
        if (spinner) {
            spinner.classList.add('d-none');
        }

        throw error; // Re-throw for pagination component error handling
    }
}

// Render projects based on current view
function renderProjects(projects) {
    if (currentView === 'table') {
        renderTableView(projects);
    } else {
        renderCardView(projects);
    }
}

// Render table view
function renderTableView(projects) {
    const projectsList = document.getElementById('projectsList');
    projectsList.innerHTML = '';

    if (projects.length === 0) {
        projectsList.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    <i class="fas fa-folder-open fa-3x mb-3"></i>
                    <p>Нет проектов, соответствующих условиям поиска</p>
                </td>
            </tr>
        `;
        return;
    }

    // Sort projects by status first, then by start date
    const sortedProjects = [...projects].sort((a, b) => {
        // Status priority: DRAFT > ACTIVE > COMPLETED > CANCELLED
        const statusPriority = {
            'DRAFT': 1,
            'ACTIVE': 2,
            'COMPLETED': 3,
            'CANCELLED': 4
        };

        const statusA = statusPriority[a.status] || 5;
        const statusB = statusPriority[b.status] || 5;

        if (statusA !== statusB) {
            return statusA - statusB;
        }

        // Within same status, sort by start date (chronological order)
        return new Date(a.start_date) - new Date(b.start_date);
    });

    // Formatting functions
    const formatDate = typeof formatProjectDate === 'function' ? formatProjectDate :
                       (typeof window.formatDate === 'function' ? window.formatDate :
                        d => new Date(d).toLocaleDateString());

    sortedProjects.forEach(project => {
        const statusColor = typeof getStatusColor === 'function' ? getStatusColor(project.status) :
                           (project.status === 'ACTIVE' ? 'success' :
                            project.status === 'COMPLETED' ? 'info' :
                            project.status === 'CANCELLED' ? 'danger' : 'secondary');

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.dataset.projectId = project.id;

        const paymentStatusBadgeClass = typeof getPaymentStatusBadgeClass === 'function'
            ? getPaymentStatusBadgeClass(project.payment_status)
            : `payment-status-badge payment-status-${(project.payment_status || '').toLowerCase()}`;
        const paymentStatusName = typeof getPaymentStatusName === 'function'
            ? getPaymentStatusName(project.payment_status)
            : (project.payment_status === 'PAID' ? 'Оплачен' :
               project.payment_status === 'PARTIALLY_PAID' ? 'Частично оплачен' : 'Не оплачен');

        tr.innerHTML = `
            <td>
                <strong>${project.name}</strong>
            </td>
            <td>${project.client_name}</td>
            <td>${formatDate(project.start_date)} - ${formatDate(project.end_date)}</td>
            <td>
                <span class="badge bg-${statusColor}">${project.status}</span>
                <span class="badge ${paymentStatusBadgeClass} ms-1">${paymentStatusName}</span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-project-btn" data-project-id="${project.id}">
                    <i class="fas fa-eye"></i> Просмотр
                </button>
            </td>
        `;

        projectsList.appendChild(tr);

        // Add click event to the row
        tr.addEventListener('click', (e) => {
            // Check if the click is not on a button
            if (!e.target.closest('.view-project-btn')) {
                window.location.href = `/projects/${project.id}`;
            }
        });

        // Prevent button click from triggering row click
        tr.querySelector('.view-project-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `/projects/${project.id}`;
        });
    });
}

// Render card view with accordion grouping
function renderCardView(projects) {
    // Get group containers
    const draftProjectsList = document.getElementById('draftProjectsList');
    const activeProjectsList = document.getElementById('activeProjectsList');
    const completedProjectsList = document.getElementById('completedProjectsList');
    const cancelledProjectsList = document.getElementById('cancelledProjectsList');

    if (!draftProjectsList || !activeProjectsList || !completedProjectsList || !cancelledProjectsList) {
        console.error('One or more project list containers not found');
        return;
    }

    // Clear containers
    draftProjectsList.innerHTML = '';
    activeProjectsList.innerHTML = '';
    completedProjectsList.innerHTML = '';
    cancelledProjectsList.innerHTML = '';

    // Group and sort projects by status, then by date
    const draftProjects = projects.filter(p => p.status === 'DRAFT').sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const activeProjects = projects.filter(p => p.status === 'ACTIVE').sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const cancelledProjects = projects.filter(p => p.status === 'CANCELLED').sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    // Date formatting
    const formatDate = typeof formatProjectDate === 'function' ? formatProjectDate :
                       (typeof window.formatDate === 'function' ? window.formatDate :
                        d => new Date(d).toLocaleDateString());

    // Display empty group messages
    document.getElementById('emptyDraftMessage').classList.toggle('d-none', draftProjects.length > 0);
    document.getElementById('emptyActiveMessage').classList.toggle('d-none', activeProjects.length > 0);
    document.getElementById('emptyCompletedMessage').classList.toggle('d-none', completedProjects.length > 0);
    document.getElementById('emptyCancelledMessage').classList.toggle('d-none', cancelledProjects.length > 0);

    // Project card creation function
    function createProjectCard(project) {
        const statusColor = typeof getStatusColor === 'function' ? getStatusColor(project.status) :
                           (project.status === 'ACTIVE' ? 'success' :
                            project.status === 'COMPLETED' ? 'info' :
                            project.status === 'CANCELLED' ? 'danger' : 'secondary');

        const bookingCount = project.booking_count || 0;

        const paymentStatusBadgeClass = typeof getPaymentStatusBadgeClass === 'function'
            ? getPaymentStatusBadgeClass(project.payment_status)
            : `payment-status-badge payment-status-${(project.payment_status || '').toLowerCase()}`;
        const paymentStatusName = typeof getPaymentStatusName === 'function'
            ? getPaymentStatusName(project.payment_status)
            : (project.payment_status === 'PAID' ? 'Оплачен' :
               project.payment_status === 'PARTIALLY_PAID' ? 'Частично оплачен' : 'Не оплачен');

        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4';

        col.innerHTML = `
            <div class="card project-card h-100" data-project-id="${project.id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title">${project.name}</h5>
                        <span class="badge bg-${statusColor}">${project.status}</span>
                    </div>
                    <p class="card-text mb-2">${project.client_name}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <p class="project-period text-muted mb-0">
                            <i class="fa-solid fa-calendar-alt me-1"></i>
                            ${formatDate(project.start_date)} - ${formatDate(project.end_date)}
                        </p>
                        <span class="badge ${paymentStatusBadgeClass}">${paymentStatusName}</span>
                    </div>
                    ${bookingCount > 0 ? `<div class="bookings-count">${bookingCount}</div>` : ''}
                </div>
            </div>
        `;

        // Add click handler to the card
        col.querySelector('.project-card').addEventListener('click', () => {
            window.location.href = `/projects/${project.id}`;
        });

        return col;
    }

    // Fill groups with projects
    draftProjects.forEach(project => {
        draftProjectsList.appendChild(createProjectCard(project));
    });

    activeProjects.forEach(project => {
        activeProjectsList.appendChild(createProjectCard(project));
    });

    completedProjects.forEach(project => {
        completedProjectsList.appendChild(createProjectCard(project));
    });

    cancelledProjects.forEach(project => {
        cancelledProjectsList.appendChild(createProjectCard(project));
    });

    // Hide empty accordion sections
    document.getElementById('draftProjects').classList.toggle('d-none', draftProjects.length === 0);
    document.getElementById('activeProjects').classList.toggle('d-none', activeProjects.length === 0);
    document.getElementById('completedProjects').classList.toggle('d-none', completedProjects.length === 0);
    document.getElementById('cancelledProjects').classList.toggle('d-none', cancelledProjects.length === 0);

    // Show "No projects" message if all groups are empty
    const cardViewEmptyState = document.getElementById('cardViewEmptyState');
    if (projects.length === 0) {
        // Hide all accordion sections when no projects
        document.getElementById('draftProjects').classList.add('d-none');
        document.getElementById('activeProjects').classList.add('d-none');
        document.getElementById('completedProjects').classList.add('d-none');
        document.getElementById('cancelledProjects').classList.add('d-none');

        // Show global empty state message
        if (cardViewEmptyState) {
            cardViewEmptyState.classList.remove('d-none');
        }
    } else {
        // Hide global empty state message when projects exist
        if (cardViewEmptyState) {
            cardViewEmptyState.classList.add('d-none');
        }
    }
}

// Global debug function for testing projects pagination
window.testProjectsPagination = function() {
    console.log('=== TESTING PROJECTS PAGINATION ===');
    console.log('projectsPagination instance:', projectsPagination);

    if (!projectsPagination) {
        console.error('projectsPagination not initialized!');
        return;
    }

    console.log('Current state:', projectsPagination.getState());

    // Test element existence
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    console.log('prevButton element:', prevButton);
    console.log('nextButton element:', nextButton);

    // Test button functionality
    if (prevButton) {
        console.log('Testing prev button click...');
        prevButton.click();
    }

    if (nextButton) {
        console.log('Testing next button click...');
        setTimeout(() => nextButton.click(), 1000);
    }
};
