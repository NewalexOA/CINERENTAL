/**
 * Clients management module
 * Handles displaying, searching, and interacting with client records
 */

import { api } from './utils/api.js';
import { showToast } from './utils/common.js';

// Global variables
let currentView = 'list'; // 'grid' or 'list' - default view is 'list'
let allClients = [];
let currentClients = []; // currently displayed dataset (search/sort result)
let currentSearchRequestId = 0; // monotonically increasing search request id
let isUsingSearchResults = false; // whether currentClients represents active search results

// Disable the global client controls initialization in main.js
window.disableGlobalClientControls = true;

document.addEventListener('DOMContentLoaded', function() {
    initViewToggle();
    loadClientsWithoutGlobalLoader();

    document.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('[data-view]').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            const view = this.dataset.view;
            currentView = view;
            localStorage.setItem('clientsView', view);
            loadClientsWithoutGlobalLoader();
        });
    });

    const searchInput = document.getElementById('searchClient');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            performSearch(this.value);
        });
    }

    const sortSelect = document.getElementById('sortOrder');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortClients(this.value);
        });
    }

    // Initialize CRUD actions
    initCrudActions();
});

// Initialize view toggle
function initViewToggle() {
    const gridViewBtn = document.querySelector('[data-view="grid"]');
    const listViewBtn = document.querySelector('[data-view="list"]');

    // Load saved settings from localStorage
    const savedView = localStorage.getItem('clientsView') || 'list';
    currentView = savedView;

    // Set active view
    if (savedView === 'grid') {
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
    } else {
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
    }
}

// Search function (server-side search)
async function performSearch(query) {
    const trimmedQuery = query.trim();
    console.log(`Client search input: "${query}"`);

    // Empty query – restore initial clients list from cache
    if (!trimmedQuery) {
        // Invalidate all in-flight search requests
        currentSearchRequestId += 1;
        currentClients = allClients;
        isUsingSearchResults = false;
        if (currentView === 'list') {
            renderListView(allClients);
        } else {
            renderGridView(allClients);
        }
        return;
    }

    try {
        const requestId = ++currentSearchRequestId;
        showLocalLoader();

        const searchParams = { query: trimmedQuery };
        const clients = await api.get('/clients/', searchParams);

        // Ignore stale responses that finished after a newer request was started
        if (requestId !== currentSearchRequestId) {
            return;
        }

        currentClients = clients;
        isUsingSearchResults = true;

        console.log(`Found ${clients.length} matches from server for query "${trimmedQuery}"`);

        if (currentView === 'list') {
            renderListView(clients);
        } else {
            renderGridView(clients);
        }
    } catch (error) {
        console.error('Error searching clients:', error);
        showToast(error.message || 'Ошибка при поиске клиентов', 'danger');
        // On search failure, fall back to full clients list state
        isUsingSearchResults = false;
        currentClients = allClients;
    } finally {
        hideLocalLoader();
    }
}

// Sort function
function sortClients(sortBy) {
    // Invalidate in-flight search responses so they cannot overwrite sorted data
    currentSearchRequestId += 1;

    const baseClients = isUsingSearchResults ? currentClients : allClients;
    if (!baseClients || !baseClients.length) return;

    const sortedClients = [...baseClients];

    switch (sortBy) {
        case 'name':
            sortedClients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'created_at':
            sortedClients.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'bookings_count':
            sortedClients.sort((a, b) => (b.bookings_count || 0) - (a.bookings_count || 0));
            break;
    }

    // Persist sort order to the underlying full list when not in search mode
    if (!isUsingSearchResults) {
        allClients = sortedClients;
    }

    currentClients = sortedClients;

    if (currentView === 'list') {
        renderListView(sortedClients);
    } else {
        renderGridView(sortedClients);
    }
}

function showLocalLoader() {
    const loader = document.getElementById('clients-loader');
    if (loader) {
        loader.style.display = 'flex';
    }
}

function hideLocalLoader() {
    const loader = document.getElementById('clients-loader');
    if (loader) {
        loader.style.display = 'none';
    }
}

