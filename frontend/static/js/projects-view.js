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
    // Get project ID from URL
    const projectId = getProjectIdFromUrl();

    if (!projectId) {
        showToast('Идентификатор проекта не найден', 'danger');
        return;
    }

    // Initialize project details
    initializeProjectDetails(projectId);

    // Initialize equipment management
    initializeEquipmentManagement();

    // Initialize equipment filters
    initializeProjectEquipmentFilters();

    // Initialize equipment dates column visibility
    toggleEquipmentDatesColumn();
}

/**
 * Show or hide equipment dates column based on whether any equipment has different dates
 */
function toggleEquipmentDatesColumn() {
    // Check if any booking has different dates from project dates
    const hasAnyDifferentDates = window.projectData &&
        window.projectData.bookings &&
        window.projectData.bookings.some(booking => booking.has_different_dates);

    // Show/hide column and cells
    const columnsAndCells = document.querySelectorAll('.equipment-dates-column, .equipment-dates-cell');
    columnsAndCells.forEach(element => {
        element.style.display = hasAnyDifferentDates ? '' : 'none';
    });

    console.log(`Equipment dates column ${hasAnyDifferentDates ? 'shown' : 'hidden'}`);
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    initializeProjectView();

    // =========================
    // UNIVERSAL CART EMBEDDED HANDLERS
    // =========================

    // Close cart button
    document.getElementById('closeCartBtn')?.addEventListener('click', function() {
        if (window.universalCart && window.universalCart.ui) {
            // In embedded mode, just minimize or keep visible
            console.log('Close cart button clicked - not hiding embedded cart');
            // For embedded mode, we could implement collapse/minimize functionality
            // For now, keep it visible as it's part of the page flow
        }
    });

    // Clear cart button
    document.getElementById('clearCartBtn')?.addEventListener('click', function() {
        if (window.universalCart) {
            if (confirm('Вы уверены, что хотите очистить корзину?')) {
                window.universalCart.clear();
            }
        }
    });

    // Add cart to project button
    document.getElementById('addCartToProjectBtn')?.addEventListener('click', function() {
        window.addCartToProject();
    });

    // Initialize Universal Cart if container exists
    if (document.getElementById('universalCartContainer')) {
        // Import and initialize Universal Cart
        import('./universal-cart/index.js').then(module => {
            // Universal Cart will auto-initialize and detect embedded mode
            console.log('Universal Cart loaded for embedded mode');
        }).catch(error => {
            console.error('Failed to load Universal Cart:', error);
        });
    }
});

// Make function available globally for dynamic updates
window.toggleEquipmentDatesColumn = toggleEquipmentDatesColumn;

/**
 * Global functions for Universal Cart integration
 */

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

        // Показываем индикатор начала операции
        showToast(`Добавление ${items.length} позиций в проект...`, 'info');

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // Обрабатываем каждую позицию и добавляем в проект
        for (const item of items) {
            try {
                // Создаем данные бронирования для позиции
                const bookingData = {
                    equipment_id: item.id,
                    quantity: item.quantity || 1,
                    start_date: getCurrentProjectStartDate(),
                    end_date: getCurrentProjectEndDate(),
                    total_amount: item.total_amount || 0.0,
                    _skipRefresh: true // Пропускаем индивидуальное обновление UI
                };

                // Добавляем в проект с использованием обновленной функции
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
                console.error(`Ошибка при добавлении позиции ${item.id}:`, error);
            }
        }

        // Обновляем UI один раз после всех операций
        if (successCount > 0) {
            showToast('Обновление списка оборудования...', 'info');
            await refreshProjectData();
        }

        // Показываем итоговое уведомление
        if (successCount > 0 && errorCount === 0) {
            // Все позиции добавлены успешно
            showToast(`Успешно добавлено ${successCount} позиций в проект`, 'success');
            window.universalCart.clear();
        } else if (successCount > 0 && errorCount > 0) {
            // Частичный успех
            showToast(`Добавлено ${successCount} из ${items.length} позиций. Ошибки: ${errorCount}`, 'warning');
            // Удаляем только успешно добавленные позиции из корзины
            // (это требует дополнительной логики, пока оставляем корзину как есть)
        } else {
            // Все позиции с ошибками
            showToast(`Не удалось добавить ни одной позиции. Ошибки: ${errors.slice(0, 3).join('; ')}`, 'danger');
        }

        // Логируем детальную информацию об ошибках
        if (errors.length > 0) {
            console.error('Ошибки при добавлении позиций из корзины:', errors);
        }
    }
};

/**
 * Get current project start date
 */
function getCurrentProjectStartDate() {
    // Get from project data or default
    return window.projectData?.start_date || new Date().toISOString();
}

/**
 * Get current project end date
 */
