/**
 * Project creation functionality
 *
 * This module handles creating new projects, including:
 * - Equipment selection and management
 * - Client selection
 * - Date range picking
 * - Form validation and submission
 */

// Import API client
import { api } from './utils/api.js';
import { DATERANGEPICKER_LOCALE } from './utils/common.js';

// State variables
let selectedEquipment = [];
let equipmentCatalog = [];
let sessionData = null;

// Helper functions for formatting - use globals or locals appropriately
const projectFormatDate = typeof window.formatDate === 'function' ? window.formatDate :
                  (typeof formatProjectDate === 'function' ? formatProjectDate :
                   date => new Date(date).toLocaleDateString('ru-RU'));

const toast = typeof window.showToast === 'function' ? window.showToast :
            (typeof showProjectToast === 'function' ? showProjectToast :
             (msg, type) => { alert(`${type.toUpperCase()}: ${msg}`); });

// Helper function that uses global formatCurrency without redeclaring it
function formatCurrencyValue(amount) {
    if (typeof window.formatCurrency === 'function') {
        return window.formatCurrency(amount);
    } else if (typeof formatProjectCurrency === 'function') {
        return formatProjectCurrency(amount);
    } else {
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Load clients dropdown
    loadClients();

    // Load equipment catalog
    loadEquipmentCatalog();

    // Initialize date picker
    initDatePicker();

    // Load session data if available
    loadSessionData();

    // Add event listeners
    initEventListeners();
});

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Project form submission
    document.getElementById('newProjectForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProject();
    });

    // Create project button
    document.getElementById('createProjectBtn')?.addEventListener('click', () => {
        saveProject();
    });
}

/**
 * Load clients for dropdown
 */
async function loadClients() {
    try {
        const clients = await api.get('/clients');
        const select = document.getElementById('clientSelect');

        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            select.appendChild(option);
        });

        // Initialize Select2 if it exists
        if ($.fn.select2) {
            $('#clientSelect').select2({
                placeholder: 'Выберите клиента',
                allowClear: true
            });

            // Restore client selection from session if available
            if (sessionData && sessionData.client_id) {
                $('#clientSelect').val(sessionData.client_id).trigger('change');
            }
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        toast('Ошибка загрузки списка клиентов', 'danger');
    }
}

/**
 * Initialize date picker
 */
function initDatePicker() {
    $('#projectDates').daterangepicker({
        autoUpdateInput: false,
        locale: DATERANGEPICKER_LOCALE
    });

    $('#projectDates').on('apply.daterangepicker', function(ev, picker) {
        $(this).val(picker.startDate.format('DD.MM.YYYY') + ' - ' + picker.endDate.format('DD.MM.YYYY'));
    });

    $('#projectDates').on('cancel.daterangepicker', function(ev, picker) {
        $(this).val('');
    });

    // Restore date selection from session if available
    if (sessionData && sessionData.start_date && sessionData.end_date) {
        const picker = $('#projectDates').data('daterangepicker');
        picker.setStartDate(moment(sessionData.start_date));
        picker.setEndDate(moment(sessionData.end_date));
        $('#projectDates').val(
            picker.startDate.format('DD.MM.YYYY') + ' - ' +
            picker.endDate.format('DD.MM.YYYY')
        );
    }
}

/**
 * Load equipment catalog (simplified)
 */
async function loadEquipmentCatalog() {
    try {
        equipmentCatalog = await api.get('/equipment');
        // No need to render list or categories here anymore
    } catch (error) {
        console.error('Error loading equipment catalog:', error);
        toast('Ошибка загрузки каталога оборудования', 'danger');
    }
}

/**
 * Update equipment list display based on session data (no modal)
 */
