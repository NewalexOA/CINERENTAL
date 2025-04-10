/**
 * Project viewing functionality
 *
 * This module handles the display and interaction with individual project details:
 * - Loading project data
 * - Displaying equipment details
 * - Handling status updates
 * - Managing payments
 */

// Project data state
let projectData = {};
let equipmentList = [];

const toast = typeof window.showToast === 'function' ? window.showToast :
            (typeof showProjectToast === 'function' ? showProjectToast :
             (msg, type) => { alert(`${type.toUpperCase()}: ${msg}`); });

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Get project ID from URL
    const projectId = getProjectIdFromUrl();

    if (!projectId) {
        toast('Идентификатор проекта не найден', 'danger');
        return;
    }

    // Load project data
    loadProjectData(projectId);

    // Add event listeners for action buttons
    initializeEventListeners(projectId);

    // Initialize edit project modal
    initializeEditProjectModal();
});

/**
 * Extract project ID from current URL
 * @returns {string|null} - Project ID or null if not found
 */
function getProjectIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    const projectIdIndex = pathParts.indexOf('projects') + 1;

    if (projectIdIndex < pathParts.length) {
        return pathParts[projectIdIndex];
    }

    return null;
}

/**
 * Initialize event listeners for page interactions
 * @param {string} projectId - Project ID
 */
function initializeEventListeners(projectId) {
    // Status update button
    document.getElementById('statusForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const statusSelect = document.getElementById('projectStatus');
        updateProjectStatus(projectId, statusSelect.value);
    });

    // Payment update button
    document.getElementById('updatePaymentBtn')?.addEventListener('click', () => {
        const paymentSelect = document.getElementById('paymentStatus');
        updatePaymentStatus(projectId, paymentSelect.value);
    });

    // Cancel project button
    document.getElementById('cancelProjectBtn')?.addEventListener('click', () => {
        confirmCancelProject(projectId);
    });

    // Edit project button
    document.getElementById('editProjectBtn')?.addEventListener('click', () => {
        window.location.href = `/projects/${projectId}/edit`;
    });

    // Notes form submission
    document.getElementById('notesForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const notesText = document.getElementById('notes').value;
        updateProjectNotes(projectId, notesText);
    });

    // Edit project button in modal
    document.getElementById('updateProject')?.addEventListener('click', () => {
        handleUpdateProject(projectId);
    });

    // Delete project confirmation button in modal
    document.getElementById('deleteProject')?.addEventListener('click', () => {
        handleDeleteProject(projectId);
    });
}

/**
 * Load project data from API
 * @param {string} projectId - Project ID
 */
async function loadProjectData(projectId) {
    try {
        showLoading();

        // Get project details (includes bookings)
        projectData = await api.get(`/projects/${projectId}`);

        // Render project details
        renderProjectDetails(projectData);

        // Equipment list is rendered server-side by the template.
        // No need to call loadEquipmentList or renderEquipmentList here for initial load.

        // Optional: If we need to dynamically update equipment later,
        // we might need a different render function that uses projectData.bookings.

        hideLoading();
    } catch (error) {
        console.error('Error loading project data:', error);
        toast('Ошибка загрузки данных проекта', 'danger');
        hideLoading();
    }
}

/**
 * Render project details on the page
 * @param {Object} project - Project data
 */
