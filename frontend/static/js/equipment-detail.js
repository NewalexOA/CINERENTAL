{/* <script
    data-equipment-id="{{ equipment.id }}"
    data-category-id="{{ equipment.category_id }}"
    data-barcode="{{ equipment.barcode }}"
> */}

import { api } from './utils/api.js';
import { showToast, formatDate, formatDateRange } from './utils/common.js';

// Initialize equipment data from data attributes
const scriptTag = document.getElementById('equipment-data'); // Get the dedicated script tag
const EQUIPMENT_DATA = {
    id: parseInt(scriptTag.dataset.equipmentId, 10),
    // Handle potentially empty categoryId string from template
    categoryId: scriptTag.dataset.categoryId ? parseInt(scriptTag.dataset.categoryId, 10) : null,
    barcode: scriptTag.dataset.barcode
};

// Enhance the showToast function to auto-dismiss notifications
const originalShowToast = showToast;
window.showToast = function(message, type) {
    const toast = originalShowToast(message, type);

    // Auto-dismiss the toast after 3 seconds
    setTimeout(() => {
        const toastElement = document.querySelector('.toast.show');
        if (toastElement) {
            const bsToast = bootstrap.Toast.getInstance(toastElement);
            if (bsToast) {
                bsToast.hide();
            }
        }
    }, 3000);

    return toast;
};

// Load categories for edit form
async function loadCategories() {
    const formSelect = document.querySelector('select[name="category_id"]');
    formSelect.innerHTML = '<option value="">Загрузка категорий...</option>';
    formSelect.disabled = true;

    try {
        const categories = await api.get('/categories');

        // First add empty option for "no category" selection
        let options = `<option value="">Без категории</option>`;

        // Then add all available categories
        options += categories.map(category => {
            // Ensure both values are numbers for comparison
            const categoryId = parseInt(category.id, 10);
            // Use strict comparison to avoid false positives
            const isSelected = categoryId === EQUIPMENT_DATA.categoryId;

            return `<option value="${categoryId}" ${isSelected ? 'selected' : ''}>
                ${category.name}
            </option>`;
        }).join('');

        formSelect.innerHTML = options;
    } catch (error) {
        console.error('Error loading categories:', error);
        showToast('Ошибка при загрузке категорий', 'danger');
        formSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
    } finally {
        formSelect.disabled = false;
    }
}

// Load booking history
async function loadBookingHistory() {
    try {
        const bookings = await api.get(`/equipment/${EQUIPMENT_DATA.id}/bookings`);
        const container = document.getElementById('bookingHistory');

        if (bookings.length === 0) {
            container.innerHTML = '<div class="text-center py-3">Нет истории бронирований</div>';
            return;
        }

        container.innerHTML = `
            <div class="list-group list-group-flush">
                ${bookings.map(booking => `
                    <a href="/bookings/${booking.id}" class="list-group-item list-group-item-action">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${booking.client_name || 'Клиент не указан'}</h6>
                            <small class="text-muted">${formatDate(booking.start_date)}</small>
                        </div>
                        <p class="mb-1">${formatDateRange(booking.start_date, booking.end_date)}</p>
                        <div class="d-flex justify-content-between">
                            <small class="text-${getStatusColor(booking.booking_status)}">${booking.booking_status}</small>
                            <small class="text-muted">${booking.project_name || 'Без проекта'}</small>
                        </div>
                    </a>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading booking history:', error);
        document.getElementById('bookingHistory').innerHTML = `
            <div class="alert alert-danger">
                Ошибка загрузки истории бронирований
            </div>
        `;
    }
}