function updateEquipmentTable() {
    const equipmentListContainer = document.getElementById('equipmentList');
    const equipmentItemsTbody = document.getElementById('equipmentItems');
    const noEquipmentMessage = document.getElementById('noEquipmentMessage');
    const equipmentCountElement = document.getElementById('equipmentCount');
    const totalItemsElement = document.getElementById('totalItems');

    if (!equipmentItemsTbody || !noEquipmentMessage || !equipmentListContainer || !equipmentCountElement || !totalItemsElement) {
        console.error('Required elements for equipment list are missing.');
        return; // Exit if critical elements are not found
    }

    equipmentItemsTbody.innerHTML = ''; // Clear previous items

    if (selectedEquipment.length === 0) {
        equipmentListContainer.classList.add('d-none');
        noEquipmentMessage.classList.remove('d-none');
        equipmentCountElement.textContent = '0 позиций';
        totalItemsElement.textContent = '0';
        return;
    }

    equipmentListContainer.classList.remove('d-none');
    noEquipmentMessage.classList.add('d-none');

    selectedEquipment.forEach((item, index) => {
        const row = document.createElement('tr');
        const displayName = item.name || 'Unknown Equipment';

        const hasSerialNumber = !!item.serial_number;
        const quantity = item.quantity || 1;

        row.setAttribute('data-has-serial-number', hasSerialNumber ? 'true' : 'false');
        row.setAttribute('data-equipment-id', item.id);
        row.setAttribute('data-index', index);

        let actionButtons = '';
        if (hasSerialNumber) {
            actionButtons = `
                <button class="btn btn-sm btn-outline-danger remove-equipment-btn" data-index="${index}" title="Удалить">
                    <i class="fas fa-times"></i>
                </button>
            `;
        } else {
            actionButtons = `
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-secondary quantity-increase-btn" data-index="${index}" title="Увеличить кол-во">
                        <i class="fas fa-plus"></i>
                    </button>
                    ${quantity > 1 ? `
                        <button class="btn btn-outline-secondary quantity-decrease-btn" data-index="${index}" title="Уменьшить кол-во">
                            <i class="fas fa-minus"></i>
                        </button>
                    ` : `
                        <button class="btn btn-outline-danger remove-equipment-btn" data-index="${index}" title="Удалить">
                            <i class="fas fa-times"></i>
                        </button>
                    `}
                </div>
            `;
        }

        row.innerHTML = `
            <td>
                <div>${displayName}</div>
                <small class="text-muted">${item.category || ''}</small>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm equipment-period-input"
                       data-index="${index}"
                       placeholder="ДД.ММ.ГГГГ - ДД.ММ.ГГГГ"
                       value="${item.booking_start && item.booking_end ?
                                 moment(item.booking_start).format('DD.MM.YYYY') + ' - ' + moment(item.booking_end).format('DD.MM.YYYY') : ''}">
            </td>
            <td class="text-center">
                <span class="quantity">${quantity}</span>
            </td>
            <td class="text-center align-middle">
                <div class="btn-group" role="group">
                    ${actionButtons}
                </div>
            </td>
        `;
        equipmentItemsTbody.appendChild(row);
    });

    const totalItems = selectedEquipment.reduce((sum, item) => sum + (item.quantity || 1), 0);
    equipmentCountElement.textContent = `${selectedEquipment.length} ${getNoun(selectedEquipment.length, 'позиция', 'позиции', 'позиций')} (всего ${totalItems} шт.)`;
    totalItemsElement.textContent = totalItems.toString();

    // Initialize date pickers for equipment items and add other listeners
    addEquipmentItemEventListeners();
}

/**
 * Save project data to session storage
 */
function saveSessionData() {
    const formData = new FormData(document.getElementById('newProjectForm'));
    const dateRange = $('#projectDates').data('daterangepicker');

    const sessionData = {
        name: formData.get('name') || '',
        client_id: formData.get('client_id') || '',
        description: formData.get('description') || '',
        notes: formData.get('notes') || '',
        start_date: dateRange?.startDate?.isValid() ? dateRange.startDate.hour(0).minute(0).format('YYYY-MM-DDTHH:mm:ss') : null,
        end_date: dateRange?.endDate?.isValid() ? dateRange.endDate.hour(23).minute(59).format('YYYY-MM-DDTHH:mm:ss') : null,
        bookings: selectedEquipment.map(item => ({
            equipment_id: item.id,
            equipment_name: item.name,
            price_per_day: item.price_per_day,
            category: item.category,
            serial_number: item.serial_number,
            quantity: item.quantity || 1,
            start_date: item.booking_start || dateRange?.startDate?.format('YYYY-MM-DD') || null,
            end_date: item.booking_end || dateRange?.endDate?.format('YYYY-MM-DD') || null
        }))
    };

    try {
        sessionStorage.setItem('newProjectData', JSON.stringify(sessionData));
    } catch (e) {
        console.error('Error saving session data:', e);
    }
}