function renderProjectDetails(project) {
    // Update page title
    document.title = `Проект: ${project.name} | ACT-Rental`;

    // Project Name (h1)
    const projectTitleEl = document.querySelector('.card-body h1.card-title');
    if (projectTitleEl) projectTitleEl.textContent = project.name;
    else console.warn('Element for project title not found.');

    // Client Name (h6)
    const clientNameEl = document.querySelector('.card-body h6.card-subtitle');
    if (clientNameEl) clientNameEl.textContent = project.client_name || 'Клиент не указан'; // Use client_name from project_data
    else console.warn('Element for client name not found.');

    // Status Badge (span with ID)
    const statusBadge = document.getElementById('project-status-badge');
    if (statusBadge) {
        const statusColor = typeof getStatusColor === 'function' ?
                           getStatusColor(project.status) :
                           (project.status === 'ACTIVE' ? 'success' :
                            project.status === 'COMPLETED' ? 'info' :
                            project.status === 'CANCELLED' ? 'danger' : 'secondary');
        statusBadge.className = `badge bg-${statusColor} fs-6`;
        statusBadge.textContent = project.status;
    } else {
        console.warn('Element with ID \'project-status-badge\' not found for rendering.');
    }

    // Status Select (used for updating, set initial value)
    const statusSelect = document.getElementById('projectStatus');
    if (statusSelect) statusSelect.value = project.status;
    else console.warn('Element with ID \'projectStatus\' not found.');

    // Description (p)
    const descriptionEl = document.querySelector('.card-body p.card-text'); // Might be too generic
    if (descriptionEl) descriptionEl.textContent = project.description || 'Описание отсутствует';
    else console.warn('Element for project description not found.');

    // Use more specific selectors for Period and Created cards
    const detailCards = document.querySelectorAll('.card.bg-light');
    if (detailCards.length >= 2) {
        // Period (assuming it's the first light card)
        const periodEl = detailCards[0].querySelector('p.card-text');
        if (periodEl) periodEl.textContent = `${formatDate(project.start_date)} - ${formatDate(project.end_date)}`;
        else console.warn('Element for project period not found.');

        // Created (assuming it's the second light card)
        const createdEl = detailCards[1].querySelector('p.card-text');
        if (createdEl) createdEl.textContent = formatDateTime(project.created_at);
        else console.warn('Element for project created date not found.');
    } else {
        console.warn('Detail cards for period/created date not found.');
    }

    // Notes (textarea)
    const notesEl = document.getElementById('notes');
    if (notesEl) notesEl.value = project.notes || ''; // Use .value for textarea
    else console.warn('Element with ID \'notes\' not found.');

    // Update actions based on status
    updateActionsBasedOnStatus(project.status);
}

/**
 * Update available actions based on project status
 * @param {string} status - Project status
 */
function updateActionsBasedOnStatus(status) {
    const cancelBtn = document.getElementById('cancelProjectBtn');
    const editBtn = document.getElementById('editProjectBtn');
    const statusSelect = document.getElementById('projectStatus');

    // Disable cancel button for completed or cancelled projects
    if (cancelBtn) {
        cancelBtn.disabled = ['COMPLETED', 'CANCELLED'].includes(status);
    }

    // Disable edit button for completed or cancelled projects
    if (editBtn) {
        editBtn.disabled = ['COMPLETED', 'CANCELLED'].includes(status);
    }

    // Remove cancelled and completed options from status dropdown based on current status
    if (statusSelect) {
        Array.from(statusSelect.options).forEach(option => {
            if (option.value === 'CANCELLED' && status !== 'CANCELLED') {
                option.disabled = true;
            }
        });
    }
}

/**
 * Update project status
 * @param {string} projectId - Project ID
 * @param {string} newStatus - New status value
 */
async function updateProjectStatus(projectId, newStatus) {
    try {
        const updatedProject = await api.patch(`/projects/${projectId}`, { status: newStatus });

        if (projectData) {
            projectData.status = updatedProject.status;
        }

        // Find and Update UI for the status badge using the new ID
        const statusBadge = document.getElementById('project-status-badge');
        if (statusBadge) {
            // Get status color
            const statusColor = typeof getStatusColor === 'function' ?
                               getStatusColor(newStatus) :
                               (newStatus === 'ACTIVE' ? 'success' :
                                newStatus === 'COMPLETED' ? 'info' :
                                newStatus === 'CANCELLED' ? 'danger' : 'secondary');

            statusBadge.className = `badge bg-${statusColor} fs-6`; // Keep fs-6 if needed
            statusBadge.textContent = newStatus;
        } else {
             console.warn('Element with ID \'project-status-badge\' not found for updating.');
        }

        // Update actions
        updateActionsBasedOnStatus(newStatus);

        toast('Статус проекта обновлен', 'success');
    } catch (error) {
        console.error('Error updating project status:', error);
        toast('Ошибка обновления статуса проекта', 'danger');
    }
}

