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

// Pagination state
let currentPage = 1;
let totalPages = 1;
let pageSize = 20;
let totalCount = 0;

// Filter state
let filters = {
    client_id: null,
    status: null,
    start_date: null,
    end_date: null
};

// View state
let currentView = 'table'; // 'table' or 'card'
let projectsData = []; // Cached projects data

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Load clients for dropdown
    loadClients();

    // Initialize period picker
    initPeriodPicker();

    // Initialize view toggle
    initViewToggle();

    // Load projects
    loadProjects();

    // Add event listeners for instant filtering
    initFilterListeners();

    document.getElementById('prevPage').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            loadProjects();
        }
    });

    document.getElementById('nextPage').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            loadProjects();
        }
    });
});

// Initialize filter listeners for instant filtering
function initFilterListeners() {
    // Status dropdown change
    document.getElementById('searchStatus').addEventListener('change', () => {
        applyFilters();
    });

    // Form submit (keeping this for backward compatibility)
    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        applyFilters();
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

    filters.client_id = formData.get('client_id') || null;
    filters.status = formData.get('status') || null;

    // Reset to first page
    currentPage = 1;

    // Load projects with filters
    loadProjects();
}

// Load projects with pagination and filters
async function loadProjects() {
    const projectsList = document.getElementById('projectsList');
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
    document.getElementById('otherProjectsList').innerHTML = '';

    // Hide empty group messages
    document.getElementById('emptyDraftMessage').classList.add('d-none');
    document.getElementById('emptyActiveMessage').classList.add('d-none');
    document.getElementById('emptyOtherMessage').classList.add('d-none');

    try {
        // Build query parameters for paginated endpoint
        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('size', pageSize);

        if (filters.client_id) params.append('client_id', filters.client_id);
        if (filters.status) params.append('project_status', filters.status);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);

        // Make API request to paginated endpoint
        const response = await api.get(`/projects/paginated?${params.toString()}`);

        console.log('Paginated API response:', response);

        // Extract pagination data from response
        projectsData = response.items || [];
        totalCount = response.total || 0;
        totalPages = response.pages || 1;
        currentPage = response.page || 1;

        // Update UI with project items
        renderProjects(projectsData);

        // Update pagination controls
        updatePagination();
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
        document.getElementById('otherProjectsList').innerHTML = errorMessage;
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

    // Formatting functions
    const formatDate = typeof formatProjectDate === 'function' ? formatProjectDate :
                       (typeof window.formatDate === 'function' ? window.formatDate :
                        d => new Date(d).toLocaleDateString());

    projects.forEach(project => {
        const statusColor = typeof getStatusColor === 'function' ? getStatusColor(project.status) :
                           (project.status === 'ACTIVE' ? 'success' :
                            project.status === 'COMPLETED' ? 'info' :
                            project.status === 'CANCELLED' ? 'danger' : 'secondary');

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.dataset.projectId = project.id;

        tr.innerHTML = `
            <td>
                <strong>${project.name}</strong>
            </td>
            <td>${project.client_name}</td>
            <td>${formatDate(project.start_date)} - ${formatDate(project.end_date)}</td>
            <td><span class="badge bg-${statusColor}">${project.status}</span></td>
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

// Render card view with grouping
function renderCardView(projects) {
    // Get group containers
    const draftProjectsList = document.getElementById('draftProjectsList');
    const activeProjectsList = document.getElementById('activeProjectsList');
    const otherProjectsList = document.getElementById('otherProjectsList');

    // Clear containers
    draftProjectsList.innerHTML = '';
    activeProjectsList.innerHTML = '';
    otherProjectsList.innerHTML = '';

    // Group projects by status
    const draftProjects = projects.filter(p => p.status === 'DRAFT');
    const activeProjects = projects.filter(p => p.status === 'ACTIVE');
    const otherProjects = projects.filter(p => p.status !== 'DRAFT' && p.status !== 'ACTIVE');

    // Date formatting
    const formatDate = typeof formatProjectDate === 'function' ? formatProjectDate :
                       (typeof window.formatDate === 'function' ? window.formatDate :
                        d => new Date(d).toLocaleDateString());

    // Display empty group messages
    document.getElementById('emptyDraftMessage').classList.toggle('d-none', draftProjects.length > 0);
    document.getElementById('emptyActiveMessage').classList.toggle('d-none', activeProjects.length > 0);
    document.getElementById('emptyOtherMessage').classList.toggle('d-none', otherProjects.length > 0);

    // Project card creation function
    function createProjectCard(project) {
        const statusColor = typeof getStatusColor === 'function' ? getStatusColor(project.status) :
                           (project.status === 'ACTIVE' ? 'success' :
                            project.status === 'COMPLETED' ? 'info' :
                            project.status === 'CANCELLED' ? 'danger' : 'secondary');

        const bookingCount = project.booking_count || 0;

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
                    <p class="project-period text-muted mt-3">
                        <i class="fa-solid fa-calendar-alt me-1"></i>
                        ${formatDate(project.start_date)} - ${formatDate(project.end_date)}
                    </p>
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

    otherProjects.forEach(project => {
        otherProjectsList.appendChild(createProjectCard(project));
    });

    // Hide empty groups
    document.getElementById('draftProjects').classList.toggle('d-none', draftProjects.length === 0 && projects.length > 0);
    document.getElementById('activeProjects').classList.toggle('d-none', activeProjects.length === 0 && projects.length > 0);
    document.getElementById('otherProjects').classList.toggle('d-none', otherProjects.length === 0 && projects.length > 0);

    // Show "No projects" message if all groups are empty
    if (projects.length === 0) {
        const noProjectsMessage = `
            <div class="col-12 py-5 text-center text-muted">
                <i class="fas fa-folder-open fa-3x mb-3"></i>
                <p>Нет проектов, соответствующих условиям поиска</p>
            </div>
        `;
        draftProjectsList.innerHTML = noProjectsMessage;

        // Display only drafts group, hide others
        document.getElementById('draftProjects').classList.remove('d-none');
        document.getElementById('activeProjects').classList.add('d-none');
        document.getElementById('otherProjects').classList.add('d-none');
        document.getElementById('emptyDraftMessage').classList.add('d-none');
    }
}

// Update pagination controls
function updatePagination() {
    const pageStart = Math.min((currentPage - 1) * pageSize + 1, totalCount);
    const pageEnd = Math.min(currentPage * pageSize, totalCount);

    document.getElementById('pageStart').textContent = pageStart;
    document.getElementById('pageEnd').textContent = pageEnd;
    document.getElementById('totalItems').textContent = totalCount;

    // Enable/disable pagination buttons
    const prevBtn = document.getElementById('prevPage').parentElement;
    const nextBtn = document.getElementById('nextPage').parentElement;

    prevBtn.classList.toggle('disabled', currentPage === 1);
    nextBtn.classList.toggle('disabled', currentPage >= totalPages);
}
