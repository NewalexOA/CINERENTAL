/**
 * Cart operations - equipment addition logic
 */

import { api } from '../../utils/api.js';
import { showToast } from '../../utils/common.js';
import { getProjectIdFromUrl, refreshProjectData } from '../project-utils.js';

/**
 * Add equipment to project
 * @param {Object} bookingData - Booking data
 */
export async function addEquipmentToProject(bookingData) {
    try {
        console.log('Adding equipment to project:', bookingData);

        if (!bookingData.equipment_id) {
            throw new Error('ID оборудования обязательно для заполнения');
        }

        const projectId = getProjectIdFromUrl();
        if (!projectId) {
            throw new Error('ID проекта не найден');
        }

        const clientId = window.projectData?.client_id;
        if (!clientId) {
            throw new Error('ID клиента не найден в данных проекта');
        }

        const startDate = bookingData.start_date || getCurrentProjectStartDate();
        const endDate = bookingData.end_date || getCurrentProjectEndDate();
        const quantityToAdd = parseInt(bookingData.quantity) || 1;

        // Validate dates
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (startDateObj >= endDateObj) {
            throw new Error('Дата окончания должна быть позже даты начала');
        }

        // Get equipment info to check if it's unique
        const equipmentInfo = await api.get(`/equipment/${bookingData.equipment_id}`);
        const isUniqueEquipment = equipmentInfo.serial_number !== null && equipmentInfo.serial_number !== '';

        if (isUniqueEquipment) {
            return await handleUniqueEquipment(bookingData, equipmentInfo, startDate, endDate, quantityToAdd, projectId, clientId);
        } else {
            return await handleNonUniqueEquipment(bookingData, equipmentInfo, startDate, endDate, quantityToAdd, projectId, clientId);
        }

    } catch (error) {
        console.error('Error adding equipment to project:', error);

        let errorMessage = 'Произошла ошибка при добавлении оборудования';

        if (error.message) {
            errorMessage = error.message;
        } else if (error.response?.data?.detail) {
            if (Array.isArray(error.response.data.detail)) {
                errorMessage = error.response.data.detail
                    .map(err => `${err.loc ? err.loc.join(' -> ') : 'поле'}: ${err.msg}`)
                    .join('; ');
            } else {
                errorMessage = error.response.data.detail;
            }
        }

        if (!bookingData._skipRefresh) {
            showToast(errorMessage, 'danger');
        }

        return {
            success: false,
            error: errorMessage,
            originalError: error
        };
    }
}

/**
 * Handle unique equipment (with serial number)
 */
async function handleUniqueEquipment(bookingData, equipmentInfo, startDate, endDate, quantityToAdd, projectId, clientId) {
    console.log('Checking unique equipment availability:', equipmentInfo.name);

    // Check availability for unique equipment
    const availabilityResponse = await api.get(
        `/equipment/${bookingData.equipment_id}/availability?start_date=${startDate}&end_date=${endDate}`
    );

    if (!availabilityResponse.is_available) {
        const conflictInfo = availabilityResponse.conflicts
            .map(conflict => `${conflict.start_date} - ${conflict.end_date} (Проект: ${conflict.project_name || 'N/A'})`)
            .join('; ');

        const errorMessage = `Оборудование "${equipmentInfo.name}" недоступно на указанные даты. Конфликты: ${conflictInfo}`;
        console.warn(errorMessage);

        return {
            success: false,
            error: errorMessage,
            conflicts: availabilityResponse.conflicts
        };
    }

    console.log('Creating new booking for unique equipment:', equipmentInfo.name);
    return await createNewBooking(bookingData, startDate, endDate, quantityToAdd, projectId, clientId);
}

/**
 * Handle non-unique equipment (without serial number)
 */
async function handleNonUniqueEquipment(bookingData, equipmentInfo, startDate, endDate, quantityToAdd, projectId, clientId) {
    // Check for existing booking with same equipment and dates
    const existingBookings = window.projectData?.bookings || [];
    const existingBooking = existingBookings.find(booking => {
        const sameEquipment = booking.equipment_id === parseInt(bookingData.equipment_id);
        const sameStartDate = booking.start_date === startDate;
        const sameEndDate = booking.end_date === endDate;

        return sameEquipment && sameStartDate && sameEndDate;
    });

    if (existingBooking) {
        console.log('Increasing quantity for non-unique equipment:', existingBooking.equipment_name);

        const newQuantity = existingBooking.quantity + quantityToAdd;

        const updatedBooking = await api.patch(`/bookings/${existingBooking.id}`, {
            quantity: newQuantity
        });

        const equipmentName = existingBooking.equipment_name || `Оборудование ${bookingData.equipment_id}`;
        console.log(`Quantity for "${equipmentName}" increased to ${newQuantity}`);

        return {
            success: true,
            booking: updatedBooking,
            action: 'quantity_increased',
            message: `Количество оборудования увеличено до ${newQuantity}`
        };
    }

    console.log('Creating new booking for non-unique equipment:', equipmentInfo.name);
    return await createNewBooking(bookingData, startDate, endDate, quantityToAdd, projectId, clientId);
}

