/**
 * Client detail page JavaScript functionality
 * Handles loading and displaying client bookings, editing client details, and deletion
 */

import { api } from './utils/api.js';
import { showToast } from './utils/common.js';

document.addEventListener('DOMContentLoaded', function() {
    // Get client ID from URL
    const clientId = window.location.pathname.split('/').pop();

    // Load active bookings
    loadActiveBookings(clientId);

    // Load booking history
    loadBookingHistory(clientId);

    // Initialize CRUD actions
    initCrudActions(clientId);
});

/**
 * Group bookings by project and count equipment
 * @param {Array} bookings - List of bookings
 * @returns {Object} Grouped bookings by project
 */
function groupBookingsByProject(bookings) {
    const projects = {};

    bookings.forEach(booking => {
        const projectId = booking.project_id || 'no_project';
        if (!projects[projectId]) {
            projects[projectId] = {
                id: booking.project_id,
                name: booking.project_name || 'Без проекта',
                equipment: [],
                start_date: new Date(booking.start_date),
                end_date: new Date(booking.end_date),
                status: booking.booking_status
            };
        }

        // Update project dates if needed
        const bookingStart = new Date(booking.start_date);
        const bookingEnd = new Date(booking.end_date);
        if (bookingStart < projects[projectId].start_date) {
            projects[projectId].start_date = bookingStart;
        }
        if (bookingEnd > projects[projectId].end_date) {
            projects[projectId].end_date = bookingEnd;
        }

        // Add equipment
        projects[projectId].equipment.push({
            id: booking.equipment_id,
            name: booking.equipment_name,
            quantity: booking.quantity || 1
        });
    });

    return Object.values(projects);
}

/**
 * Create a table row for a project with equipment count
 * @param {Object} project - Project data
 * @returns {string} HTML string
 */
function createProjectRow(project) {
    const statusColors = {
        'PENDING': 'warning',
        'CONFIRMED': 'info',
        'ACTIVE': 'success',
        'COMPLETED': 'secondary',
        'CANCELLED': 'danger',
        'DRAFT': 'light'
    };

    const startDate = project.start_date.toLocaleDateString();
    const endDate = project.end_date.toLocaleDateString();

    // Create equipment list with quantities
    const equipmentList = project.equipment.map(eq =>
        `${eq.name} (${eq.quantity})`
    ).join('<br>');

    const totalItems = project.equipment.reduce((sum, eq) => sum + (eq.quantity || 1), 0);

    // Get status color with fallback
    const statusColor = statusColors[project.status] || 'secondary';
    const statusText = project.status || 'UNKNOWN';

    return `
        <tr>
            <td>
                <a href="/projects/${project.id}" class="text-decoration-none">
                    ${project.name}
                </a>
            </td>
            <td>
                <span class="text-muted small">Всего позиций: ${project.equipment.length}</span><br>
                <span class="text-muted small">Всего единиц: ${totalItems}</span>
                <button class="btn btn-link btn-sm p-0 ms-2"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#equipment${project.id || 'noproject'}"
                        aria-expanded="false">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="collapse mt-2" id="equipment${project.id || 'noproject'}">
                    ${equipmentList}
                </div>
            </td>
            <td>${startDate} - ${endDate}</td>
            <td>
                <span class="badge bg-${statusColor}">
                    ${statusText}
                </span>
            </td>
            <td>
                <a href="/projects/${project.id}" class="btn btn-sm btn-outline-primary">
                    <i class="fas fa-eye"></i>
                </a>
            </td>
        </tr>
    `;
}

/**
 * Load and display active projects for a client
 * @param {string} clientId - Client ID
 */
async function loadActiveBookings(clientId) {
    try {
        // Load active and draft projects
        const [activeProjects, draftProjects] = await Promise.all([
            api.get(`/projects/?client_id=${clientId}&project_status=ACTIVE`),
            api.get(`/projects/?client_id=${clientId}&project_status=DRAFT`)
        ]);

        const projects = [...activeProjects, ...draftProjects];
        const container = document.getElementById('activeBookings');
        const countBadge = document.getElementById('activeProjectsCount');
        const statusElement = document.getElementById('activeStatus');

        if (!container) {
            console.error('Active bookings container not found');
            return;
        }

        if (projects.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="text-center">Нет активных проектов</td></tr>';
            if (countBadge) countBadge.textContent = '0';
            if (statusElement) statusElement.textContent = 'Нет активных проектов';
            return;
        }

        // Convert projects to the format expected by createProjectRow
        const projectsWithEquipment = await Promise.all(projects.map(async (project) => {
            try {
                // Get project bookings to extract equipment
                const bookings = await api.get(`/projects/${project.id}/bookings`);
                return {
                    id: project.id,
                    name: project.name,
                    status: project.status,
                    start_date: new Date(project.start_date),
                    end_date: new Date(project.end_date),
                    equipment: bookings.map(booking => ({
                        id: booking.equipment_id,
                        name: booking.equipment_name,
                        quantity: booking.quantity || 1
                    }))
                };
            } catch (error) {
                console.error(`Error loading equipment for project ${project.id}:`, error);
                return {
                    id: project.id,
                    name: project.name,
                    status: project.status,
                    start_date: new Date(project.start_date),
                    end_date: new Date(project.end_date),
                    equipment: []
                };
            }
        }));

        container.innerHTML = projectsWithEquipment.map(project => createProjectRow(project)).join('');

        // Update UI indicators
        if (countBadge) countBadge.textContent = projects.length;
        if (statusElement) {
            statusElement.textContent = `${projects.length} ${projects.length === 1 ? 'проект' : projects.length < 5 ? 'проекта' : 'проектов'}`;
        }
    } catch (error) {
        console.error('Error loading active projects:', error);
        const container = document.getElementById('activeBookings');
        const countBadge = document.getElementById('activeProjectsCount');
        const statusElement = document.getElementById('activeStatus');

        if (container) {
            container.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Ошибка при загрузке активных проектов</td></tr>';
        }
        if (countBadge) countBadge.textContent = '!';
        if (statusElement) statusElement.textContent = 'Ошибка загрузки';
    }
}