/**
 * Update payment status
 * @param {string} projectId - Project ID
 * @param {string} newStatus - New payment status
 */
async function updatePaymentStatus(projectId, newStatus) {
    try {
        await api.patch(`/projects/${projectId}/payment`, { payment_status: newStatus });
        toast('Статус оплаты обновлен', 'success');
    } catch (error) {
        console.error('Error updating payment status:', error);
        toast('Ошибка обновления статуса оплаты', 'danger');
    }
}

/**
 * Show confirmation dialog for project cancellation
 * @param {string} projectId - Project ID
 */
function confirmCancelProject(projectId) {
    if (confirm('Вы уверены, что хотите отменить проект? Это действие нельзя отменить.')) {
        cancelProject(projectId);
    }
}

/**
 * Cancel project
 * @param {string} projectId - Project ID
 */
async function cancelProject(projectId) {
    try {
        const updatedProject = await api.patch(`/projects/${projectId}`, { status: 'CANCELLED' });

        if (projectData) {
            projectData.status = 'CANCELLED';
        }

        // Update UI
        document.getElementById('projectStatus').value = 'CANCELLED';

        const statusBadge = document.getElementById('project-status-badge');
        if (statusBadge) {
            statusBadge.className = 'badge bg-danger fs-6';
            statusBadge.textContent = 'CANCELLED';
        }

        // Update actions
        updateActionsBasedOnStatus('CANCELLED');

        toast('Проект отменен', 'warning');
    } catch (error) {
        console.error('Error cancelling project:', error);
        toast('Ошибка при отмене проекта', 'danger');
    }
}

/**
 * Handle project deletion
 * @param {string} projectId - Project ID
 */
async function handleDeleteProject(projectId) {
    const modalElement = document.getElementById('deleteProjectModal');
    const modal = bootstrap.Modal.getInstance(modalElement);

    try {
        // Optionally show a loading state inside the modal
        const deleteButton = document.getElementById('deleteProject');
        deleteButton.disabled = true;
        deleteButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Удаление...';

        await api.delete(`/projects/${projectId}`);

        if (modal) {
            modal.hide();
        }

        toast('Проект успешно удален', 'success');

        // Redirect to projects list page after a short delay
        setTimeout(() => {
            window.location.href = '/projects';
        }, 1500);

    } catch (error) {
        console.error('Error deleting project:', error);
        toast(`Ошибка при удалении проекта: ${error.message}`, 'danger');
        // Re-enable button on error
        if (deleteButton) {
             deleteButton.disabled = false;
             deleteButton.innerHTML = 'Удалить';
        }
        // Optionally hide modal on error too, or keep it open
        // if (modal) {
        //     modal.hide();
        // }
    }
}

/**
 * Show loading state
 */
function showLoading() {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) {
        loadingEl.classList.remove('d-none');
    }
}

/**
 * Hide loading state
 */
function hideLoading() {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) {
        loadingEl.classList.add('d-none');
    }
}

/**
 * Initialize edit project modal
 */
