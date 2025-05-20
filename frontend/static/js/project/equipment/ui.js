/**
 * Equipment UI functionality
 */

import { formatDate, DATERANGEPICKER_LOCALE } from '../../utils/common.js';
import { checkEquipmentAvailability, initializeBookingPeriodPickers } from './availability.js';
import { handleQuantityIncrease, handleQuantityDecrease, handleBookingRemoval } from './booking.js';
import { currentPage, totalPages, pageSize, totalCount } from './search.js';

/**
 * Display search results
 * @param {Array} results - Equipment search results
 */
export function displaySearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;

    if (!results || results.length === 0) {
        resultsContainer.innerHTML = '<div class="alert alert-info">Оборудование не найдено</div>';
        const addToProjectBtn = document.getElementById('addToProjectBtn');
        if (addToProjectBtn) {
            addToProjectBtn.disabled = true;
        }
        return;
    }

    let html = '<div class="list-group">';

    results.forEach(item => {
        const isAvailable = item.availability ? item.availability.is_available : true;
        const statusClass = isAvailable ? 'success' : 'danger';
        const statusText = isAvailable ? 'Доступно' : 'Недоступно';

        html += `
            <div class="list-group-item list-group-item-action equipment-item d-flex justify-content-between align-items-center"
                 data-equipment-id="${item.id}"
                 data-equipment-name="${item.name}"
                 data-equipment-barcode="${item.barcode}"
                 data-equipment-serial="${item.serial_number || ''}"
                 data-equipment-category="${item.category ? item.category.name : 'Без категории'}"
                 data-equipment-available="${isAvailable}">
                <div>
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${item.name}</h5>
                    </div>
                    <small>${item.barcode}</small>
                    ${item.serial_number ? `<br><small>S/N: ${item.serial_number}</small>` : ''}
                </div>
                <span class="badge bg-${statusClass}">${statusText}</span>
            </div>
        `;
    });

    html += '</div>';
    resultsContainer.innerHTML = html;

    document.querySelectorAll('.equipment-item').forEach(item => {
        item.addEventListener('click', selectEquipment);
    });
}

/**
 * Update pagination UI
 */
export function updatePaginationUI() {
    const paginationElement = document.getElementById('catalogPagination');
    const pageStartElement = document.getElementById('catalogPageStart');
    const pageEndElement = document.getElementById('catalogPageEnd');
    const totalItemsElement = document.getElementById('catalogTotalItems');
    const prevPageButton = document.getElementById('catalogPrevPage');
    const nextPageButton = document.getElementById('catalogNextPage');

    if (!paginationElement) return;

    if (totalCount > 0) {
        paginationElement.classList.remove('d-none');
        const startItem = (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalCount);

        if (pageStartElement) pageStartElement.textContent = startItem;
        if (pageEndElement) pageEndElement.textContent = endItem;
        if (totalItemsElement) totalItemsElement.textContent = totalCount;

        if (prevPageButton) {
            prevPageButton.parentElement.classList.toggle('disabled', currentPage <= 1);
        }
        if (nextPageButton) {
            nextPageButton.parentElement.classList.toggle('disabled', currentPage >= totalPages);
        }
    } else {
        paginationElement.classList.add('d-none');
    }
}

/**
 * Select equipment from results
 * @param {Event} event - Click event
 */
export function selectEquipment(event) {
    document.querySelectorAll('.equipment-item.selected').forEach(item => {
        item.classList.remove('selected', 'bg-light');
    });

    const selectedItem = event.currentTarget;
    selectedItem.classList.add('selected', 'bg-light');

    const isAvailable = selectedItem.dataset.equipmentAvailable === 'true';
    const addToProjectBtn = document.getElementById('addToProjectBtn');
    if (addToProjectBtn) {
        addToProjectBtn.disabled = !isAvailable;
    }

    showEquipmentDetails(selectedItem.dataset);

    const equipmentId = selectedItem.dataset.equipmentId;
    const dateRange = document.getElementById('newBookingPeriod');
    if (!dateRange) return;

    const dates = $(dateRange).data('daterangepicker');
    if (!dates) return;

    const startDate = dates.startDate.format('YYYY-MM-DD');
    const endDate = dates.endDate.format('YYYY-MM-DD');

    checkEquipmentAvailability(equipmentId, startDate, endDate);
}

/**
 * Show equipment details
 * @param {Object} equipmentData - Equipment data
 */
