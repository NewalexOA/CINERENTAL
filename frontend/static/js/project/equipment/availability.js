/**
 * Equipment availability functionality
 */

import { api } from '../../utils/api.js';
import { formatDate, showToast, DATERANGEPICKER_LOCALE } from '../../utils/common.js';
import { refreshProjectData } from '../project-utils.js';
import { updateProjectData } from '../project-details.js';

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

        document.getElementById('addToProjectBtn').disabled = !availability.is_available;

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
        // Get current value
        const currentValue = $(this).val();
        let initialStartDate, initialEndDate;

        // Parse date if value contains a date range
        if (currentValue && currentValue.includes(' - ')) {
            const [startStr, endStr] = currentValue.split(' - ');
            initialStartDate = moment(startStr, 'DD.MM.YYYY');
            initialEndDate = moment(endStr, 'DD.MM.YYYY');
        }

        // Configure date picker with correct initial dates
        const options = {
            autoUpdateInput: true, // Change to true for automatic input field updates
            locale: DATERANGEPICKER_LOCALE
        };

        // Add initial dates if they exist
        if (initialStartDate && initialStartDate.isValid() &&
            initialEndDate && initialEndDate.isValid()) {
            options.startDate = initialStartDate;
            options.endDate = initialEndDate;
        }

        $(this).daterangepicker(options);

        $(this).on('apply.daterangepicker', async function(ev, picker) {
            const bookingId = $(this).data('booking-id');
            const startDate = picker.startDate.format('YYYY-MM-DDTHH:mm:ss');
            const endDate = picker.endDate.format('YYYY-MM-DDTHH:mm:ss');

            try {
                await updateBookingDates(bookingId, startDate, endDate);
                $(this).val(picker.startDate.format('DD.MM.YYYY') + ' - ' + picker.endDate.format('DD.MM.YYYY'));

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

    if (!projectStartDate || !projectEndDate) return;

    console.log('Project dates from hidden inputs:', { projectStartDate, projectEndDate });

    // Parse dates with explicit format DD.MM.YYYY
    const startMoment = moment(projectStartDate, 'DD.MM.YYYY');
    const endMoment = moment(projectEndDate, 'DD.MM.YYYY');

    console.log('Parsed dates:', {
        start: startMoment.format('YYYY-MM-DD'),
        end: endMoment.format('YYYY-MM-DD'),
        valid: startMoment.isValid() && endMoment.isValid()
    });

    $(newBookingPeriodInput).daterangepicker({
        startDate: startMoment,
        endDate: endMoment,
        minDate: moment().subtract(1, 'days'),
        locale: DATERANGEPICKER_LOCALE
    });

    $(newBookingPeriodInput).on('apply.daterangepicker', function(ev, picker) {
        const selectedEquipmentId = document.querySelector('#searchResults .equipment-item.selected')?.dataset?.equipmentId;
        if (selectedEquipmentId) {
            checkEquipmentAvailability(selectedEquipmentId, picker.startDate.format('YYYY-MM-DD'), picker.endDate.format('YYYY-MM-DD'));
        }
    });
}
