/**
 * Client detail page JavaScript functionality
 * Handles loading and displaying client bookings, editing client details, and deletion
 */

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
                status: booking.status
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
        'ACTIVE': 'success',
        'COMPLETED': 'info',
        'CANCELLED': 'danger',
        'DRAFT': 'secondary'
    };

    const startDate = project.start_date.toLocaleDateString();
    const endDate = project.end_date.toLocaleDateString();

    // Create equipment list with quantities
    const equipmentList = project.equipment.map(eq =>
        `${eq.name} (${eq.quantity})`
    ).join('<br>');

    const totalItems = project.equipment.reduce((sum, eq) => sum + (eq.quantity || 1), 0);

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
                <span class="badge bg-${statusColors[project.status]}">
                    ${project.status}
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
 * Load and display active bookings for a client
 * @param {string} clientId - Client ID
 */
async function loadActiveBookings(clientId) {
    try {
        const bookings = await api.get(`/clients/${clientId}/bookings/?status=PENDING,CONFIRMED,ACTIVE`);
        const container = document.getElementById('activeBookings');
        if (!container) {
            console.error('Active bookings container not found');
            return;
        }

        if (bookings.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="text-center">Нет активных бронирований</td></tr>';
            return;
        }

        const projects = groupBookingsByProject(bookings);
        container.innerHTML = projects.map(project => createProjectRow(project)).join('');
    } catch (error) {
        console.error('Error loading active bookings:', error);
        const container = document.getElementById('activeBookings');
        if (container) {
            container.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Ошибка при загрузке активных бронирований</td></tr>';
        }
    }
}

/**
 * Load and display booking history for a client
 * @param {string} clientId - Client ID
 */
async function loadBookingHistory(clientId) {
    try {
        const bookings = await api.get(`/clients/${clientId}/bookings/?status=COMPLETED,CANCELLED`);
        const container = document.getElementById('bookingHistory');
        if (!container) {
            console.error('Booking history container not found');
            return;
        }

        if (bookings.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="text-center">История бронирований пуста</td></tr>';
            return;
        }

        const projects = groupBookingsByProject(bookings);
        container.innerHTML = projects.map(project => createProjectRow(project)).join('');
    } catch (error) {
        console.error('Error loading booking history:', error);
        const container = document.getElementById('bookingHistory');
        if (container) {
            container.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Ошибка при загрузке истории бронирований</td></tr>';
        }
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