function getCurrentProjectEndDate() {
    // Get from project data or default
    return window.projectData?.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Add equipment to project (placeholder function)
 * @param {Object} bookingData - Booking data
 */
async function addEquipmentToProject(bookingData) {
    try {
        console.log('Добавление оборудования в проект:', bookingData);
        if (!bookingData.equipment_id) {
            throw new Error('ID оборудования обязательно для заполнения');
        }

        const projectId = getProjectIdFromUrl();
        if (!projectId) {
            throw new Error('ID проекта не найден');
        }

        // Получаем client_id из данных проекта
        const clientId = window.projectData?.client_id;
        if (!clientId) {
            throw new Error('ID клиента не найден в данных проекта');
        }

        // Подготавливаем даты для сравнения
        const startDate = bookingData.start_date || getCurrentProjectStartDate();
        const endDate = bookingData.end_date || getCurrentProjectEndDate();
        const quantityToAdd = parseInt(bookingData.quantity) || 1;

        // Валидация дат
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        if (startDateObj >= endDateObj) {
            throw new Error('Дата окончания должна быть позже даты начала');
        }

        // Динамически импортируем API клиент (готовый инстанс)
        const { api } = await import('./utils/api.js');

        // Проверяем существующие бронирования в проекте для этого оборудования
        const existingBookings = window.projectData?.bookings || [];
        const existingBooking = existingBookings.find(booking => {
            // Проверяем ID оборудования и даты
            const sameEquipment = booking.equipment_id === parseInt(bookingData.equipment_id);
            const sameStartDate = booking.start_date === startDate;
            const sameEndDate = booking.end_date === endDate;

            return sameEquipment && sameStartDate && sameEndDate;
        });

        let result;

                if (existingBooking) {
            // Оборудование уже есть в проекте с теми же датами - увеличиваем количество
            console.log('Увеличение количества существующего оборудования:', existingBooking.equipment_name);

            const newQuantity = existingBooking.quantity + quantityToAdd;

            // Обновляем бронирование через API
            const updatedBooking = await api.patch(`/bookings/${existingBooking.id}`, {
                quantity: newQuantity
            });

            // Логируем успех без показа toast (будет показан итоговый toast)
            const equipmentName = existingBooking.equipment_name || `Оборудование ${bookingData.equipment_id}`;
            console.log(`Количество "${equipmentName}" увеличено до ${newQuantity}`);

            result = {
                success: true,
                booking: updatedBooking,
                action: 'quantity_increased',
                message: `Количество оборудования увеличено до ${newQuantity}`
            };

        } else {
            // Оборудования нет в проекте или даты отличаются - создаем новое бронирование
            console.log('Создание нового бронирования для оборудования:', bookingData.equipment_id);

            // Подготавливаем данные для создания бронирования (БЕЗ project_id)
            const bookingPayload = {
                equipment_id: parseInt(bookingData.equipment_id),
                client_id: parseInt(clientId),
                start_date: startDate,
                end_date: endDate,
                quantity: quantityToAdd,
                total_amount: parseFloat(bookingData.total_amount) || 0.0
            };

            // Шаг 1: Создаем бронирование
            const bookingResponse = await api.post('/bookings/', bookingPayload);

            // Проверяем успешность создания бронирования
            if (!bookingResponse || !bookingResponse.id) {
                throw new Error('Некорректный ответ при создании бронирования');
            }

            // Шаг 2: Добавляем бронирование в проект
            console.log('Добавление бронирования в проект:', bookingResponse.id);
            const projectResponse = await api.post(`/projects/${projectId}/bookings/${bookingResponse.id}`);

            // Проверяем успешность добавления в проект
            if (!projectResponse) {
                throw new Error('Ошибка при добавлении бронирования в проект');
            }

            // Логируем успех без показа toast (будет показан итоговый toast)
            const equipmentName = bookingResponse.equipment_name || `Оборудование ${bookingData.equipment_id}`;
            console.log(`Оборудование "${equipmentName}" успешно добавлено в проект`);

            result = {
                success: true,
                booking: bookingResponse,
                project: projectResponse,
                action: 'new_booking_created',
                message: 'Оборудование успешно добавлено в проект'
            };
        }

        // Обновляем данные проекта и UI после изменений (только при индивидуальном добавлении)
        if (!bookingData._skipRefresh) {
            showToast('Обновление списка оборудования...', 'info');
            await refreshProjectData();
        }

        return result;

    } catch (error) {
        // Логируем ошибку для отладки
        console.error('Ошибка при добавлении оборудования в проект:', error);

        // Определяем тип ошибки и показываем соответствующее сообщение
        let errorMessage = 'Произошла ошибка при добавлении оборудования';

        if (error.message) {
            errorMessage = error.message;
        } else if (error.response?.data?.detail) {
            // Обрабатываем ошибки API
            if (Array.isArray(error.response.data.detail)) {
                errorMessage = error.response.data.detail
                    .map(err => `${err.loc ? err.loc.join(' -> ') : 'поле'}: ${err.msg}`)
                    .join('; ');
            } else {
                errorMessage = error.response.data.detail;
            }
        }

        // Показываем ошибку пользователю
        showToast(errorMessage, 'danger');

        // Возвращаем результат с ошибкой
        return {
            success: false,
            error: errorMessage,
            originalError: error
        };
    }
}

/**
 * Обновляет данные проекта после изменений
 */
async function refreshProjectData() {
    try {
        const projectId = getProjectIdFromUrl();
        if (!projectId) return;

        // Динамически импортируем API клиент (готовый инстанс)
        const { api } = await import('./utils/api.js');

        // Получаем обновленные данные проекта
        const updatedProject = await api.get(`/projects/${projectId}`);

        // Обновляем глобальную переменную с данными проекта
        if (updatedProject) {
            window.projectData = updatedProject;

            // Импортируем и вызываем функцию обновления UI оборудования
            try {
                const { renderEquipmentSection } = await import('./project/equipment/ui.js');
                renderEquipmentSection(updatedProject);
            } catch (importError) {
                console.error('Ошибка импорта renderEquipmentSection:', importError);
            }

            // Обновляем отображение страницы
            if (typeof window.toggleEquipmentDatesColumn === 'function') {
                window.toggleEquipmentDatesColumn();
            }

            // Вызываем событие обновления данных проекта
            document.dispatchEvent(new CustomEvent('projectDataUpdated', {
                detail: { projectData: updatedProject }
            }));
        }

    } catch (error) {
        console.error('Ошибка при обновлении данных проекта:', error);
        // Не показываем ошибку пользователю, так как это фоновая операция
    }
}