/**
 * Load and display project history for a client
 * @param {string} clientId - Client ID
 */
async function loadBookingHistory(clientId) {
    try {
        // Load completed and cancelled projects
        const [completedProjects, cancelledProjects] = await Promise.all([
            api.get(`/projects/?client_id=${clientId}&project_status=COMPLETED`),
            api.get(`/projects/?client_id=${clientId}&project_status=CANCELLED`)
        ]);

        const projects = [...completedProjects, ...cancelledProjects];
        const container = document.getElementById('bookingHistory');
        const countBadge = document.getElementById('historyProjectsCount');
        const statusElement = document.getElementById('historyStatus');

        if (!container) {
            console.error('Booking history container not found');
            return;
        }

        if (projects.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="text-center">История проектов пуста</td></tr>';
            if (countBadge) countBadge.textContent = '0';
            if (statusElement) statusElement.textContent = 'История пуста';
            return;
        }

        // Convert projects to the format expected by createProjectRow
        const projectsWithEquipment = await Promise.all(projects.map(async (project) => {
            try {
                // Get project bookings to extract equipment
                const bookings = await api.get(`/projects/${project.id}/bookings`);
                return {
                    id: project.id,
                    name: project.name,
                    status: project.status,
                    start_date: new Date(project.start_date),
                    end_date: new Date(project.end_date),
                    equipment: bookings.map(booking => ({
                        id: booking.equipment_id,
                        name: booking.equipment_name,
                        quantity: booking.quantity || 1
                    }))
                };
            } catch (error) {
                console.error(`Error loading equipment for project ${project.id}:`, error);
                return {
                    id: project.id,
                    name: project.name,
                    status: project.status,
                    start_date: new Date(project.start_date),
                    end_date: new Date(project.end_date),
                    equipment: []
                };
            }
        }));

        container.innerHTML = projectsWithEquipment.map(project => createProjectRow(project)).join('');

        // Update UI indicators
        if (countBadge) {
            countBadge.textContent = projects.length;
            countBadge.className = 'badge bg-info ms-2'; // Change color to indicate data loaded
        }
        if (statusElement) {
            statusElement.textContent = `${projects.length} ${projects.length === 1 ? 'завершенный проект' : projects.length < 5 ? 'завершенных проекта' : 'завершенных проектов'}`;
        }
    } catch (error) {
        console.error('Error loading project history:', error);
        const container = document.getElementById('bookingHistory');
        const countBadge = document.getElementById('historyProjectsCount');
        const statusElement = document.getElementById('historyStatus');

        if (container) {
            container.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Ошибка при загрузке истории проектов</td></tr>';
        }
        if (countBadge) {
            countBadge.textContent = '!';
            countBadge.className = 'badge bg-danger ms-2';
        }
        if (statusElement) statusElement.textContent = 'Ошибка загрузки';
    }
}

function initCrudActions(clientId) {
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
                await api.put(`/clients/${clientId}`, data);
                showToast('Клиент успешно обновлен', 'success');

                const modal = bootstrap.Modal.getInstance(document.getElementById('editClientModal'));
                modal.hide();

                // Reload page to show updated data
                window.location.reload();
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
            const originalButtonText = deleteButton.innerHTML;
            deleteButton.disabled = true;
            deleteButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Удаление...';

            try {
                await api.delete(`/clients/${clientId}`);
                showToast('Клиент успешно удален', 'success');

                // Redirect to clients list
                window.location.href = '/clients';
            } catch (error) {
                console.error('Error deleting client:', error);
                showToast('Ошибка при удалении', 'danger');

                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteClientModal'));
                modal.hide();
            } finally {
                deleteButton.disabled = false;
                deleteButton.innerHTML = originalButtonText;
            }
        });
    }
}
