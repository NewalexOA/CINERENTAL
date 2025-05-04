/**
 * Equipment booking functionality
 */

import { api } from '../../utils/api.js';
import { showToast } from '../../utils/common.js';
import { projectData, updateProjectData } from '../project-details.js';
import { getProjectIdFromUrl, refreshProjectData } from '../project-utils.js';
import { renderEquipmentSection, resetEquipmentSelection, hideAddEquipmentZone } from './ui.js';

/**
 * Handle quantity increase
 * @param {Event} event - Click event
 */
export async function handleQuantityIncrease(event) {
    const row = event.target.closest('tr');
    const bookingId = row.dataset.bookingId;
    const quantitySpan = row.querySelector('.quantity');
    const currentQuantity = parseInt(quantitySpan.textContent);
    const equipmentName = row.querySelector('td:first-child div').textContent;

    try {
        if (row.dataset.hasSerialNumber === 'true') {
            showToast('Нельзя увеличить количество для уникального оборудования', 'danger');
            return;
        }

        if (!confirm(`Вы уверены, что хотите увеличить количество "${equipmentName}" с ${currentQuantity} до ${currentQuantity + 1}?`)) {
            return;
        }

        const data = await api.patch(`/bookings/${bookingId}`, {
            quantity: currentQuantity + 1
        });

        const newQuantity = data.quantity;
        quantitySpan.textContent = newQuantity;

        // Update buttons
        updateQuantityButtons(row, newQuantity);

        // Refresh project data to update UI
        await refreshProjectData(updateProjectData);

        showToast('Количество увеличено', 'success');
    } catch (error) {
        console.error('Error increasing quantity:', error);
        showToast('Ошибка при изменении количества', 'danger');
    }
}

/**
 * Handle quantity decrease
 * @param {Event} event - Click event
 */
export async function handleQuantityDecrease(event) {
    const row = event.target.closest('tr');
    const bookingId = row.dataset.bookingId;
    const quantitySpan = row.querySelector('.quantity');
    const currentQuantity = parseInt(quantitySpan.textContent);
    const equipmentName = row.querySelector('td:first-child div').textContent;

    if (currentQuantity <= 1) return;

    try {
        if (!confirm(`Вы уверены, что хотите уменьшить количество "${equipmentName}" с ${currentQuantity} до ${currentQuantity - 1}?`)) {
            return;
        }

        const data = await api.patch(`/bookings/${bookingId}`, {
            quantity: currentQuantity - 1
        });

        const newQuantity = data.quantity;
        quantitySpan.textContent = newQuantity;

        // Update buttons
        updateQuantityButtons(row, newQuantity);

        // Refresh project data to update UI
        await refreshProjectData(updateProjectData);

        showToast('Количество уменьшено', 'success');
    } catch (error) {
        console.error('Error decreasing quantity:', error);
        showToast('Ошибка при изменении количества', 'danger');
    }
}

/**
 * Update quantity buttons based on quantity
 * @param {HTMLElement} row - Table row element
 * @param {number} quantity - Current quantity
 */
function updateQuantityButtons(row, quantity) {
    const btnGroup = row.querySelector('.btn-group[role="group"]');
    if (!btnGroup) return;

    if (quantity === 1) {
        btnGroup.innerHTML = `
            <button class="btn btn-outline-secondary quantity-increase-btn" title="Увеличить кол-во">
                <i class="fas fa-plus"></i>
            </button>
            <button class="btn btn-outline-danger remove-booking-btn" title="Удалить">
                <i class="fas fa-times"></i>
            </button>
        `;

        const increaseBtn = btnGroup.querySelector('.quantity-increase-btn');
        const removeBtn = btnGroup.querySelector('.remove-booking-btn');

        increaseBtn.addEventListener('click', handleQuantityIncrease);
        removeBtn.addEventListener('click', handleBookingRemoval);
    } else {
        btnGroup.innerHTML = `
            <button class="btn btn-outline-secondary quantity-increase-btn" title="Увеличить кол-во">
                <i class="fas fa-plus"></i>
            </button>
            <button class="btn btn-outline-secondary quantity-decrease-btn" title="Уменьшить кол-во">
                <i class="fas fa-minus"></i>
            </button>
        `;

        const increaseBtn = btnGroup.querySelector('.quantity-increase-btn');
        const decreaseBtn = btnGroup.querySelector('.quantity-decrease-btn');

        increaseBtn.addEventListener('click', handleQuantityIncrease);
        decreaseBtn.addEventListener('click', handleQuantityDecrease);
    }
}

/**
 * Handle booking removal
 * @param {Event} event - Click event
 */
export async function handleBookingRemoval(event) {
    const row = event.target.closest('tr');
    const bookingId = row.dataset.bookingId;
    const equipmentName = row.querySelector('td:first-child div').textContent;
    const quantity = parseInt(row.querySelector('.quantity').textContent) || 1;
    const qtyStr = quantity > 1 ? ` (${quantity} шт.)` : '';

    if (!confirm(`Вы уверены, что хотите удалить "${equipmentName}"${qtyStr} из проекта?`)) {
        return;
    }

    try {
        await api.delete(`/bookings/${bookingId}`);
        await refreshProjectData(updateProjectData);

        showToast('Бронирование удалено', 'success');
    } catch (error) {
        console.error('Error removing booking:', error);
        showToast('Ошибка при удалении бронирования', 'danger');
    }
}

/**
 * Add selected equipment to project
 */
export async function addSelectedEquipmentToProject() {
    try {
        const selectedItem = document.querySelector('.equipment-item.selected');
        if (!selectedItem) {
            showToast('Выберите оборудование', 'warning');
            return;
        }

        const equipmentId = selectedItem.dataset.equipmentId;
        const projectId = getProjectIdFromUrl();

        if (!projectId) {
            showToast('Идентификатор проекта не найден', 'danger');
            return;
        }

        const dateRange = document.getElementById('newBookingPeriod');
        const dates = $(dateRange).data('daterangepicker');
        const startDate = dates.startDate.format('YYYY-MM-DDTHH:mm:ss');
        const endDate = dates.endDate.format('YYYY-MM-DDTHH:mm:ss');
        const quantity = parseInt(document.getElementById('newBookingQuantity').value) || 1;

        const equipment = await api.get(`/equipment/${equipmentId}`);
        const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
        const total_amount = equipment.replacement_cost * 0.01 * days * quantity;

        const bookingPayload = {
            client_id: projectData.client_id,
            equipment_id: equipmentId,
            start_date: startDate,
            end_date: endDate,
            quantity: quantity,
            notes: null,
            total_amount: total_amount
        };

        const booking = await api.post('/bookings', bookingPayload);
        await api.post(`/projects/${projectId}/bookings/${booking.id}`);

        await refreshProjectData(updateProjectData);

        hideAddEquipmentZone();
        resetEquipmentSelection();

        showToast('Оборудование добавлено в проект', 'success');
    } catch (error) {
        console.error('Error adding equipment to project:', error);
        showToast('Ошибка при добавлении оборудования', 'danger');
    }
}