export function showEquipmentDetails(equipmentData) {
    const detailsCard = document.getElementById('equipmentDetailsCard');
    if (!detailsCard) return;

    const nameElement = document.getElementById('selectedEquipmentName');
    if (nameElement) nameElement.textContent = equipmentData.equipmentName;

    const categoryElement = document.getElementById('selectedEquipmentCategory');
    if (categoryElement) categoryElement.textContent = equipmentData.equipmentCategory;

    const barcodeElement = document.getElementById('selectedEquipmentBarcode');
    if (barcodeElement) barcodeElement.textContent = equipmentData.equipmentBarcode;

    const serialContainer = document.getElementById('selectedEquipmentSerialContainer');
    const serialElement = document.getElementById('selectedEquipmentSerial');

    if (serialContainer && serialElement && equipmentData.equipmentSerial) {
        serialElement.textContent = equipmentData.equipmentSerial;
        serialContainer.style.display = 'flex';
    } else if (serialContainer) {
        serialContainer.style.display = 'none';
    }

    const availabilityElement = document.getElementById('selectedEquipmentAvailability');
    if (availabilityElement) {
        const isAvailable = equipmentData.equipmentAvailable === 'true';
        availabilityElement.textContent = isAvailable ? 'Доступно' : 'Недоступно';
        availabilityElement.className = isAvailable ? 'text-success' : 'text-danger';
    }

    const conflictsContainer = document.getElementById('conflictsContainer');
    if (conflictsContainer) {
        conflictsContainer.style.display = 'none';
    }

    detailsCard.style.display = 'block';
}

/**
 * Hide equipment details
 */
export function hideEquipmentDetails() {
    const detailsCard = document.getElementById('equipmentDetailsCard');
    if (detailsCard) {
        detailsCard.style.display = 'none';
    }
}

/**
 * Reset equipment selection state
 */
export function resetEquipmentSelection() {
    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput) searchInput.value = '';

    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) barcodeInput.value = '';

    const quantityInput = document.getElementById('newBookingQuantity');
    if (quantityInput) quantityInput.value = '1';

    const searchResults = document.getElementById('searchResults');
    if (searchResults) searchResults.innerHTML = '';

    const addToProjectBtn = document.getElementById('addToProjectBtn');
    if (addToProjectBtn) addToProjectBtn.disabled = true;

    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) categoryFilter.value = '';

    const dateRangeInput = document.getElementById('newBookingPeriod');
    if (dateRangeInput) {
        const projectStartDateValue = document.getElementById('project-start-date')?.value;
        const projectEndDateValue = document.getElementById('project-end-date')?.value;

        let startDate = moment(); // Default to today
        let endDate = moment().add(1, 'days'); // Default to tomorrow

        if (projectStartDateValue && projectEndDateValue) {
            const parsedProjectStartDate = moment(projectStartDateValue);
            const parsedProjectEndDate = moment(projectEndDateValue);

            if (parsedProjectStartDate.isValid() && parsedProjectEndDate.isValid()) {
                startDate = parsedProjectStartDate;
                endDate = parsedProjectEndDate;
            } else {
                console.warn('Could not parse project dates for newBookingPeriod:', projectStartDateValue, projectEndDateValue);
            }
        }

        $(dateRangeInput).val(startDate.format('DD.MM.YYYY') + ' - ' + endDate.format('DD.MM.YYYY'));

        if ($(dateRangeInput).data('daterangepicker')) {
            const picker = $(dateRangeInput).data('daterangepicker');
            picker.setStartDate(startDate);
            picker.setEndDate(endDate);
        } else {
            $(dateRangeInput).daterangepicker({
                locale: DATERANGEPICKER_LOCALE,
                startDate: startDate,
                endDate: endDate,
            });
        }

        // Remove potentially problematic auto-adjusting logic for this specific picker
        $(dateRangeInput).off('apply.daterangepicker').on('apply.daterangepicker', function(ev, picker) {
            $(this).val(picker.startDate.format('DD.MM.YYYY') + ' - ' + picker.endDate.format('DD.MM.YYYY'));
        });
    }

    hideEquipmentDetails();
}

/**
 * Show equipment add zone
 */
export function showAddEquipmentZone() {
    const equipmentAddZone = document.getElementById('equipmentAddZone');
    if (equipmentAddZone) {
        equipmentAddZone.style.display = 'block';
    }
    resetEquipmentSelection();
}

/**
 * Hide equipment add zone
 */
export function hideAddEquipmentZone() {
    const equipmentAddZone = document.getElementById('equipmentAddZone');
    if (equipmentAddZone) {
        equipmentAddZone.style.display = 'none';
    }
}

/**
 * Render equipment section
 * @param {Object} project - Project data containing bookings
 */
