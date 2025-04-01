/**
 * Projects management JavaScript functionality.
 *
 * This module contains functions for project management, including:
 * - Initialization
 * - Clients loading
 * - Status updates
 * - Notes editing
 * - Project editing
 * - Project deletion
 * - Booking management
 */

// Project view initialization
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('statusForm')) {
        initProjectView();
    }
});

// Initialize project view page
function initProjectView() {
    // Load clients for edit form
    loadClients();

    // Initialize date pickers
    initDatePickers();

    // Add event listeners
    document.getElementById('statusForm').addEventListener('submit', updateProjectStatus);
    document.getElementById('notesForm').addEventListener('submit', updateProjectNotes);
    document.getElementById('updateProject').addEventListener('click', updateProject);
    document.getElementById('deleteProject').addEventListener('click', deleteProject);
    document.getElementById('updateBooking').addEventListener('click', updateBooking);

    // Add listeners for edit booking buttons
    document.querySelectorAll('.edit-booking-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.currentTarget.dataset.bookingId;
            const equipmentName = e.currentTarget.dataset.equipmentName;
            const startDate = e.currentTarget.dataset.startDate;
            const endDate = e.currentTarget.dataset.endDate;
            showEditBookingModal(bookingId, equipmentName, startDate, endDate);
        });
    });

    // Add listener for print button if it exists
    const printBtn = document.getElementById('printProjectBtn');
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            const projectId = this.dataset.projectId;
            if (window.PrintModule) {
                // If print module is loaded, use it
                window.PrintModule.openProjectPrintWindow(projectId);
            } else {
                // Fallback if print module is not loaded
                window.open(`/projects/${projectId}/print`, '_blank');
            }
        });
    }
}

// Load clients for select dropdown
async function loadClients() {
    try {
        const clients = await api.get('/clients');
        const select = document.querySelector('select[name="client_id"]');
        if (!select) return;

        const currentClientId = parseInt(select.dataset.clientId, 10);

        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            if (client.id === currentClientId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading clients:', error);
        showToast('Ошибка загрузки списка клиентов', 'danger');
    }
}

// Initialize date pickers
function initDatePickers() {
    // Project dates picker for edit form
    const projectDateInput = $('#editProjectForm [name="project_dates"]');
    if (projectDateInput.length) {
        projectDateInput.daterangepicker({
            startDate: moment(projectDateInput.data('start-date')),
            endDate: moment(projectDateInput.data('end-date')),
            locale: {
                format: 'DD.MM.YYYY',
                applyLabel: 'Применить',
                cancelLabel: 'Отмена',
                fromLabel: 'С',
                toLabel: 'По',
                customRangeLabel: 'Произвольный период',
                daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
                monthNames: [
                    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
                ],
                firstDay: 1
            }
        });
    }

    // Booking period picker
    const bookingPeriodInput = $('#editBookingPeriod');
    if (bookingPeriodInput.length) {
        bookingPeriodInput.daterangepicker({
            locale: {
                format: 'DD.MM.YYYY',
                applyLabel: 'Применить',
                cancelLabel: 'Отмена',
                fromLabel: 'С',
                toLabel: 'По',
                customRangeLabel: 'Произвольный период',
                daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
                monthNames: [
                    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
                ],
                firstDay: 1
            }
        });
    }
}

// Update project status
async function updateProjectStatus(e) {
    e.preventDefault();
    const status = document.getElementById('projectStatus').value;
    const projectId = document.getElementById('project-id').value;

    try {
        // Get project data from data attributes
        const projectData = {
            name: document.getElementById('project-name').value,
            client_id: parseInt(document.getElementById('project-client-id').value),
            start_date: document.getElementById('project-start-date').value,
            end_date: document.getElementById('project-end-date').value,
            description: document.getElementById('project-description').value || '',
            notes: document.getElementById('project-notes').value || '',
            status: status
        };

        await api.put(`/projects/${projectId}`, projectData);
        showToast('Статус проекта обновлен', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error updating project status:', error);
        showToast('Ошибка при обновлении статуса', 'danger');
    }
}

// Update project notes
async function updateProjectNotes(e) {
    e.preventDefault();
    const notes = document.getElementById('notes').value;
    const projectId = document.getElementById('project-id').value;

    try {
        // Get project data from data attributes
        const projectData = {
            name: document.getElementById('project-name').value,
            client_id: parseInt(document.getElementById('project-client-id').value),
            start_date: document.getElementById('project-start-date').value,
            end_date: document.getElementById('project-end-date').value,
            description: document.getElementById('project-description').value || '',
            status: document.getElementById('project-status').value,
            notes: notes
        };

        await api.put(`/projects/${projectId}`, projectData);
        showToast('Заметки сохранены', 'success');
    } catch (error) {
        console.error('Error updating project notes:', error);
        showToast('Ошибка при сохранении заметок', 'danger');
    }
}

// Update project
async function updateProject() {
    const form = document.getElementById('editProjectForm');
    const formData = new FormData(form);
    const dateRange = $('#editProjectForm [name="project_dates"]').data('daterangepicker');
    const projectId = document.getElementById('project-id').value;

    const data = {
        name: formData.get('name'),
        client_id: parseInt(formData.get('client_id')),
        description: formData.get('description') || null,
        start_date: dateRange.startDate.format('YYYY-MM-DDTHH:mm:ss'),
        end_date: dateRange.endDate.format('YYYY-MM-DDTHH:mm:ss')
    };

    try {
        await api.put(`/projects/${projectId}`, data);
        showToast('Проект обновлен', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error updating project:', error);
        showToast('Ошибка при обновлении проекта', 'danger');
    }
}

// Delete project
async function deleteProject() {
    if (!confirm('Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.')) {
        return;
    }

    const projectId = document.getElementById('project-id').value;

    try {
        await api.delete(`/projects/${projectId}`);
        showToast('Проект удален', 'success');
        setTimeout(() => window.location.href = '/projects', 1000);
    } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Ошибка при удалении проекта', 'danger');
    }
}

// Show edit booking modal
function showEditBookingModal(bookingId, equipmentName, startDate, endDate) {
    document.getElementById('editBookingId').value = bookingId;
    document.getElementById('editBookingEquipmentName').textContent = equipmentName;

    const dateRange = $('#editBookingPeriod').data('daterangepicker');
    dateRange.setStartDate(moment(startDate));
    dateRange.setEndDate(moment(endDate));

    new bootstrap.Modal('#editBookingModal').show();
}

// Update booking
async function updateBooking() {
    const bookingId = document.getElementById('editBookingId').value;
    const dateRange = $('#editBookingPeriod').data('daterangepicker');

    const data = {
        start_date: dateRange.startDate.format('YYYY-MM-DDTHH:mm:ss'),
        end_date: dateRange.endDate.format('YYYY-MM-DDTHH:mm:ss')
    };

    try {
        await api.patch(`/bookings/${bookingId}`, data);
        showToast('Бронирование обновлено', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Error updating booking:', error);
        showToast('Ошибка при обновлении бронирования', 'danger');
    }
}

// Helper function for status colors
function getStatusColor(status) {
    const colors = {
        'DRAFT': 'secondary',
        'ACTIVE': 'success',
        'COMPLETED': 'info',
        'CANCELLED': 'danger'
    };
    return colors[status] || 'secondary';
}
