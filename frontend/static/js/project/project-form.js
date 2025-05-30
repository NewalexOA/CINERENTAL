/**
 * Project form management functionality
 */

import { api } from '../utils/api.js';
import { showToast, DATERANGEPICKER_LOCALE_WITH_TIME } from '../utils/common.js';
import { withLoading } from './project-utils.js';
import { updateProjectData } from './project-details.js';

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
        // Get raw dates from data attributes
        const rawStartDate = dateInput.dataset.startDate;
        const rawEndDate = dateInput.dataset.endDate;

        let initialStartDate, initialEndDate;

        // Parse dates directly from ISO strings if available
        if (rawStartDate && rawEndDate) {
            initialStartDate = moment(rawStartDate);
            initialEndDate = moment(rawEndDate);

            console.log('Initializing edit project daterangepicker with dates from data attributes:', {
                start: initialStartDate.format('DD.MM.YYYY HH:mm'),
                end: initialEndDate.format('DD.MM.YYYY HH:mm')
            });
        } else {
            // Fallback: parse from current value
            const initialValue = $(dateInput).val();
            if (initialValue && initialValue.includes(' - ')) {
                const dateParts = initialValue.split(' - ');

                // Try to parse with time first (DD.MM.YYYY HH:mm)
                initialStartDate = moment(dateParts[0], 'DD.MM.YYYY HH:mm', true);
                initialEndDate = moment(dateParts[1], 'DD.MM.YYYY HH:mm', true);

                // If parsing with time fails, try without time
                if (!initialStartDate.isValid()) {
                    initialStartDate = moment(dateParts[0], 'DD.MM.YYYY', true);
                }
                if (!initialEndDate.isValid()) {
                    initialEndDate = moment(dateParts[1], 'DD.MM.YYYY', true);
                }

                console.log('Parsed dates from input value:', {
                    start: initialStartDate.format('DD.MM.YYYY HH:mm'),
                    end: initialEndDate.format('DD.MM.YYYY HH:mm'),
                    valid: initialStartDate.isValid() && initialEndDate.isValid()
                });
            }
        }

        const options = {
            timePicker: true,
            timePicker24Hour: true,
            timePickerIncrement: 1,
            showDropdowns: true,
            autoUpdateInput: true,
            locale: DATERANGEPICKER_LOCALE_WITH_TIME,
            minSpan: {
                days: 1
            }
        };

        // Add initial dates if they exist and are valid
        if (initialStartDate && initialStartDate.isValid() &&
            initialEndDate && initialEndDate.isValid()) {
            options.startDate = initialStartDate;
            options.endDate = initialEndDate;
        } else {
            // Use default times if we have no existing data
            options.startDate = moment().hour(0).minute(0);
            options.endDate = moment().hour(23).minute(59);
        }

        $(dateInput).daterangepicker(options);

        // Add custom time validation for specific minute values: 00, 15, 30, 45, 59
        $(dateInput).on('show.daterangepicker', function(ev, picker) {
            let observer = null;

            const setupCustomMinutes = (container) => {
                const $minuteInputs = container.find('.minuteselect');

                $minuteInputs.each(function() {
                    const $select = $(this);
                    const currentValue = $select.val();

                    // Check if we've already customized this select
                    if ($select.data('customized')) return;

                    // Clear all options and add only allowed ones
                    $select.empty();
                    const allowedMinutes = ['00', '15', '30', '45', '59'];

                    allowedMinutes.forEach(minute => {
                        const option = $('<option></option>').attr('value', minute).text(minute);
                        $select.append(option);
                    });

                    // Set current value if it's allowed, otherwise default to 00
                    if (allowedMinutes.includes(currentValue)) {
                        $select.val(currentValue);
                    } else {
                        // Find closest allowed value
                        const currentMinute = parseInt(currentValue);
                        let closestMinute = '00';

                        if (currentMinute >= 52) {
                            closestMinute = '59';
                        } else if (currentMinute >= 37) {
                            closestMinute = '45';
                        } else if (currentMinute >= 22) {
                            closestMinute = '30';
                        } else if (currentMinute >= 7) {
                            closestMinute = '15';
                        }

                        $select.val(closestMinute);
                    }

                    // Mark as customized
                    $select.data('customized', true);
                });
            };

            // Hook into the time picker inputs after they're rendered
            setTimeout(() => {
                const container = picker.container;
                setupCustomMinutes(container);

                // Set up mutation observer to watch for DOM changes
                if (observer) observer.disconnect();

                observer = new MutationObserver((mutations) => {
                    let shouldUpdate = false;
                    mutations.forEach((mutation) => {
                        // Check if minute selects were added or modified
                        if (mutation.type === 'childList') {
                            mutation.addedNodes.forEach((node) => {
                                if (node.nodeType === 1) { // Element node
                                    if ($(node).hasClass('minuteselect') || $(node).find('.minuteselect').length > 0) {
                                        shouldUpdate = true;
                                    }
                                }
                            });
                        }
                    });

                    if (shouldUpdate) {
                        setTimeout(() => setupCustomMinutes(container), 10);
                    }
                });

                // Start observing the container for changes
                observer.observe(container[0], {
                    childList: true,
                    subtree: true
                });
            }, 100);

            $(dateInput).on('hide.daterangepicker', function() {
                if (observer) {
                    observer.disconnect();
                    observer = null;
                }
            });
        });

        // Handle apply event when dates are selected
        $(dateInput).on('apply.daterangepicker', function(ev, picker) {
            $(this).val(picker.startDate.format('DD.MM.YYYY HH:mm') + ' - ' + picker.endDate.format('DD.MM.YYYY HH:mm'));
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
        // Format dates with local timezone offset
        startDate = picker.startDate.format('YYYY-MM-DDTHH:mm:ss') + getTimezoneOffset();
        endDate = picker.endDate.format('YYYY-MM-DDTHH:mm:ss') + getTimezoneOffset();
    } else {
        // Fallback to parsing input value with time support
        const dateParts = datesInput.value.split(' - ');
        if (dateParts.length === 2) {
            // Try to parse with time first
            let startMoment = moment(dateParts[0], 'DD.MM.YYYY HH:mm', true);
            let endMoment = moment(dateParts[1], 'DD.MM.YYYY HH:mm', true);

            // If parsing with time fails, try without time and add default hours
            if (!startMoment.isValid()) {
                startMoment = moment(dateParts[0], 'DD.MM.YYYY', true).hour(0).minute(0);
            }
            if (!endMoment.isValid()) {
                endMoment = moment(dateParts[1], 'DD.MM.YYYY', true).hour(23).minute(59);
            }

            startDate = startMoment.format('YYYY-MM-DDTHH:mm:ss') + getTimezoneOffset();
            endDate = endMoment.format('YYYY-MM-DDTHH:mm:ss') + getTimezoneOffset();
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
            // Get old project dates for comparison from hidden HTML fields
            const oldStartDate = document.getElementById('project-start-date')?.value;
            const oldEndDate = document.getElementById('project-end-date')?.value;

            if (!oldStartDate || !oldEndDate) {
                console.warn('Could not get old project dates for comparison');
            }

            await api.patch(`/projects/${projectId}`, formData);

            // Check if project dates changed and update equipment bookings accordingly
            const newStartDate = startDate;
            const newEndDate = endDate;

            if (oldStartDate && oldEndDate && (oldStartDate !== newStartDate || oldEndDate !== newEndDate)) {
                // First get current bookings to update them
                const currentProjectData = await api.get(`/projects/${projectId}`);

                await updateEquipmentBookingDates(
                    currentProjectData.bookings,
                    oldStartDate,
                    oldEndDate,
                    newStartDate,
                    newEndDate
                );
            }

            // Load fresh project data with updated bookings after all changes
            const freshProjectData = await api.get(`/projects/${projectId}`);
            updateProjectData(freshProjectData);

            $('#editProjectModal').modal('hide');
            showToast('Проект обновлен', 'success');
        });
    } catch (error) {
        console.error('Error updating project:', error);
        showToast('Ошибка при обновлении проекта', 'danger');
    }
}