export function renderEquipmentSection(project) {
    const equipmentList = document.getElementById('equipmentList');
    const equipmentCount = document.getElementById('equipmentCount');
    const tableHeaders = document.querySelector('.table thead');

    // Hide table headers for more intuitive interface
    if (tableHeaders) {
        tableHeaders.style.display = 'none';
    }

    // Check for DOM elements
    if (!equipmentList) {
        console.warn('Equipment list element not found');
        return;
    }

    // Check for bookings array
    if (!project || !project.bookings) {
        console.warn('Project bookings data is missing:', project);
        // Clear equipment list
        equipmentList.innerHTML = '<tr><td colspan="4" class="text-center">Нет данных об оборудовании</td></tr>';

        // Update equipment count
        if (equipmentCount) {
            equipmentCount.textContent = '0 позиций';
        }
        return;
    }

    // Debug output
    console.log('Rendering equipment section with bookings:', project.bookings);

    // Sort equipment by name
    project.bookings.sort((a, b) => {
        const nameA = (a.equipment?.name || a.equipment_name || '').toLowerCase();
        const nameB = (b.equipment?.name || b.equipment_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
    console.log('Sorted bookings:', project.bookings.map(b => b.equipment?.name || b.equipment_name));

    // Update equipment count
    if (equipmentCount) {
        equipmentCount.textContent = `${project.bookings.length} позиций`;
    }

    // Clear current list
    equipmentList.innerHTML = '';

    // If no bookings, show message
    if (project.bookings.length === 0) {
        equipmentList.innerHTML = '<tr><td colspan="4" class="text-center">Нет оборудования в проекте</td></tr>';
        return;
    }

    // Add each booking to the list
    project.bookings.forEach(booking => {
        // Validate booking data
        if (!booking) {
            console.warn('Invalid booking data: null or undefined');
            return;
        }

        // Detailed logging of booking structure
        console.log('Booking data structure:', JSON.stringify(booking, null, 2));

        const equipmentName = booking.equipment_name || 'Неизвестное оборудование';
        const barcode = booking.barcode || '';
        const category_name = booking.category_name || 'Без категории';
        const serialNumber = booking.serial_number || '';

        const serialNumberStr = String(serialNumber || '');
        const hasSerialNumber = serialNumberStr.trim().length > 0;

        const quantity = booking.quantity || 1;

        const row = document.createElement('tr');
        row.dataset.bookingId = booking.id;
        row.dataset.hasSerialNumber = hasSerialNumber;

        const nameCell = document.createElement('td');
        nameCell.innerHTML = `
            <div>${equipmentName}</div>
            <small class="text-muted">${barcode}</small>
            ${serialNumber ? `<small class="text-muted d-block">S/N: ${serialNumber}</small>` : ''}
        `;

        const categoryCell = document.createElement('td');
        categoryCell.innerHTML = `
            <div>${category_name}</div>
        `;

        const periodCell = document.createElement('td');
        periodCell.innerHTML = `
            <input type="text" class="form-control form-control-sm booking-period-input"
                   data-booking-id="${booking.id}"
                   value="${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}"
                   placeholder="ДД.ММ.ГГГГ - ДД.ММ.ГГГГ">
        `;

        const quantityCell = document.createElement('td');
        quantityCell.className = 'text-center quantity';
        quantityCell.style.width = '70px';
        quantityCell.innerHTML = `${quantity}`;

        const actionsCell = document.createElement('td');
        actionsCell.className = 'text-center';
        actionsCell.style.width = '120px';

        // Just for debugging, add dataset attribute to show what our JavaScript thinks
        actionsCell.dataset.hasSerialNumberJs = hasSerialNumber;

        // Logic for displaying buttons by example of scanner
        if (hasSerialNumber) {
            // For equipment with a serial number only the delete button
            actionsCell.innerHTML = `
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-danger remove-booking-btn" title="Удалить">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        } else {
            // For equipment without a serial number: + and - button or x in depending on the quantity
            let secondButtonHtml;
            if (quantity > 1) {
                // If the quantity is greater than 1, show the decrease button
                secondButtonHtml = `
                    <button class="btn btn-outline-secondary quantity-decrease-btn" title="Уменьшить кол-во">
                        <i class="fas fa-minus"></i>
                    </button>
                `;
            } else {
                // If the quantity is 1, show the delete button
                secondButtonHtml = `
                    <button class="btn btn-outline-danger remove-booking-btn" title="Удалить">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }

            // Always show the increase quantity button
            actionsCell.innerHTML = `
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-secondary quantity-increase-btn" title="Increase quantity">
                        <i class="fas fa-plus"></i>
                    </button>
                    ${secondButtonHtml}
                </div>
            `;
        }

        row.appendChild(nameCell);
        row.appendChild(categoryCell);
        row.appendChild(periodCell);
        row.appendChild(quantityCell);
        row.appendChild(actionsCell);

        equipmentList.appendChild(row);
    });

    // Reinitialize booking period pickers
    initializeBookingPeriodPickers();

    // Add event listeners for quantity buttons
    document.querySelectorAll('.quantity-increase-btn').forEach(btn => {
        btn.addEventListener('click', handleQuantityIncrease);
    });

    document.querySelectorAll('.quantity-decrease-btn').forEach(btn => {
        btn.addEventListener('click', handleQuantityDecrease);
    });

    // Add event listeners for remove booking buttons
    document.querySelectorAll('.remove-booking-btn').forEach(btn => {
        btn.addEventListener('click', handleBookingRemoval);
    });
}