function initializeEditProjectModal() {
    const editModal = document.getElementById('editProjectModal');
    if (!editModal) return;

    // Initialize daterangepicker for project dates
    const projectDates = editModal.querySelector('input[name="project_dates"]');
    if (projectDates) {
        $(projectDates).daterangepicker({
            autoUpdateInput: false,
            locale: DATERANGEPICKER_LOCALE
        });

        $(projectDates).on('apply.daterangepicker', function(ev, picker) {
            $(this).val(picker.startDate.format('DD.MM.YYYY') + ' - ' + picker.endDate.format('DD.MM.YYYY'));
        });

        $(projectDates).on('cancel.daterangepicker', function(ev, picker) {
            $(this).val('');
        });
    }

    // Handle modal show event
    editModal.addEventListener('show.bs.modal', async () => {
        const form = editModal.querySelector('#editProjectForm');
        if (!form || !projectData) return;

        try {
            // Load clients list
            const clients = await api.get('/clients');
            const clientSelect = form.querySelector('select[name="client_id"]');

            if (clientSelect) {
                // Save current selection
                const currentClientId = clientSelect.value;

                // Clear and rebuild options
                clientSelect.innerHTML = '<option value="">Выберите клиента</option>';

                // Add client options
                clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = client.name;
                    clientSelect.appendChild(option);
                });

                // Restore selection
                clientSelect.value = projectData.client_id || '';
            }

            // Set project name
            const nameInput = form.querySelector('input[name="name"]');
            if (nameInput) nameInput.value = projectData.name || '';

            // Set project dates
            if (projectDates && projectData.start_date && projectData.end_date) {
                const picker = $(projectDates).data('daterangepicker');
                picker.setStartDate(moment(projectData.start_date));
                picker.setEndDate(moment(projectData.end_date));
                projectDates.value = picker.startDate.format('DD.MM.YYYY') + ' - ' + picker.endDate.format('DD.MM.YYYY');
            }

            // Set description
            const descriptionInput = form.querySelector('textarea[name="description"]');
            if (descriptionInput) descriptionInput.value = projectData.description || '';
        } catch (error) {
            console.error('Error loading clients:', error);
            toast('Ошибка загрузки списка клиентов', 'danger');
        }
    });
}

/**
 * Handle project update
 * @param {string} projectId - Project ID
 */
async function handleUpdateProject(projectId) {
    const form = document.getElementById('editProjectForm');
    if (!form) return;

    try {
        // Show loading state
        const updateButton = document.getElementById('updateProject');
        if (updateButton) {
            updateButton.disabled = true;
            updateButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Сохранение...';
        }

        // Get form data
        const formData = new FormData(form);
        const dateRange = $(form.querySelector('input[name="project_dates"]')).data('daterangepicker');

        // Create payload
        const payload = {
            name: formData.get('name'),
            client_id: parseInt(formData.get('client_id')),
            description: formData.get('description') || null,
            start_date: dateRange?.startDate?.format('YYYY-MM-DDTHH:mm:ss'),
            end_date: dateRange?.endDate?.format('YYYY-MM-DDTHH:mm:ss')
        };

        // Validate required fields
        if (!payload.name) {
            toast('Введите название проекта', 'warning');
            return;
        }
        if (!payload.client_id) {
            toast('Выберите клиента', 'warning');
            return;
        }
        if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
            toast('Выберите период проекта', 'warning');
            return;
        }

        // Send update request
        const updatedProject = await api.patch(`/projects/${projectId}`, payload);

        // Update local data
        projectData = updatedProject;

        // Update UI
        renderProjectDetails(updatedProject);

        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editProjectModal'));
        if (modal) {
            modal.hide();
        }

        toast('Проект успешно обновлен', 'success');
    } catch (error) {
        console.error('Error updating project:', error);
        toast(`Ошибка при обновлении проекта: ${error.message}`, 'danger');
    } finally {
        // Restore button state
        const updateButton = document.getElementById('updateProject');
        if (updateButton) {
            updateButton.disabled = false;
            updateButton.innerHTML = 'Сохранить';
        }
    }
}

/**
 * Update project notes
 * @param {string} projectId - Project ID
 * @param {string} notes - New notes text
 */
async function updateProjectNotes(projectId, notes) {
    try {
        // Disable the save button and show spinner
        const submitBtn = document.querySelector('#notesForm button[type="submit"]');
        if (submitBtn) {
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Сохранение...';
        }

        // Send the update to the API
        const updatedProject = await api.patch(`/projects/${projectId}`, { notes });

        // Update local data
        if (projectData) {
            projectData.notes = updatedProject.notes;
        }

        // Show success message
        toast('Заметки к проекту обновлены', 'success');

        // Restore the button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Сохранить';
        }
    } catch (error) {
        console.error('Error updating project notes:', error);
        toast('Ошибка при обновлении заметок к проекту', 'danger');

        // Restore the button on error
        const submitBtn = document.querySelector('#notesForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Сохранить';
        }
    }
}
