/**
 * Project viewing functionality
 *
 * This module handles the display and interaction with individual project details:
 * - Loading project data
 * - Displaying equipment details
 * - Handling status updates
 * - Managing payments
 */

import { initializeProjectDetails } from './project/project-details.js';
import { initializeEquipmentManagement } from './project/equipment/index.js';
import { initializeProjectEquipmentFilters } from './project/equipment/filters.js';
import { getProjectIdFromUrl } from './project/project-utils.js';
import { showToast } from './utils/common.js';

/**
 * Initialize project view functionality
 */
function initializeProjectView() {
    const projectId = getProjectIdFromUrl();

    if (!projectId) {
        showToast('Идентификатор проекта не найден', 'danger');
        return;
    }

    initializeProjectDetails(projectId);
    initializeEquipmentManagement();
    initializeProjectEquipmentFilters();
    toggleEquipmentDatesColumn();
}

/**
 * Toggle equipment dates column visibility based on booking date differences
 */
function toggleEquipmentDatesColumn() {
    const hasAnyDifferentDates = window.projectData &&
        window.projectData.bookings &&
        window.projectData.bookings.some(booking => booking.has_different_dates);

    const columnsAndCells = document.querySelectorAll('.equipment-dates-column, .equipment-dates-cell');
    columnsAndCells.forEach(element => {
        element.style.display = hasAnyDifferentDates ? '' : 'none';
    });

    console.log(`Equipment dates column ${hasAnyDifferentDates ? 'shown' : 'hidden'}`);
}

document.addEventListener('DOMContentLoaded', () => {
    initializeProjectView();

    // Universal Cart embedded handlers
    document.getElementById('closeCartBtn')?.addEventListener('click', function() {
        if (window.universalCart && window.universalCart.ui) {
            if (typeof window.universalCart.ui.hide === 'function') {
                window.universalCart.ui.hide();
                console.log('Cart hidden by user request');
                showToast('Корзина скрыта. Добавляйте оборудование для повторного отображения.', 'info');
            } else {
                console.log('Close cart button clicked - hide method not available');
            }
        }
    });

    document.getElementById('clearCartBtn')?.addEventListener('click', function() {
        if (window.universalCart) {
            if (confirm('Вы уверены, что хотите очистить корзину?')) {
                window.universalCart.clear();
            }
        }
    });

    document.getElementById('addCartToProjectBtn')?.addEventListener('click', function() {
        window.addCartToProject();
    });

    if (document.getElementById('universalCartContainer')) {
        import('./universal-cart/index.js').then(module => {
            console.log('Universal Cart loaded for embedded mode');
        }).catch(error => {
            console.error('Failed to load Universal Cart:', error);
        });
    }
});

window.toggleEquipmentDatesColumn = toggleEquipmentDatesColumn;

/**
 * Update cart item quantity
 * @param {string} itemId - Item ID
 * @param {number} newQuantity - New quantity
 */
window.updateCartQuantity = function(itemId, newQuantity) {
    if (window.universalCart) {
        if (newQuantity <= 0) {
            window.universalCart.removeItem(itemId);
        } else {
            window.universalCart.updateQuantity(itemId, newQuantity);
        }
    }
};

/**
 * Remove item from cart
 * @param {string} itemId - Item ID
 */
window.removeFromCart = function(itemId) {
    if (window.universalCart) {
        window.universalCart.removeItem(itemId);
    }
};

/**
 * Clear entire cart
 */
window.clearCart = function() {
    if (window.universalCart) {
        window.universalCart.clear();
    }
};

/**
 * Add all cart items to project
 */
window.addCartToProject = async function() {
    if (window.universalCart) {
        const items = window.universalCart.getItems();
        if (items.length === 0) {
            showToast('Корзина пуста', 'warning');
            return;
        }

        showToast(`Добавление ${items.length} позиций в проект...`, 'info');

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

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

        // Update UI once after all operations
        if (successCount > 0) {
            showToast('Обновление списка оборудования...', 'info');
            await refreshProjectData();
            await refreshEquipmentSearchResults();
        }

        // Show final notification
        if (successCount > 0 && errorCount === 0) {
            showToast(`Успешно добавлено ${successCount} позиций в проект`, 'success');
            window.universalCart.clear();

            if (window.universalCart.ui && typeof window.universalCart.ui.hide === 'function') {
                window.universalCart.ui.hide();
                console.log('Cart hidden after successful addition of all items');
            }
        } else if (successCount > 0 && errorCount > 0) {
            showToast(`Добавлено ${successCount} из ${items.length} позиций. Ошибки: ${errorCount}`, 'warning');
        } else {
            showToast(`Не удалось добавить ни одной позиции. Ошибки: ${errors.slice(0, 3).join('; ')}`, 'danger');
        }

        if (errors.length > 0) {
            console.error('Cart addition errors:', errors);
        }
    }
};

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

/**
 * Add equipment to project
 * @param {Object} bookingData - Booking data
 */
async function addEquipmentToProject(bookingData) {
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

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (startDateObj >= endDateObj) {
            throw new Error('Дата окончания должна быть позже даты начала');
        }

        const { api } = await import('./utils/api.js');

        const equipmentInfo = await api.get(`/equipment/${bookingData.equipment_id}`);
        const isUniqueEquipment = equipmentInfo.serial_number !== null && equipmentInfo.serial_number !== '';

        let result;

        if (isUniqueEquipment) {
            console.log('Checking unique equipment availability:', equipmentInfo.name);

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

        } else {
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
        }

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

        result = {
            success: true,
            booking: bookingResponse,
            project: projectResponse,
            action: 'new_booking_created',
            message: 'Оборудование успешно добавлено в проект'
        };

        if (!bookingData._skipRefresh) {
            showToast('Обновление списка оборудования...', 'info');
            await refreshProjectData();
            await refreshEquipmentSearchResults();
        }

        return result;

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

        showToast(errorMessage, 'danger');

        return {
            success: false,
            error: errorMessage,
            originalError: error
        };
    }
}

/**
 * Refresh project data after changes
 */
async function refreshProjectData() {
    try {
        const projectId = getProjectIdFromUrl();
        if (!projectId) return;

        const { api } = await import('./utils/api.js');
        const updatedProject = await api.get(`/projects/${projectId}`);

        if (updatedProject) {
            window.projectData = updatedProject;

            try {
                const { renderEquipmentSection } = await import('./project/equipment/ui.js');
                renderEquipmentSection(updatedProject);
            } catch (importError) {
                console.error('renderEquipmentSection import error:', importError);
            }

            if (typeof window.toggleEquipmentDatesColumn === 'function') {
                window.toggleEquipmentDatesColumn();
            }

            document.dispatchEvent(new CustomEvent('projectDataUpdated', {
                detail: { projectData: updatedProject }
            }));
        }

    } catch (error) {
        console.error('Project data refresh error:', error);
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

        const { searchEquipmentInCatalog } = await import('./project/equipment/search.js');
        await searchEquipmentInCatalog();

        console.log('Equipment search results refreshed');

    } catch (error) {
        console.error('Equipment search refresh error:', error);
    }
}