/**
 * Load project data from session storage
 */
function loadSessionData() {
    try {
        // Get ID session from URL, if it exists
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');

        if (sessionId) {
            // Check if scanStorage is available
            if (typeof scanStorage === 'undefined') {
                console.warn('scanStorage is not available, trying to load from sessionStorage only');
                loadProjectDataFromSessionStorage();
                return;
            }

            // Get scanning data from storage
            const scanSession = scanStorage.getSession(sessionId);

            if (scanSession && scanSession.items && scanSession.items.length) {
                console.log('Loading data from scan session:', scanSession.items.length, 'items');

                // Convert scanning session items to equipment format for selection
                selectedEquipment = scanSession.items.map(item => ({
                    id: item.equipment_id,
                    name: item.name,
                    barcode: item.barcode,
                    serial_number: item.serial_number,
                    category: item.category_name,
                    quantity: item.quantity || 1,
                    booking_start: null,
                    booking_end: null
                }));

                updateEquipmentTable();

                // Update scanning session info on page
                document.getElementById('sessionName').textContent = scanSession.name || 'Без названия';
                document.getElementById('sessionCreated').textContent = formatProjectDateTime(scanSession.updatedAt) || '-';
                document.getElementById('sessionItems').textContent = scanSession.items.length;

                // Load project data from sessionStorage, if it exists
                loadProjectDataFromSessionStorage();
            } else {
                console.warn('Scan session not found or empty:', sessionId);
                loadProjectDataFromSessionStorage();
            }
        } else {
            loadProjectDataFromSessionStorage();
        }
    } catch (e) {
        console.error('[loadSessionData] Error loading session data:', e);
        // Try to load from sessionStorage as fallback
        loadProjectDataFromSessionStorage();
    }
}

/**
 * Load project data from session storage (separate from scan session)
 */
function loadProjectDataFromSessionStorage() {
    try {
        const data = sessionStorage.getItem('newProjectData');

        if (data) {
            sessionData = JSON.parse(data);
            console.log('Loaded project data from sessionStorage');

            // Restore form values
            if (sessionData.name) {
                document.getElementById('projectName').value = sessionData.name;
            }

            if (sessionData.description) {
                document.getElementById('projectDescription').value = sessionData.description;
            }

            if (sessionData.notes) {
                document.getElementById('projectNotes').value = sessionData.notes;
            }

            if (sessionData.client_id) {
                document.getElementById('clientSelect').value = sessionData.client_id;
            }

            // Restore equipment selection only if we don't have items from scan session
            if (selectedEquipment.length === 0 && sessionData.bookings && Array.isArray(sessionData.bookings)) {
                // Convert booking info to equipment format for selection
                selectedEquipment = sessionData.bookings.map(booking => ({
                    id: booking.equipment_id,
                    name: booking.equipment_name,
                    price_per_day: booking.price_per_day,
                    category: booking.category,
                    serial_number: booking.serial_number,
                    quantity: booking.quantity || 1,
                    booking_start: booking.start_date,
                    booking_end: booking.end_date
                }));

                console.log('Restored equipment from sessionStorage bookings:', selectedEquipment.length, 'items');
                updateEquipmentTable();
            } else if (selectedEquipment.length === 0 && sessionData.equipment && Array.isArray(sessionData.equipment)) {
                // Support old format for backward compatibility
                selectedEquipment = sessionData.equipment;
                console.log('Restored equipment from sessionStorage (legacy format):', selectedEquipment.length, 'items');
                updateEquipmentTable();
            }
        }
    } catch (e) {
        console.error('[loadProjectDataFromSessionStorage] Error loading session data:', e);
    }
}

/**
 * Save project
 */
