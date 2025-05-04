/**
 * Project form management functionality
 */

import { api } from '../utils/api.js';
import { showToast, DATERANGEPICKER_LOCALE } from '../utils/common.js';
import { withLoading } from './project-utils.js';

/**
 * Initialize edit project modal
 */
export function initializeEditProjectModal() {
    // Initialize client selection with Select2
    const clientSelect = document.getElementById('edit-project-client');

    if (clientSelect) {
        // Initialize Select2 for client dropdown
        $(clientSelect).select2({
            placeholder: 'Выберите клиента',
            allowClear: true,
            dropdownParent: $('#editProjectModal')
        });

        // Load clients list
        loadClientsForSelect(clientSelect);
    }

    // Initialize project date range picker
    const dateInput = document.getElementById('edit-project-dates');

    if (dateInput) {
        const initialValue = $(dateInput).val();
        let initialDates = { start: null, end: null };

        if (initialValue && initialValue.includes(' - ')) {
            const dateParts = initialValue.split(' - ');
            initialDates.start = moment(dateParts[0], 'DD.MM.YYYY');
            initialDates.end = moment(dateParts[1], 'DD.MM.YYYY');

            console.log('Initializing daterangepicker with dates from value:',
                initialDates.start.format('YYYY-MM-DD'),
                initialDates.end.format('YYYY-MM-DD'));
        }

        const options = {
            locale: {
                ...DATERANGEPICKER_LOCALE,
                cancelLabel: 'Очистить'
            },
            minSpan: {
                days: 1
            }
        };

        if (initialDates.start && initialDates.start.isValid() &&
            initialDates.end && initialDates.end.isValid()) {
            options.startDate = initialDates.start;
            options.endDate = initialDates.end;
        }

        $(dateInput).daterangepicker(options);

        // Handle apply event when dates are selected
        $(dateInput).on('apply.daterangepicker', function(ev, picker) {
            if (picker.startDate.format('YYYY-MM-DD') === picker.endDate.format('YYYY-MM-DD')) {
                picker.setEndDate(picker.endDate.clone().add(1, 'days'));
            }

            $(this).val(picker.startDate.format('DD.MM.YYYY') + ' - ' + picker.endDate.format('DD.MM.YYYY'));
        });

        // Handle cancel event when date selection is cleared
        $(dateInput).on('cancel.daterangepicker', function(ev, picker) {
            $(this).val('');
        });
    }

    // Initialize save button handler
    const updateProjectBtn = document.getElementById('updateProject');
    if (updateProjectBtn) {
        updateProjectBtn.addEventListener('click', () => {
            const projectId = document.getElementById('project-id').value;
            saveProjectChanges(projectId, window.projectData);
        });
    }

    // Fix for aria-hidden issue in Bootstrap modals
    // When modal is about to hide, blur any focused element to prevent accessibility errors
    const editModal = document.getElementById('editProjectModal');
    if (editModal) {
        editModal.addEventListener('hide.bs.modal', () => {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        });
    }
}

/**
 * Load clients for select dropdown
 * @param {HTMLElement} selectElement - Select element to populate
 */
async function loadClientsForSelect(selectElement) {
    try {
        const clients = await api.get('/clients');

        // Clear select except placeholder
        const placeholder = selectElement.querySelector('option[value=""]');
        selectElement.innerHTML = '';
        if (placeholder) {
            selectElement.appendChild(placeholder);
        }

        // Add clients to select
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            selectElement.appendChild(option);
        });

        // If select has client ID attribute, select it
        const clientId = selectElement.dataset.clientId;
        if (clientId) {
            $(selectElement).val(clientId).trigger('change');
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        showToast('Ошибка загрузки списка клиентов', 'danger');
    }
}

/**
 * Fill edit project form
 * @param {Object} project - Project data
 */
export function fillEditProjectForm(project) {
    console.log('Filling project form with data:', project);

    // Fill form fields
    const nameInput = document.getElementById('edit-project-name');
    const clientSelect = document.getElementById('edit-project-client');
    const descriptionInput = document.getElementById('edit-project-description');

    if (nameInput) nameInput.value = project.name || '';

    if (clientSelect) {
        // Set client ID attribute if Select2 not initialized yet
        clientSelect.dataset.clientId = project.client_id;

        // If Select2 already initialized, select client
        if ($.fn.select2 && $(clientSelect).data('select2')) {
            $(clientSelect).val(project.client_id).trigger('change');
        }
    }

    if (descriptionInput) descriptionInput.value = project.description || '';
}

/**
 * Save project changes
 * @param {string} projectId - Project ID
 * @param {Object} projectData - Project data state
 */
export async function saveProjectChanges(projectId, projectData) {
    // Get form data
    const nameInput = document.getElementById('edit-project-name');
    const clientSelect = document.getElementById('edit-project-client');
    const datesInput = document.getElementById('edit-project-dates');
    const descriptionInput = document.getElementById('edit-project-description');

    // Validation
    if (!nameInput || !nameInput.value.trim()) {
        showToast('Введите название проекта', 'danger');
        return;
    }

    if (!clientSelect || !clientSelect.value) {
        showToast('Выберите клиента', 'danger');
        return;
    }

    if (!datesInput || !datesInput.value) {
        showToast('Укажите период проекта', 'danger');
        return;
    }

    // Get dates from period input
    let startDate, endDate;

    if ($(datesInput).data('daterangepicker')) {
        const picker = $(datesInput).data('daterangepicker');
        startDate = picker.startDate.format('YYYY-MM-DD');
        endDate = picker.endDate.format('YYYY-MM-DD');

        if (startDate === endDate) {
            endDate = moment(endDate).add(1, 'days').format('YYYY-MM-DD');
        }
    } else {
        // Fallback to parsing input value
        const dateParts = datesInput.value.split(' - ');
        if (dateParts.length === 2) {
            startDate = moment(dateParts[0], 'DD.MM.YYYY').format('YYYY-MM-DD');
            endDate = moment(dateParts[1], 'DD.MM.YYYY').format('YYYY-MM-DD');

            if (startDate === endDate) {
                endDate = moment(endDate).add(1, 'days').format('YYYY-MM-DD');
            }
        }
    }

    // Check if we have valid dates
    if (!startDate || !endDate) {
        showToast('Неверный формат периода проекта', 'danger');
        return;
    }

    const formData = {
        name: nameInput.value.trim(),
        client_id: clientSelect.value,
        start_date: startDate,
        end_date: endDate,
        description: descriptionInput ? descriptionInput.value : null
    };

    try {
        await withLoading(async () => {
            const response = await api.patch(`/projects/${projectId}`, formData);
            if (typeof updateProjectData === 'function') {
                updateProjectData(response);
            }
            $('#editProjectModal').modal('hide');
            showToast('Проект обновлен', 'success');
        });
    } catch (error) {
        console.error('Error updating project:', error);
        showToast('Ошибка при обновлении проекта', 'danger');
    }
}