/**
 * Create new booking
 */
async function createNewBooking(bookingData, startDate, endDate, quantityToAdd, projectId, clientId) {
    console.log('Creating new booking for equipment:', bookingData.equipment_id);

    const bookingPayload = {
        equipment_id: parseInt(bookingData.equipment_id),
        client_id: parseInt(clientId),
        start_date: startDate,
        end_date: endDate,
        quantity: quantityToAdd,
        total_amount: parseFloat(bookingData.total_amount) || 0.0
    };

    const bookingResponse = await api.post('/bookings/', bookingPayload);

    if (!bookingResponse || !bookingResponse.id) {
        throw new Error('Некорректный ответ при создании бронирования');
    }

    console.log('Adding booking to project:', bookingResponse.id);
    const projectResponse = await api.post(`/projects/${projectId}/bookings/${bookingResponse.id}`);

    if (!projectResponse) {
        throw new Error('Ошибка при добавлении бронирования в проект');
    }

    const equipmentName = bookingResponse.equipment_name || `Оборудование ${bookingData.equipment_id}`;
    console.log(`Equipment "${equipmentName}" successfully added to project`);

    return {
        success: true,
        booking: bookingResponse,
        project: projectResponse,
        action: 'new_booking_created',
        message: 'Оборудование успешно добавлено в проект'
    };
}

/**
 * Add multiple equipment items to project (batch operation)
 * @param {Array} items - Array of cart items
 */
export async function addEquipmentBatchToProject(items) {
    console.log('Starting batch equipment addition:', items.length, 'items');

    showToast(`Добавление ${items.length} позиций в проект...`, 'info');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each item
    for (const item of items) {
        try {
            const bookingData = {
                equipment_id: item.id,
                quantity: item.quantity || 1,
                start_date: getCurrentProjectStartDate(),
                end_date: getCurrentProjectEndDate(),
                total_amount: item.total_amount || 0.0,
                _skipRefresh: true
            };

            const result = await addEquipmentToProject(bookingData);

            if (result.success) {
                successCount++;
            } else {
                errorCount++;
                errors.push(`${item.name || item.id}: ${result.error}`);
            }
        } catch (error) {
            errorCount++;
            errors.push(`${item.name || item.id}: ${error.message}`);
            console.error(`Error adding item ${item.id}:`, error);
        }
    }

    // Refresh project data and search results once after all operations
    if (successCount > 0) {
        showToast('Обновление списка оборудования...', 'info');
        await refreshProjectDataAndSearch();
    }

    return {
        success: successCount > 0,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : null
    };
}

/**
 * Refresh project data and equipment search results
 */
async function refreshProjectDataAndSearch() {
    try {
        // Use existing refreshProjectData function
        const success = await refreshProjectData((updatedProject) => {
            window.projectData = updatedProject;

            // Update equipment section UI
            import('../equipment/ui.js').then(({ renderEquipmentSection }) => {
                renderEquipmentSection(updatedProject);
            }).catch(importError => {
                console.error('renderEquipmentSection import error:', importError);
            });

            // Update dates column visibility
            if (typeof window.toggleEquipmentDatesColumn === 'function') {
                window.toggleEquipmentDatesColumn();
            }

            // Dispatch update event
            document.dispatchEvent(new CustomEvent('projectDataUpdated', {
                detail: { projectData: updatedProject }
            }));
        });

        if (success) {
            // Refresh equipment search results
            await refreshEquipmentSearchResults();
        }
    } catch (error) {
        console.error('Error refreshing project data and search:', error);
    }
}

/**
 * Refresh equipment search results to reflect availability changes
 */
async function refreshEquipmentSearchResults() {
    try {
        console.log('Refreshing equipment search results...');

        const searchInput = document.getElementById('barcodeInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const searchResults = document.getElementById('searchResults');

        if (!searchInput || !searchResults || searchResults.children.length === 0) {
            console.log('Skipping search refresh: no active search to update');
            return;
        }

        const currentQuery = searchInput.value.trim();
        const currentCategory = categoryFilter?.value || '';

        console.log('Re-executing search with params:', { query: currentQuery, category: currentCategory });

        const { searchEquipmentInCatalog } = await import('../equipment/search.js');
        await searchEquipmentInCatalog();

        console.log('Equipment search results refreshed');

    } catch (error) {
        console.error('Equipment search refresh error:', error);
    }
}

/**
 * Get current project start date
 */
function getCurrentProjectStartDate() {
    return window.projectData?.start_date || new Date().toISOString();
}

/**
 * Get current project end date
 */
function getCurrentProjectEndDate() {
    return window.projectData?.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}