async function saveProject() {
    if (!validateNewProjectForm()) {
        return;
    }

    try {
        showLoading();

        // Create project payload with ACTIVE status
        const payload = createProjectPayload('ACTIVE');

        // Stop if payload creation failed (e.g., missing dates)
        if (!payload) {
             hideLoading();
             return;
        }

        // Send API request
        const result = await api.post('/projects', payload);

        sessionStorage.removeItem('newProjectData');
        toast('Проект успешно создан', 'success');
        setTimeout(() => {
            window.location.href = `/projects/${result.id}`;
        }, 1000);
    } catch (error) {
        console.error('Error creating project:', error);
        hideLoading();
        toast(`Ошибка при создании проекта: ${error.message}`, 'danger');
    }
}

/**
 * Save project as draft
 */
async function saveProjectAsDraft() {
    const form = document.getElementById('newProjectForm');

    // Validate only required fields
    if (!form.elements.name.value) {
        toast('Введите название проекта', 'warning');
        form.elements.name.focus();
        return;
    }

    try {
        // Show loading
        showLoading();

        // Create project payload
        const payload = createProjectPayload('DRAFT');

        // Send API request
        const result = await api.post('/projects', payload);

        // Clear session data
        sessionStorage.removeItem('newProjectData');

        // Show success message
        toast('Черновик проекта сохранен', 'success');

        // Redirect to project view
        setTimeout(() => {
            window.location.href = `/projects/${result.id}`;
        }, 1000);
    } catch (error) {
        console.error('Error saving draft:', error);
        hideLoading();
        toast('Ошибка при сохранении черновика', 'danger');
    }
}

/**
 * Create project payload
 * @param {string} status - Project status
 * @returns {Object} - Project payload
 */
function createProjectPayload(status) {
    const form = document.getElementById('newProjectForm');
    const formData = new FormData(form);
    const dateRange = $('#projectDates').data('daterangepicker');

    const payload = {
        name: formData.get('name'),
        client_id: parseInt(formData.get('client_id')),
        description: formData.get('description') || null,
        notes: formData.get('notes') || null,
        status: status,
        start_date: dateRange?.startDate?.isValid() ? dateRange.startDate.hour(0).minute(0).format('YYYY-MM-DDTHH:mm:ss') : null,
        end_date: dateRange?.endDate?.isValid() ? dateRange.endDate.hour(23).minute(59).format('YYYY-MM-DDTHH:mm:ss') : null,
        bookings: []
    };

    selectedEquipment.forEach(item => {
        const bookingStartDate = item.booking_start || (dateRange?.startDate?.isValid() ? dateRange.startDate.hour(0).minute(0).format('YYYY-MM-DDTHH:mm:ss') : null);
        const bookingEndDate = item.booking_end || (dateRange?.endDate?.isValid() ? dateRange.endDate.hour(23).minute(59).format('YYYY-MM-DDTHH:mm:ss') : null);

        const booking = {
            equipment_id: parseInt(item.id),
            start_date: bookingStartDate,
            end_date: bookingEndDate,
            quantity: item.quantity || 1
        };

        payload.bookings.push(booking);
    });

    // Validate that all bookings have dates
    const bookingsWithoutDates = payload.bookings.filter(b => !b.start_date || !b.end_date);
    if (bookingsWithoutDates.length > 0) {
        console.error('Some bookings are missing dates:', bookingsWithoutDates.length, 'items');
        toast('Ошибка: Не все позиции оборудования имеют установленные даты бронирования.', 'danger');
        return null;
    }

    return payload;
}

/**
 * Validate form
 * @returns {boolean} - True if valid
 */
function validateNewProjectForm() {
    const form = document.getElementById('newProjectForm');

    // Project name
    if (!form.elements.name.value) {
        toast('Введите название проекта', 'warning');
        form.elements.name.focus();
        return false;
    }

    // Client selection
    if (!form.elements.client_id.value) {
        toast('Выберите клиента', 'warning');
        form.elements.client_id.focus();
        return false;
    }

    // Date range
    if (!$('#projectDates').val()) {
        toast('Выберите период проекта', 'warning');
        $('#projectDates').focus();
        return false;
    }

    // Equipment selection
    if (selectedEquipment.length === 0) {
        toast('Добавьте оборудование в проект', 'warning');
        return false;
    }

    return true;
}