async function loadClientsWithoutGlobalLoader() {
    try {
        // Invalidate any in-flight search requests so their responses cannot
        // overwrite freshly loaded full clients data
        currentSearchRequestId += 1;

        showLocalLoader();

        const clients = await api.get('/clients/');
        const container = document.getElementById('clientsGrid');

        allClients = clients || [];
        currentClients = allClients;
        isUsingSearchResults = false;

        if (clients && clients.length > 0) {
            container.innerHTML = '';

            if (currentView === 'list') {
                renderListView(clients);
            } else {
                renderGridView(clients);
            }
        } else {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i> Нет клиентов для отображения
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        const container = document.getElementById('clientsGrid');
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i> Ошибка при загрузке данных клиентов
                </div>
            </div>
        `;
        showToast('Ошибка при загрузке клиентов', 'danger');
    } finally {
        hideLocalLoader();
    }
}

function renderGridView(clients) {
    const container = document.getElementById('clientsGrid');
    container.classList.add('row', 'g-4');
    container.classList.remove('list-group');

    container.innerHTML = '';

    clients.forEach(client => {
        const bookingsCount = client.bookings_count || 0;
        const companyText = client.company ? client.company : 'Нет компании';
        const createdDate = new Date(client.created_at).toLocaleDateString();

        container.innerHTML += `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h5 class="card-title mb-1">${client.name}</h5>
                                <h6 class="card-subtitle text-muted">${companyText}</h6>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-link text-dark" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu">
                                    <li>
                                        <a class="dropdown-item" href="/clients/${client.id}">
                                            <i class="fas fa-info-circle"></i> Подробнее
                                        </a>
                                    </li>
                                    <li>
                                        <a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#editClientModal" data-client-id="${client.id}">
                                            <i class="fas fa-edit"></i> Редактировать
                                        </a>
                                    </li>
                                    <li>
                                        <hr class="dropdown-divider">
                                    </li>
                                    <li>
                                        <a class="dropdown-item text-danger" href="#" data-bs-toggle="modal" data-bs-target="#deleteClientModal" data-client-id="${client.id}">
                                            <i class="fas fa-trash"></i> Удалить
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="text-muted mb-2">
                                <i class="fas fa-envelope"></i> ${client.email || 'Нет email'}
                            </div>
                            <div class="text-muted">
                                <i class="fas fa-phone"></i> ${client.phone || 'Нет телефона'}
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-primary">${bookingsCount} бронирований</span>
                            <small class="text-muted">Создан: ${createdDate}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

function renderListView(clients) {
    const container = document.getElementById('clientsGrid');
    container.classList.remove('row', 'g-4');

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Клиент</th>
                        <th>Компания</th>
                        <th>Контакты</th>
                        <th>Бронирований</th>
                        <th>Добавлен</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody id="clientsTableBody"></tbody>
            </table>
        </div>
    `;

    const tbody = document.getElementById('clientsTableBody');

    if (clients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    <i class="fas fa-users fa-3x mb-3"></i>
                    <p>Нет клиентов, соответствующих условиям поиска</p>
                </td>
            </tr>
        `;
        return;
    }

    clients.forEach(client => {
        const bookingsCount = client.bookings_count || 0;
        const companyText = client.company ? client.company : 'Нет компании';
        const createdDate = new Date(client.created_at).toLocaleDateString();

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.dataset.clientId = client.id;

        tr.innerHTML = `
            <td>
                <strong>${client.name}</strong>
            </td>
            <td>${companyText}</td>
            <td>
                <div>${client.email || 'Нет email'}</div>
                <div>${client.phone || 'Нет телефона'}</div>
            </td>
            <td>${bookingsCount} бронирований</td>
            <td>Создан: ${createdDate}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-client-btn" data-client-id="${client.id}">
                    <i class="fas fa-eye"></i> Просмотр
                </button>
            </td>
        `;

        tbody.appendChild(tr);

        // Add click event to the row
        tr.addEventListener('click', (e) => {
            // Check if the click is not on a button
            if (!e.target.closest('.view-client-btn')) {
                window.location.href = `/clients/${client.id}`;
            }
        });

        // Prevent button click from triggering row click
        tr.querySelector('.view-client-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `/clients/${client.id}`;
        });
    });
}

function initCrudActions() {
    // Handle add client
    const saveButton = document.getElementById('saveClient');
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            const form = document.getElementById('addClientForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const originalButtonText = saveButton.innerHTML;
            saveButton.disabled = true;
            saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Сохранение...';

            try {
                await api.post('/clients/', data);
                showToast('Клиент успешно добавлен', 'success');

                const modal = bootstrap.Modal.getInstance(document.getElementById('addClientModal'));
                modal.hide();
                form.reset();

                loadClientsWithoutGlobalLoader();
            } catch (error) {
                console.error('Error saving client:', error);
                showToast('Ошибка при сохранении', 'danger');
            } finally {
                saveButton.disabled = false;
                saveButton.innerHTML = originalButtonText;
            }
        });
    }

    // Handle update client
    const updateButton = document.getElementById('updateClient');
    if (updateButton) {
        updateButton.addEventListener('click', async () => {
            const form = document.getElementById('editClientForm');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const originalButtonText = updateButton.innerHTML;
            updateButton.disabled = true;
            updateButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Обновление...';

            try {
                await api.put(`/clients/${data.id}`, data);
                showToast('Клиент успешно обновлен', 'success');

                const modal = bootstrap.Modal.getInstance(document.getElementById('editClientModal'));
                modal.hide();

                loadClientsWithoutGlobalLoader();
            } catch (error) {
                console.error('Error updating client:', error);
                showToast('Ошибка при обновлении', 'danger');
            } finally {
                updateButton.disabled = false;
                updateButton.innerHTML = originalButtonText;
            }
        });
    }

    // Handle delete client
    const deleteButton = document.getElementById('deleteClient');
    if (deleteButton) {
        deleteButton.addEventListener('click', async () => {
            const clientId = document.querySelector('#deleteClientModal').dataset.clientId;

            const originalButtonText = deleteButton.innerHTML;
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Удаление...';

            try {
                await api.delete(`/clients/${clientId}`);
                showToast('Клиент успешно удален', 'success');

                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteClientModal'));
                modal.hide();

                loadClientsWithoutGlobalLoader();
            } catch (error) {
                console.error('Error deleting client:', error);
                showToast('Ошибка при удалении', 'danger');
            } finally {
                deleteButton.disabled = false;
                deleteButton.innerHTML = originalButtonText;
            }
        });
    }

    // Edit client modal event
    const editModal = document.getElementById('editClientModal');
    if (editModal) {
        editModal.addEventListener('show.bs.modal', async (event) => {
            const button = event.relatedTarget;
            const clientId = button.dataset.clientId;

            const form = document.getElementById('editClientForm');
            form.innerHTML = `
                <div class="d-flex justify-content-center my-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Загрузка...</span>
                    </div>
                </div>
            `;

            try {
                const client = await api.get(`/clients/${clientId}`);

                form.innerHTML = `
                    <input type="hidden" name="id">
                    <div class="mb-3">
                        <label class="form-label">ФИО</label>
                        <input type="text" class="form-control" name="name" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Компания</label>
                        <input type="text" class="form-control" name="company">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" name="email" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Телефон</label>
                        <input type="tel" class="form-control" name="phone" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Заметки</label>
                        <textarea class="form-control" name="notes" rows="3"></textarea>
                    </div>
                `;

                Object.entries(client).forEach(([key, value]) => {
                    const input = form.elements[key];
                    if (input) {
                        input.value = value;
                    }
                });
            } catch (error) {
                console.error('Error loading client:', error);
                showToast('Ошибка загрузки данных клиента', 'danger');

                const modal = bootstrap.Modal.getInstance(document.getElementById('editClientModal'));
                modal.hide();
            }
        });
    }

    // Delete client modal event
    const deleteModal = document.getElementById('deleteClientModal');
    if (deleteModal) {
        deleteModal.addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            const clientId = button.dataset.clientId;
            event.target.dataset.clientId = clientId;
        });
    }
}
