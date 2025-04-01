/**
 * Projects list JavaScript functionality.
 *
 * This module contains functions for project listing, including:
 * - Pagination
 * - Filtering
 * - Searching
 * - Rendering project cards
 */

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

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Load clients for dropdown
    loadClients();

    // Initialize period picker
    initPeriodPicker();

    // Load projects
    loadProjects();

    // Add event listeners
    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        applyFilters();
    });

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
    });

    $('#searchPeriod').on('cancel.daterangepicker', function(ev, picker) {
        $(this).val('');
        filters.start_date = null;
        filters.end_date = null;
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

    try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append('limit', pageSize);
        params.append('offset', (currentPage - 1) * pageSize);

        if (filters.client_id) params.append('client_id', filters.client_id);
        if (filters.status) params.append('project_status', filters.status);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);

        // Make API request
        const response = await api.get(`/projects?${params.toString()}`);

        // Update UI
        renderProjects(response);

        // Update pagination
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
    }
}

// Render projects list
function renderProjects(projects) {
    const projectsList = document.getElementById('projectsList');
    projectsList.innerHTML = '';

    if (projects.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'text-center text-muted py-5';
        emptyMessage.innerHTML = `
            <i class="fas fa-folder-open fa-3x mb-3"></i>
            <p>Нет проектов, соответствующих условиям поиска</p>
        `;
        projectsList.appendChild(emptyMessage);
        return;
    }

    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'card mb-3 project-card';
        card.dataset.projectId = project.id;

        // Formatting functions
        const formatDate = typeof formatProjectDate === 'function' ? formatProjectDate :
                          (typeof window.formatDate === 'function' ? window.formatDate :
                           d => new Date(d).toLocaleDateString());

        // Formatting date and time
        const formatDateTime = typeof formatProjectDateTime === 'function' ? formatProjectDateTime :
                             (typeof window.formatDateTime === 'function' ? window.formatDateTime :
                              d => new Date(d).toLocaleString());

        // Status color determination
        const statusColor = typeof getStatusColor === 'function' ? getStatusColor(project.status) :
                          (project.status === 'ACTIVE' ? 'success' :
                           project.status === 'COMPLETED' ? 'info' :
                           project.status === 'CANCELLED' ? 'danger' : 'secondary');

        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="card-title mb-0">${project.name}</h5>
                    <span class="badge bg-${statusColor}">${project.status}</span>
                </div>
                <p class="card-text text-muted">${project.client_name}</p>
                <div class="row mb-2">
                    <div class="col-md-6">
                        <small><strong>Период:</strong> ${formatDate(project.start_date)} - ${formatDate(project.end_date)}</small>
                    </div>
                    <div class="col-md-6">
                        <small><strong>Создан:</strong> ${formatDateTime(project.created_at)}</small>
                    </div>
                </div>
                <div class="d-flex justify-content-end">
                    <button class="btn btn-sm btn-outline-primary view-project-btn" data-project-id="${project.id}">
                        <i class="fas fa-eye"></i> Просмотр
                    </button>
                </div>
            </div>
        `;

        projectsList.appendChild(card);

        // Add click event to the whole card
        card.addEventListener('click', () => {
            window.location.href = `/projects/${project.id}`;
        });

        // Prevent button click from triggering card click
        card.querySelector('.view-project-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `/projects/${project.id}`;
        });
    });
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