/**
 * Get timezone offset in ISO format (+03:00)
 * @returns {string} - Timezone offset
 */
function getTimezoneOffset() {
    const offset = new Date().getTimezoneOffset();
    const sign = offset <= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60).toString().padStart(2, '0');
    const minutes = (absOffset % 60).toString().padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
}

/**
 * Update equipment booking dates when project dates change
 * @param {Array} bookings - Array of equipment bookings
 * @param {string} oldProjectStart - Old project start date (ISO format)
 * @param {string} oldProjectEnd - Old project end date (ISO format)
 * @param {string} newProjectStart - New project start date (ISO format with timezone)
 * @param {string} newProjectEnd - New project end date (ISO format with timezone)
 */
async function updateEquipmentBookingDates(bookings, oldProjectStart, oldProjectEnd, newProjectStart, newProjectEnd) {
    const updatedBookings = [];
    const skippedBookings = [];

    console.log('Updating equipment booking dates:', {
        oldProjectStart,
        oldProjectEnd,
        newProjectStart,
        newProjectEnd,
        bookingsCount: bookings.length
    });

    // Convert old project dates to moment for comparison (normalize timezone)
    const oldStartMoment = moment(oldProjectStart);
    const oldEndMoment = moment(oldProjectEnd);

    console.log('Normalized old project dates:', {
        oldStart: oldStartMoment.toISOString(),
        oldEnd: oldEndMoment.toISOString()
    });

    for (const booking of bookings) {
        const bookingStart = booking.start_date;
        const bookingEnd = booking.end_date;

        // Convert booking dates to moment for comparison (normalize timezone)
        const bookingStartMoment = moment(bookingStart);
        const bookingEndMoment = moment(bookingEnd);

        // Check if booking dates match old project dates (with some tolerance for timezone differences)
        const startMatches = oldStartMoment.isSame(bookingStartMoment, 'minute');
        const endMatches = oldEndMoment.isSame(bookingEndMoment, 'minute');
        const datesMatch = startMatches && endMatches;

        console.log(`Booking ${booking.id} (${booking.equipment_name}):`, {
            bookingStart,
            bookingEnd,
            normalizedBookingStart: bookingStartMoment.toISOString(),
            normalizedBookingEnd: bookingEndMoment.toISOString(),
            startMatches,
            endMatches,
            datesMatch
        });

        if (datesMatch) {
            // Update booking dates to match new project dates
            try {
                await api.patch(`/bookings/${booking.id}`, {
                    start_date: newProjectStart,
                    end_date: newProjectEnd
                });

                updatedBookings.push(booking.equipment_name);
                console.log(`Updated booking ${booking.id} dates`);
            } catch (error) {
                console.error(`Error updating booking ${booking.id}:`, error);
                skippedBookings.push({
                    name: booking.equipment_name,
                    reason: 'Ошибка обновления'
                });
            }
        } else {
            // Skip this booking and add to warning list
            skippedBookings.push({
                name: booking.equipment_name,
                reason: 'Индивидуальные даты'
            });
        }
    }

    // Show results to user
    showBookingUpdateResults(updatedBookings, skippedBookings);
}