/**
 * Show loading state
 */
function showLoading() {
    const submitBtn = document.querySelector('#newProjectForm button[type="submit"]');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Сохранение...';
    }
}

/**
 * Hide loading state
 */
function hideLoading() {
    const submitBtn = document.querySelector('#newProjectForm button[type="submit"]');

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Сохранить проект';
    }
}

// Helper function for pluralization (example)
function getNoun(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) {
        return five;
    }
    n %= 10;
    if (n === 1) {
        return one;
    }
    if (n >= 2 && n <= 4) {
        return two;
    }
    return five;
}

function addEquipmentItemEventListeners() {
    document.querySelectorAll('.remove-equipment-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            if (!isNaN(index) && index >= 0 && index < selectedEquipment.length) {
                if (confirm(`Вы уверены, что хотите удалить "${selectedEquipment[index].name}" из проекта?`)) {
                    selectedEquipment.splice(index, 1);
                    updateEquipmentTable();
                    saveSessionData();
                    toast('Оборудование удалено из проекта', 'success');
                }
            }
        });
    });

    document.querySelectorAll('.quantity-increase-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            if (!isNaN(index) && index >= 0 && index < selectedEquipment.length) {
                const hasSerialNumber = button.closest('tr').getAttribute('data-has-serial-number') === 'true';

                if (!hasSerialNumber) {
                    selectedEquipment[index].quantity = (selectedEquipment[index].quantity || 1) + 1;
                    updateEquipmentTable();
                    saveSessionData();
                }
            }
        });
    });

    document.querySelectorAll('.quantity-decrease-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            if (!isNaN(index) && index >= 0 && index < selectedEquipment.length) {
                const hasSerialNumber = button.closest('tr').getAttribute('data-has-serial-number') === 'true';

                if (!hasSerialNumber && selectedEquipment[index].quantity > 1) {
                    selectedEquipment[index].quantity--;
                    updateEquipmentTable();
                    saveSessionData();
                }
            }
        });
    });

    // Initialize date pickers for equipment items
    $('.equipment-period-input').daterangepicker({
        autoUpdateInput: false,
        singleDatePicker: false, // Ensure it's a range picker
        locale: DATERANGEPICKER_LOCALE
    });

    // Handle date application for individual items
    $('.equipment-period-input').on('apply.daterangepicker', function(ev, picker) {
        const index = parseInt($(this).data('index'));
        if (!isNaN(index) && index >= 0 && index < selectedEquipment.length) {
            selectedEquipment[index].booking_start = picker.startDate.hour(0).minute(0).format('YYYY-MM-DDTHH:mm:ss');
            selectedEquipment[index].booking_end = picker.endDate.hour(23).minute(59).format('YYYY-MM-DDTHH:mm:ss');
            $(this).val(picker.startDate.format('DD.MM.YYYY') + ' - ' + picker.endDate.format('DD.MM.YYYY'));
            saveSessionData();
        }
    });

    // Handle date cancellation for individual items
    $('.equipment-period-input').on('cancel.daterangepicker', function(ev, picker) {
        const index = parseInt($(this).data('index'));
        if (!isNaN(index) && index >= 0 && index < selectedEquipment.length) {
            selectedEquipment[index].booking_start = null;
            selectedEquipment[index].booking_end = null;
            $(this).val('');
            saveSessionData();
        }
    });

    // Add listener for the "Apply Project Dates" button
    const applyDatesBtn = document.getElementById('applyProjectDatesBtn');
    if(applyDatesBtn) {
        applyDatesBtn.addEventListener('click', applyProjectDatesToAllItems);
    }
}