// Load status timeline
async function loadStatusTimeline() {
    try {
        const timeline = await api.get(`/equipment/${EQUIPMENT_DATA.id}/timeline`);
        const container = document.getElementById('statusTimeline');

        if (timeline.length === 0) {
            container.innerHTML = '<div class="text-center py-3">Нет истории изменений</div>';
            return;
        }

        container.innerHTML = `
            <div class="timeline">
                ${timeline.map(entry => `
                    <div class="timeline-item">
                        <div class="timeline-badge bg-${getStatusColor(entry.status)}">
                            <i class="fas fa-circle"></i>
                        </div>
                        <div class="timeline-content">
                            <h6 class="mb-1">${entry.status}</h6>
                            <small class="text-muted">${formatDate(entry.created_at)}</small>
                            ${entry.notes ? `<p class="mb-0">${entry.notes}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading status timeline:', error);
        document.getElementById('statusTimeline').innerHTML = `
            <div class="alert alert-danger">
                Ошибка загрузки истории статусов
            </div>
        `;
    }
}

// Handle equipment update
document.getElementById('updateEquipment').addEventListener('click', async () => {
    const form = document.getElementById('editEquipmentForm');
    const formData = new FormData(form);

    // Extract data from form
    const data = Object.fromEntries(formData.entries());

    // Convert string values to appropriate types
    if (data.category_id) {
        data.category_id = parseInt(data.category_id, 10);
    } else {
        // Make sure we send a proper empty value - this is critical
        data.category_id = null;
    }

    if (data.replacement_cost) {
        data.replacement_cost = parseFloat(data.replacement_cost);
    }

    try {
        const response = await api.put(`/equipment/${EQUIPMENT_DATA.id}`, data);

        // Update the displayed category name before redirect
        const categorySelect = form.querySelector('select[name="category_id"]');
        const selectedOption = categorySelect.options[categorySelect.selectedIndex];
        const categoryName = selectedOption ? selectedOption.textContent.trim() : 'Без категории';

        // Update the displayed category name in the UI immediately
        document.querySelector('.card-subtitle.text-muted').textContent = categoryName;

        // Store notification message in sessionStorage to show after reload
        try {
            sessionStorage.setItem('equipmentNotification', JSON.stringify({
                message: 'Оборудование успешно обновлено',
                type: 'success'
            }));
        } catch (storageError) {
            console.warn('Unable to access sessionStorage:', storageError);
            // We'll still show a toast before redirecting
            showToast('Оборудование успешно обновлено', 'success');
        }

        // Redirect with category_id parameter for proper backend rendering
        setTimeout(() => {
            // Include category_id in query params to ensure correct rendering after load
            const url = new URL(window.location.origin + `/equipment/${EQUIPMENT_DATA.id}`);
            url.searchParams.set('t', new Date().getTime()); // Cache-busting

            // Always include category_id parameter, even if null (will be handled correctly by backend)
            if (data.category_id !== null) {
                url.searchParams.set('category_id', data.category_id);
            }

            window.location.href = url.toString();
        }, 1000); // Delay to allow toast to be visible
    } catch (error) {
        console.error('Error updating equipment:', error);
        showToast('Ошибка при обновлении', 'danger');
    }
});

// Handle equipment deletion
document.getElementById('deleteEquipment').addEventListener('click', async () => {
    try {
        // Display loading indicator
        const deleteButton = document.getElementById('deleteEquipment');
        const originalText = deleteButton.innerHTML;
        deleteButton.disabled = true;
        deleteButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Удаление...';

        // Execute delete request
        await api.delete(`/equipment/${EQUIPMENT_DATA.id}`);

        // Notify user
        showToast('Оборудование успешно удалено', 'success');

        // Redirect to equipment list with cache-busting parameter
        window.location.href = '/equipment?t=' + new Date().getTime();
    } catch (error) {
        console.error('Error deleting equipment:', error);
        showToast('Ошибка при удалении: ' + (error.message || 'Неизвестная ошибка'), 'danger');

        // Restore button state
        const deleteButton = document.getElementById('deleteEquipment');
        if (deleteButton) {
            deleteButton.disabled = false;
            deleteButton.innerHTML = 'Удалить';
        }
    }
});

// Handle notes update
document.getElementById('notesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const notes = document.getElementById('notes').value;

    try {
        await api.patch(`/equipment/${EQUIPMENT_DATA.id}/notes`, { notes });
        showToast('Заметки успешно сохранены', 'success');
    } catch (error) {
        console.error('Error saving notes:', error);
        showToast('Ошибка при сохранении заметок', 'danger');
    }
});

// Helper function for status colors
function getStatusColor(status) {
    const colors = {
        // Equipment statuses
        'AVAILABLE': 'success',
        'RENTED': 'warning',
        'MAINTENANCE': 'danger',

        // Booking statuses
        'ACTIVE': 'primary',
        'COMPLETED': 'success',
        'CANCELLED': 'danger',
        'PENDING': 'warning'
    };
    return colors[status] || 'secondary';
}

// Barcode info loading
async function loadBarcodeInfo() {
    const barcode = document.getElementById('barcodeDisplay').textContent.trim();
    if (!barcode) return;

    try {
        const response = await api.post('/barcodes/validate', { barcode });

        if (response.is_valid) {
            const details = response.details || {};

            // Display barcode information based on available data
            // For new format (global counter), we'll just show basic info
            let infoContent = '';

            if (details.category?.name) {
                // Legacy format with category info
                const category = details.category.name || 'Unknown';
                infoContent += `<strong>Category:</strong> ${category} <br>`;
            }

            // Always show the barcode
            infoContent += `<strong>Barcode:</strong> ${barcode} <br>`;

            // Show sequence number if available
            if (details.sequence_number) {
                infoContent += `<strong>Sequence:</strong> ${details.sequence_number}`;
            }

            document.getElementById('barcodeInfo').innerHTML = infoContent || `<strong>Status:</strong> Valid`;
        } else {
            document.getElementById('barcodeInfo').innerHTML = '<span class="text-info">Custom barcode</span>';
        }
    } catch (error) {
        console.error('Error loading barcode info:', error);
        document.getElementById('barcodeInfo').innerHTML = '<span class="text-danger">Error loading barcode information</span>';
    }
}

// Barcode regeneration
async function regenerateBarcode() {
    if (!confirm('Вы действительно хотите перегенерировать штрих-код? Это действие нельзя отменить.')) {
        return;
    }

    // Completely remove global loader if exists
    const existingLoader = document.getElementById('global-loader');
    if (existingLoader) {
        existingLoader.remove();
        window.loaderCounter = 0;
        console.log('Global loader completely removed from DOM');
    }

    // Create and display a local loading indicator
    const regenerateBtn = document.getElementById('regenerateBarcodeBtn');
    const originalBtnContent = regenerateBtn.innerHTML;
    regenerateBtn.disabled = true;
    regenerateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';

    // Also show a loading indicator in the barcode info section
    const barcodeInfoElement = document.getElementById('barcodeInfo');
    const originalInfoContent = barcodeInfoElement.innerHTML;
    barcodeInfoElement.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div> Processing...</div>';

    try {
        // Call API for barcode regeneration without subcategory parameter
        const response = await api.post(`/equipment/${EQUIPMENT_DATA.id}/regenerate-barcode`, {});

        // Update barcode on the page
        document.getElementById('barcodeDisplay').textContent = response.barcode;

        // Load information about the new barcode
        await loadBarcodeInfo();

        showToast('Штрих-код успешно перегенерирован', 'success');
    } catch (error) {
        console.error('Error regenerating barcode:', error);
        showToast('Ошибка при перегенерации штрих-кода', 'danger');
        // Restore original barcode info if loadBarcodeInfo failed
        barcodeInfoElement.innerHTML = originalInfoContent;
    } finally {
        // Restore button state
        regenerateBtn.disabled = false;
        regenerateBtn.innerHTML = originalBtnContent;

        // Final safety check - remove any global loader that might have appeared
        const finalCheck = document.getElementById('global-loader');
        if (finalCheck) {
            finalCheck.remove();
            window.loaderCounter = 0;
            console.log('Global loader removed in final cleanup');
        }
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadBookingHistory();
    loadStatusTimeline();

    // Check for notification stored from previous page load
    const notification = sessionStorage.getItem('equipmentNotification');
    if (notification) {
        const { message, type } = JSON.parse(notification);
        showToast(message, type);
        sessionStorage.removeItem('equipmentNotification');
    }

    // Loading barcode info
    loadBarcodeInfo();

    // Barcode regeneration button handler
    document.getElementById('regenerateBarcodeBtn').addEventListener('click', regenerateBarcode);
});

// Copy barcode to clipboard
function copyBarcode(barcode) {
    navigator.clipboard.writeText(barcode).then(() => {
        showToast('Штрих-код скопирован', 'success');
    }).catch(() => {
        showToast('Ошибка при копировании', 'danger');
    });
}

// Export functions to global scope for onclick handlers
window.copyBarcode = copyBarcode;