/**
 * Show results of booking dates update
 * @param {Array} updatedBookings - List of updated equipment names
 * @param {Array} skippedBookings - List of skipped bookings with reasons
 */
function showBookingUpdateResults(updatedBookings, skippedBookings) {
    let message = '';

    if (updatedBookings.length > 0) {
        message += `✅ Обновлены даты для ${updatedBookings.length} позиций:\n`;
        message += updatedBookings.map(name => `• ${name}`).join('\n');
    }

    if (skippedBookings.length > 0) {
        if (message) message += '\n\n';
        message += `⚠️ Требуют проверки ${skippedBookings.length} позиций:\n`;
        message += skippedBookings.map(item => `• ${item.name} (${item.reason})`).join('\n');
        message += '\n\nПроверьте даты этих позиций вручную.';
    }

    if (message) {
        // Show detailed message in console for debugging
        console.log('Booking update results:', message);

        // Show user-friendly toast message
        if (updatedBookings.length > 0 && skippedBookings.length === 0) {
            showToast(`Обновлены даты для ${updatedBookings.length} позиций оборудования`, 'success');
        } else if (updatedBookings.length > 0 && skippedBookings.length > 0) {
            showToast(
                `Обновлены даты для ${updatedBookings.length} позиций. ${skippedBookings.length} позиций требуют проверки.`,
                'warning'
            );
        } else if (skippedBookings.length > 0) {
            showToast(
                `${skippedBookings.length} позиций имеют индивидуальные даты и требуют проверки`,
                'info'
            );
        }
    }
}