// New function to apply project dates to all equipment items
async function applyProjectDatesToAllItems() {
    const projectDateRangePicker = $('#projectDates').data('daterangepicker');
    if (!projectDateRangePicker || !projectDateRangePicker.startDate || !projectDateRangePicker.endDate) {
        toast('Сначала выберите период проекта', 'warning');
        return;
    }

    // Use full day hours 00:00-23:59 for bookings
    const projectStartDate = projectDateRangePicker.startDate.hour(0).minute(0).format('YYYY-MM-DDTHH:mm:ss');
    const projectEndDate = projectDateRangePicker.endDate.hour(23).minute(59).format('YYYY-MM-DDTHH:mm:ss');

    const equipmentItemsToCheck = [...selectedEquipment]; // Clone array

    if (equipmentItemsToCheck.length === 0) {
        toast('В проекте нет оборудования для применения дат', 'info');
        return;
    }

    showLoading();
    let conflictsFound = [];
    let checkedCount = 0;

    try {
        // Check availability for each item using existing GET endpoint
        for (const item of equipmentItemsToCheck) {
            const equipmentId = parseInt(item.id);
            if (isNaN(equipmentId)) continue; // Skip invalid items

            try {
                // Dates need to be in YYYY-MM-DD format for this GET endpoint params
                const startDateParam = projectDateRangePicker.startDate.format('YYYY-MM-DD');
                let endDateParam = projectDateRangePicker.endDate.format('YYYY-MM-DD');

                const isOneDay = startDateParam === endDateParam;

                if (isOneDay) {
                    const nextDay = moment(endDateParam).add(1, 'days').format('YYYY-MM-DD');
                    endDateParam = nextDay;
                }

                const availabilityResult = await api.get(`/equipment/${equipmentId}/availability`, {
                    start_date: startDateParam,
                    end_date: endDateParam
                });
                checkedCount++;

                if (availabilityResult && !availabilityResult.is_available) {
                    conflictsFound.push({
                        id: equipmentId,
                        name: item.name || `ID ${equipmentId}`,
                        conflicts: availabilityResult.conflicts || [] // Include conflict details if available
                    });
                }
            } catch (error) {
                // Handle errors for individual item checks (e.g., 404 if item not found on backend)
                console.error(`Error checking availability for equipment ID ${equipmentId}:`, error);
                conflictsFound.push({
                    id: equipmentId,
                    name: item.name || `ID ${equipmentId}`,
                    error: error.message || 'Ошибка проверки'
                });
            }
        }

        hideLoading(); // Hide loading after all checks

        if (conflictsFound.length > 0) {
            toast(`Найдены конфликты бронирования для ${conflictsFound.length} позиций.`, 'warning');

            displayConflictsInfo(conflictsFound, projectStartDate, projectEndDate);
        } else {
            // No conflicts, apply dates
            selectedEquipment.forEach((item, index) => {
                item.booking_start = projectStartDate; // Use full datetime format for saving
                item.booking_end = projectEndDate;
            });

            updateEquipmentTable(); // Re-render table with new dates
            saveSessionData();
            toast('Даты проекта успешно применены ко всем позициям', 'success');
            hideConflictsInfo();
        }

    } catch (error) {
        // Catch potential errors in the loop setup or general logic
        hideLoading();
        console.error('General error during availability check loop:', error);
        toast(`Произошла общая ошибка при проверке доступности: ${error.message}`, 'danger');
    }
}

/**
 * Отображает информацию о конфликтах бронирования в специальном разделе
 * @param {Array} conflicts - Список конфликтов
 * @param {string} requestedStartDate - Запрошенная дата начала
 * @param {string} requestedEndDate - Запрошенная дата окончания
 */
