/**
 * Project details management functionality
 */

import { api } from '../utils/api.js';
import { showToast, formatDate, formatDateTime } from '../utils/common.js';
import { renderEquipmentSection } from './equipment/ui.js';
import {
    initializeEditProjectModal,
    fillEditProjectForm,
    saveProjectChanges
} from './project-form.js';
import {
    getStatusText,
    updateStatusButtons,
    withLoading
} from './project-utils.js';
import { updateProjectStatus, deleteProject } from './project-actions.js';
import { initPaymentStatusChanger } from './payment-status.js';

// Project data state
export let projectData = {};

/**
 * Update project data
 * @param {Object} newData - New project data
 */
export function updateProjectData(newData) {
    projectData = newData;
    // Make project data globally available
    window.projectData = projectData;
    renderProjectDetails(projectData);

    // Trigger equipment dates column visibility update
    if (window.toggleEquipmentDatesColumn) {
        window.toggleEquipmentDatesColumn();
    }
}

/**
 * Initialize project details
 * @param {string} projectId - Project ID
 */
export function initializeProjectDetails(projectId) {
    if (!projectId) {
        showToast('Идентификатор проекта не найден', 'danger');
        return;
    }

    // Load project data
    loadProjectData(projectId);

    // Add event listeners for action buttons
    initializeEventListeners(projectId);

    // Initialize edit project modal
    initializeEditProjectModal();

    // Initialize payment status changer
    initPaymentStatusChanger(projectId, (newStatus) => {
        // Update project data when payment status changes
        if (projectData) {
            projectData.payment_status = newStatus;
            window.projectData = projectData;
        }
    });
}

/**
 * Load project data from API
 * @param {string} projectId - Project ID
 */
async function loadProjectData(projectId) {
    try {
        await withLoading(async () => {
            // Get project details
            projectData = await api.get(`/projects/${projectId}`);

            // Check if bookings exist in the API response under different possible names
            if (projectData.bookings && Array.isArray(projectData.bookings)) {
                // Bookings already in project response
            } else if (projectData.reservations && Array.isArray(projectData.reservations)) {
                projectData.bookings = projectData.reservations;
            } else if (projectData.equipment && Array.isArray(projectData.equipment)) {
                projectData.bookings = projectData.equipment;
            } else {
                // Get project bookings separately
                try {
                    const bookingsResponse = await api.get(`/projects/${projectId}/bookings`);

                    // Handle both array response and paginated response
                    projectData.bookings = Array.isArray(bookingsResponse)
                        ? bookingsResponse
                        : (bookingsResponse.items || []);

                    // create empty array if API returns empty array or null
                    if (!projectData.bookings) {
                        projectData.bookings = [];
                    }
                } catch (bookingError) {
                    console.error('Error loading project bookings:', bookingError);
                    projectData.bookings = [];
                }
            }

            // Render project details
            renderProjectDetails(projectData);

            // Make project data globally available
            window.projectData = projectData;
        });
    } catch (error) {
        console.error('Error loading project data:', error);
        showToast('Ошибка загрузки данных проекта', 'danger');
    }
}

/**
 * Initialize event listeners
 * @param {string} projectId - Project ID
 */
function initializeEventListeners(projectId) {
    // Status update buttons
    document.querySelectorAll('[data-status]').forEach(btn => {
        btn.addEventListener('click', () => updateProjectStatus(projectId, btn.dataset.status));
    });

    // Edit project button
    document.getElementById('editProjectBtn')?.addEventListener('click', () => {
        const editModal = document.getElementById('editProjectModal');
        if (editModal) {
            // Fill form and then show modal
            fillEditProjectForm(projectData);
            new bootstrap.Modal(editModal).show();
        }
    });

    // Save project button
    document.getElementById('saveProjectBtn')?.addEventListener('click', () => saveProjectChanges(projectId, projectData));

    // Delete project button
    document.getElementById('deleteProject')?.addEventListener('click', () => deleteProject(projectId));

    // Status form submit
    const statusForm = document.getElementById('statusForm');
    if (statusForm) {
        statusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusSelect = document.getElementById('projectStatus');
            if (statusSelect) {
                const status = statusSelect.value;
                await updateProjectStatus(projectId, status);
            }
        });
    }

    // Notes form submit
    const notesForm = document.getElementById('notesForm');
    if (notesForm) {
        notesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const notesField = document.getElementById('notes');
            if (notesField) {
                try {
                    const updatedProject = await api.patch(`/projects/${projectId}`, {
                        notes: notesField.value
                    });
                    updateProjectData(updatedProject);
                    showToast('Заметки сохранены', 'success');
                } catch (error) {
                    console.error('Error saving notes:', error);
                    showToast('Ошибка при сохранении заметок', 'danger');
                }
            }
        });
    }
}

/**
 * Render project details
 * @param {Object} project - Project data
 */
export function renderProjectDetails(project) {
    // Update project info with null checks
    const projectName = document.getElementById('projectName');
    if (projectName) projectName.textContent = project.name;

    // Update main project display elements
    const projectNameDisplay = document.getElementById('project-name-display');
    if (projectNameDisplay) projectNameDisplay.textContent = project.name;

    const projectClientDisplay = document.getElementById('project-client-display');
    if (projectClientDisplay) {
        if (project.client_id && project.client_name) {
            projectClientDisplay.innerHTML = `<a href="/clients/${project.client_id}" class="text-decoration-none text-muted client-link">${project.client_name}</a>`;
        } else {
            projectClientDisplay.textContent = 'Не указан';
        }
    }

    const projectDescriptionDisplay = document.getElementById('project-description-display');
    if (projectDescriptionDisplay) projectDescriptionDisplay.textContent = project.description || '';

    const projectClient = document.getElementById('projectClient');
    if (projectClient) projectClient.textContent = project.client_name || 'Не указан';

    const projectDates = document.getElementById('projectDates');
    if (projectDates) projectDates.textContent = `${formatDateTime(project.start_date)} - ${formatDateTime(project.end_date)}`;

    // Update project dates display in the main project card
    const projectDatesDisplay = document.getElementById('project-dates-display');
    if (projectDatesDisplay) projectDatesDisplay.textContent = `${formatDateTime(project.start_date)} - ${formatDateTime(project.end_date)}`;

    const projectStatus = document.getElementById('projectStatus');
    if (projectStatus) {
        if (projectStatus.tagName === 'SELECT') {
            const option = projectStatus.querySelector(`option[value="${project.status}"]`);
            if (option) {
                option.selected = true;
            }
        } else {
            projectStatus.textContent = getStatusText(project.status);
        }
    }

    const notesField = document.getElementById('notes');
    if (notesField) {
        notesField.value = project.notes || '';
    }

    const projectCreated = document.getElementById('projectCreated');
    if (projectCreated) projectCreated.textContent = formatDateTime(project.created_at);

    const projectUpdated = document.getElementById('projectUpdated');
    if (projectUpdated) projectUpdated.textContent = formatDateTime(project.updated_at);

    // Update hidden fields with project dates (keep ISO format for JavaScript processing)
    const projectStartDateField = document.getElementById('project-start-date');
    const projectEndDateField = document.getElementById('project-end-date');

    if (projectStartDateField && project.start_date) {
        projectStartDateField.value = project.start_date; // Keep ISO format
    }

    if (projectEndDateField && project.end_date) {
        projectEndDateField.value = project.end_date; // Keep ISO format
    }

    // Update status buttons
    updateStatusButtons(project.status);

    // Render equipment section
    renderEquipmentSection(project);
}
