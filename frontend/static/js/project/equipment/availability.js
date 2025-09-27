/**
 * Equipment availability functionality
 */

import { api } from '../../utils/api.js';
import { formatDate, showToast, DATERANGEPICKER_LOCALE_WITH_TIME } from '../../utils/common.js';
import { refreshProjectData } from '../project-utils.js';
import { updateProjectData } from '../project-details.js';

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
 * Add custom minute validation to daterangepicker for specific values: 00, 15, 30, 45, 59
 * @param {jQuery} $picker - The daterangepicker input element
 */
function addCustomMinuteValidation($picker) {
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

    $picker.on('show.daterangepicker', function(ev, picker) {
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
    });

    $picker.on('hide.daterangepicker', function() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    });
}

/**
 * Check equipment availability
 * @param {string} equipmentId - Equipment ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 */
export async function checkEquipmentAvailability(equipmentId, startDate, endDate) {
    try {
        const availability = await api.get(`/equipment/${equipmentId}/availability`, {
            start_date: startDate,
            end_date: endDate
        });

        const availabilityElement = document.getElementById('selectedEquipmentAvailability');
        availabilityElement.textContent = availability.is_available ? 'Доступно' : 'Недоступно';
        availabilityElement.className = availability.is_available ? 'text-success' : 'text-danger';

        const selectedItem = document.querySelector('.equipment-item.selected');
        if (selectedItem) {
            selectedItem.dataset.equipmentAvailable = availability.is_available.toString();
            const badge = selectedItem.querySelector('.badge');
            badge.className = `badge bg-${availability.is_available ? 'success' : 'danger'}`;
            badge.textContent = availability.is_available ? 'Доступно' : 'Недоступно';
        }

        const conflictsContainer = document.getElementById('conflictsContainer');
        const conflictsList = document.getElementById('conflictsList');

        if (availability.conflicts && availability.conflicts.length > 0) {
            conflictsList.innerHTML = '';

            availability.conflicts.forEach(conflict => {
                const conflictItem = document.createElement('div');
                conflictItem.className = 'list-group-item list-group-item-danger small';

                let conflictText = `${formatDate(conflict.start_date)} - ${formatDate(conflict.end_date)}`;
                if (conflict.project_name) {
                    conflictText += ` (Проект: ${conflict.project_name})`;
                } else if (conflict.client_name) {
                    conflictText += ` (Клиент: ${conflict.client_name})`;
                }

                conflictItem.textContent = conflictText;
                conflictsList.appendChild(conflictItem);
            });

            conflictsContainer.style.display = 'block';
        } else {
            conflictsContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking availability:', error);
        showToast('Ошибка проверки доступности', 'warning');
    }
}

/**
 * Update booking dates
 * @param {string} bookingId - Booking ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 */
export async function updateBookingDates(bookingId, startDate, endDate) {
    const response = await api.patch(`/bookings/${bookingId}`, {
        start_date: startDate,
        end_date: endDate
    });

    return response;
}

/**
 * Initialize booking period pickers
 */
export function initializeBookingPeriodPickers() {
    $('.booking-period-input').each(function() {
        // Get raw dates from data attributes
        const rawStartDate = $(this).data('start-date');
        const rawEndDate = $(this).data('end-date');

        let initialStartDate, initialEndDate;

        // Parse dates directly from ISO strings if available
        if (rawStartDate && rawEndDate) {
            initialStartDate = moment(rawStartDate);
            initialEndDate = moment(rawEndDate);

            // Log only if dates are invalid for debugging
            if (!initialStartDate.isValid() || !initialEndDate.isValid()) {
                console.warn('Invalid dates in booking picker:', { rawStartDate, rawEndDate });
            }
        } else {
            // Fallback: parse from current value
            const currentValue = $(this).val();
            if (currentValue && currentValue.includes(' - ')) {
                const [startStr, endStr] = currentValue.split(' - ');

                // Parse with the exact format DD.MM.YYYY HH:mm
                initialStartDate = moment(startStr, 'DD.MM.YYYY HH:mm', true);
                initialEndDate = moment(endStr, 'DD.MM.YYYY HH:mm', true);

                // If parsing with time fails, try without time
                if (!initialStartDate.isValid()) {
                    initialStartDate = moment(startStr, 'DD.MM.YYYY', true);
                }
                if (!initialEndDate.isValid()) {
                    initialEndDate = moment(endStr, 'DD.MM.YYYY', true);
                }
            }
        }

        // Configure date picker with time support
        const options = {
            timePicker: true,
            timePicker24Hour: true,
            timePickerIncrement: 1,
            showDropdowns: true,
            autoUpdateInput: true,
            locale: DATERANGEPICKER_LOCALE_WITH_TIME
        };

        // Add initial dates if they exist and are valid
        if (initialStartDate && initialStartDate.isValid() &&
            initialEndDate && initialEndDate.isValid()) {
            options.startDate = initialStartDate;
            options.endDate = initialEndDate;
        } else {
            // Only use default times if we have no existing data
            options.startDate = moment().hour(0).minute(0);
            options.endDate = moment().hour(23).minute(59);
        }

        $(this).daterangepicker(options);

        // Add custom minute validation
        addCustomMinuteValidation($(this));

        // Set the correct display value after initialization
        const picker = $(this).data('daterangepicker');
        if (picker && picker.startDate && picker.endDate) {
            const displayValue = picker.startDate.format('DD.MM.YYYY HH:mm') + ' - ' + picker.endDate.format('DD.MM.YYYY HH:mm');
            $(this).val(displayValue);
        }

        $(this).on('apply.daterangepicker', async function(ev, picker) {
            const bookingId = $(this).data('booking-id');

            // Format dates with local timezone offset
            const startDate = picker.startDate.format('YYYY-MM-DDTHH:mm:ss') + getTimezoneOffset();
            const endDate = picker.endDate.format('YYYY-MM-DDTHH:mm:ss') + getTimezoneOffset();

            console.log('Updating booking dates:', { bookingId, startDate, endDate });

            try {
                await updateBookingDates(bookingId, startDate, endDate);
                $(this).val(picker.startDate.format('DD.MM.YYYY HH:mm') + ' - ' + picker.endDate.format('DD.MM.YYYY HH:mm'));

                // Refresh project data to update UI
                await refreshProjectData(updateProjectData);

                showToast('Период бронирования обновлен', 'success');
            } catch (error) {
                console.error('Error updating booking dates:', error);
                showToast('Ошибка при обновлении периода бронирования', 'danger');
            }
        });

        $(this).on('cancel.daterangepicker', function(ev, picker) {
            $(this).val($(this).attr('value')); // Restore original value
        });
    });
}

/**
 * Initialize new booking period picker
 */
export function initializeNewBookingPeriodPicker() {
    const newBookingPeriodInput = document.getElementById('newBookingPeriod');
    if (!newBookingPeriodInput) return;

    const projectStartDate = document.getElementById('project-start-date')?.value;
    const projectEndDate = document.getElementById('project-end-date')?.value;

    if (!projectStartDate || !projectEndDate) {
        console.warn('Project dates not found for new booking picker');
        return;
    }

    // Parse dates from ISO format
    const startMoment = moment(projectStartDate).hour(0).minute(0);
    const endMoment = moment(projectEndDate).hour(23).minute(59);

    if (!startMoment.isValid() || !endMoment.isValid()) {
        console.error('Invalid project dates:', { projectStartDate, projectEndDate });
        return;
    }

    $(newBookingPeriodInput).daterangepicker({
        startDate: startMoment,
        endDate: endMoment,
        minDate: moment().subtract(1, 'days'),
        timePicker: true,
        timePicker24Hour: true,
        timePickerIncrement: 1,
        showDropdowns: true,
        locale: DATERANGEPICKER_LOCALE_WITH_TIME
    });

    // Add custom minute validation
    addCustomMinuteValidation($(newBookingPeriodInput));

    $(newBookingPeriodInput).on('apply.daterangepicker', function(ev, picker) {
        $(this).val(picker.startDate.format('DD.MM.YYYY HH:mm') + ' - ' + picker.endDate.format('DD.MM.YYYY HH:mm'));

        const selectedEquipmentId = document.querySelector('#searchResults .equipment-item.selected')?.dataset?.equipmentId;
        if (selectedEquipmentId) {
            checkEquipmentAvailability(selectedEquipmentId, picker.startDate.format('YYYY-MM-DD'), picker.endDate.format('YYYY-MM-DD'));
        }
    });
}