function displayConflictsInfo(conflicts, requestedStartDate, requestedEndDate) {
    let conflictsContainer = document.getElementById('conflictsInfoContainer');

    if (!conflictsContainer) {
        conflictsContainer = document.createElement('div');
        conflictsContainer.id = 'conflictsInfoContainer';
        conflictsContainer.className = 'alert alert-warning mt-3';

        const equipmentList = document.getElementById('equipmentList');
        if (equipmentList && equipmentList.parentNode) {
            equipmentList.parentNode.insertBefore(conflictsContainer, equipmentList.nextSibling);
        } else {
            const formElement = document.getElementById('newProjectForm');
            if (formElement) {
                formElement.appendChild(conflictsContainer);
            }
        }
    }

    const formattedStartDate = moment(requestedStartDate).format('DD.MM.YYYY');
    const formattedEndDate = moment(requestedEndDate).format('DD.MM.YYYY');

    let html = `
        <h5><i class="fas fa-exclamation-triangle"></i> Конфликты бронирования</h5>
        <p>Следующее оборудование не может быть забронировано на период ${formattedStartDate} - ${formattedEndDate}:</p>
        <ul class="list-group mb-3">
    `;

    conflicts.forEach(conflict => {
        html += `<li class="list-group-item">
            <strong>${conflict.name}</strong>`;

        if (conflict.error) {
            html += `<div class="text-danger small">Ошибка проверки: ${conflict.error}</div>`;
        } else if (conflict.conflicts && conflict.conflicts.length > 0) {
            html += `<div class="small mt-2">Конфликты с бронированиями:</div>
                <ul class="small">`;

            conflict.conflicts.forEach(c => {
                const conflictStart = moment(c.start_date).format('DD.MM.YYYY');
                const conflictEnd = moment(c.end_date).format('DD.MM.YYYY');
                html += `<li>Проект "${c.project_name || 'Без названия'}" (${conflictStart} - ${conflictEnd})</li>`;
            });

            html += `</ul>`;
        }

        html += `</li>`;
    });

    html += `</ul>
        <p>Пожалуйста, выберите другие даты или удалите конфликтующее оборудование из проекта.</p>
        <button type="button" class="btn btn-sm btn-outline-secondary" id="hideConflictsBtn">
            <i class="fas fa-times"></i> Скрыть информацию
        </button>
    `;

    conflictsContainer.innerHTML = html;

    document.getElementById('hideConflictsBtn').addEventListener('click', hideConflictsInfo);
}

/**
 * Hide conflict information
 */
function hideConflictsInfo() {
    const conflictsContainer = document.getElementById('conflictsInfoContainer');
    if (conflictsContainer) {
        conflictsContainer.remove();
    }
}

// Placeholder for modal opening function (if needed)
function openEquipmentPeriodModal(index) {
    const item = selectedEquipment[index];
    if (!item) return;

    const modalElement = document.getElementById('equipmentPeriodModal');
    const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);

    // Populate modal fields
    document.getElementById('editEquipmentId').value = item.id;
    document.getElementById('equipmentName').textContent = item.name;
    // document.getElementById('equipmentBarcode').textContent = item.barcode || '-'; // Assuming barcode exists

    const periodInput = $('#equipmentPeriod');
    periodInput.daterangepicker({
        autoUpdateInput: false,
        singleDatePicker: false,
        locale: DATERANGEPICKER_LOCALE,
        startDate: item.booking_start ? moment(item.booking_start) : moment(),
        endDate: item.booking_end ? moment(item.booking_end) : moment().add(1, 'day')
    });

    periodInput.on('apply.daterangepicker', function(ev, picker) {
        $(this).val(picker.startDate.format('DD.MM.YYYY') + ' - ' + picker.endDate.format('DD.MM.YYYY'));
    });
    periodInput.on('cancel.daterangepicker', function(ev, picker) {
        $(this).val('');
    });

    // Set initial value if dates exist
    if (item.booking_start && item.booking_end) {
        periodInput.data('daterangepicker').setStartDate(moment(item.booking_start));
        periodInput.data('daterangepicker').setEndDate(moment(item.booking_end));
        periodInput.val(moment(item.booking_start).format('DD.MM.YYYY') + ' - ' + moment(item.booking_end).format('DD.MM.YYYY'));
    } else {
        periodInput.val('');
    }

    // Handle save button click within modal
    const saveBtn = document.getElementById('saveEquipmentPeriodBtn');
    // Clone and replace to remove previous listeners
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.addEventListener('click', () => {
        const picker = periodInput.data('daterangepicker');
        if (picker && picker.startDate && picker.endDate) {
            selectedEquipment[index].booking_start = picker.startDate.hour(0).minute(0).format('YYYY-MM-DDTHH:mm:ss');
            selectedEquipment[index].booking_end = picker.endDate.hour(23).minute(59).format('YYYY-MM-DDTHH:mm:ss');
            updateEquipmentTable();
            saveSessionData();
            modal.hide();
        } else {
            toast('Выберите период бронирования', 'warning');
        }
    });

    modal.show();
}
