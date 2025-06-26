/**
 * Cart Integration Module for Equipment Search
 *
 * Handles multi-selection, bulk operations, and cart integration
 * for the equipment search functionality.
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

// Removed import - will use global showToast function

// State for multi-selection
let selectedEquipmentIds = new Set();

/**
 * Add multi-selection controls to search results container
 * @param {number} selectedCount - Current number of selected items
 * @returns {string} HTML for controls
 */
function generateMultiSelectionControls(selectedCount = 0) {
    return `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="selectAllCheckbox">
                <label class="form-check-label" for="selectAllCheckbox">
                    Выбрать все на странице
                </label>
            </div>
            <div id="cartControls" style="display: none;">
                <span id="selectedCount" class="text-muted me-3">Выбрано: ${selectedCount}</span>
                <button id="addSelectedToCartBtn" class="btn btn-primary btn-sm" disabled>
                    <i class="fas fa-shopping-cart"></i> Добавить в корзину
                </button>
            </div>
        </div>
    `;
}

/**
 * Generate equipment item HTML with checkbox
 * @param {Object} item - Equipment item data
 * @returns {string} HTML for equipment item
 */
function generateEquipmentItemWithCheckbox(item) {
    const isAvailable = item.availability ? item.availability.is_available : true;
    const statusClass = isAvailable ? 'success' : 'danger';
    const statusText = isAvailable ? 'Доступно' : 'Недоступно';
    const isSelected = selectedEquipmentIds.has(item.id.toString());

    return `
        <div class="list-group-item list-group-item-action equipment-item d-flex justify-content-between align-items-center ${isSelected ? 'selected bg-light' : ''}"
             data-equipment-id="${item.id}"
             data-equipment-name="${item.name}"
             data-equipment-barcode="${item.barcode}"
             data-equipment-serial="${item.serial_number || ''}"
             data-equipment-category="${item.category ? item.category.name : 'Без категории'}"
             data-equipment-available="${isAvailable}">
            <div class="d-flex align-items-center">
                <div class="form-check me-3">
                    <input class="form-check-input equipment-checkbox"
                           type="checkbox"
                           id="equipment_${item.id}"
                           data-equipment-id="${item.id}"
                           ${isSelected ? 'checked' : ''}
                           ${!isAvailable ? 'disabled' : ''}>
                </div>
                <div>
                    <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">${item.name}</h5>
                    </div>
                    <small>${item.barcode}</small>
                    ${item.serial_number ? `<br><small>S/N: ${item.serial_number}</small>` : ''}
                </div>
            </div>
            <span class="badge bg-${statusClass}">${statusText}</span>
        </div>
    `;
}

/**
 * Setup event listeners for checkboxes and cart controls
 */
function setupCartIntegrationEventListeners() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const equipmentCheckboxes = document.querySelectorAll('.equipment-checkbox');
    const addSelectedToCartBtn = document.getElementById('addSelectedToCartBtn');

    // Select all checkbox handler
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            equipmentCheckboxes.forEach(checkbox => {
                if (!checkbox.disabled) {
                    checkbox.checked = isChecked;
                    const equipmentId = checkbox.dataset.equipmentId;
                    if (isChecked) {
                        selectedEquipmentIds.add(equipmentId);
                    } else {
                        selectedEquipmentIds.delete(equipmentId);
                    }
                }
            });
            updateCartControlsVisibility();
            updateSelectAllState();
        });
    }

    // Individual checkbox handlers
    equipmentCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const equipmentId = e.target.dataset.equipmentId;
            if (e.target.checked) {
                selectedEquipmentIds.add(equipmentId);
            } else {
                selectedEquipmentIds.delete(equipmentId);
            }
            updateCartControlsVisibility();
            updateSelectAllState();
        });
    });

    // Add to cart button handler
    if (addSelectedToCartBtn) {
        addSelectedToCartBtn.addEventListener('click', async () => {
            await addSelectedEquipmentToCart();
        });
    }
}

/**
 * Update the state of "Select All" checkbox
 */
function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const availableCheckboxes = document.querySelectorAll('.equipment-checkbox:not(:disabled)');

    if (!selectAllCheckbox || availableCheckboxes.length === 0) return;

    const checkedCount = Array.from(availableCheckboxes).filter(cb => cb.checked).length;

    if (checkedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedCount === availableCheckboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
        selectAllCheckbox.checked = false;
    }
}

/**
 * Update cart controls visibility and state
 */
function updateCartControlsVisibility() {
    const cartControls = document.getElementById('cartControls');
    const selectedCount = document.getElementById('selectedCount');
    const addSelectedToCartBtn = document.getElementById('addSelectedToCartBtn');

    const count = selectedEquipmentIds.size;

    if (cartControls && selectedCount && addSelectedToCartBtn) {
        if (count > 0) {
            cartControls.style.display = 'block';
            selectedCount.textContent = `Выбрано: ${count}`;
            addSelectedToCartBtn.disabled = false;
        } else {
            cartControls.style.display = 'none';
            addSelectedToCartBtn.disabled = true;
        }
    }
}

/**
 * Hide cart controls
 */
function hideCartControls() {
    const cartControls = document.getElementById('cartControls');
    if (cartControls) {
        cartControls.style.display = 'none';
    }
    selectedEquipmentIds.clear();
}

/**
 * Add selected equipment to cart
 */
async function addSelectedEquipmentToCart() {
    if (selectedEquipmentIds.size === 0) return;

    try {
        // Use global universalCart instance
        if (!window.universalCart) {
            console.error('Universal Cart instance not found');
            showToast('Корзина не загружена', 'danger');
            return;
        }

        const successfullyAdded = [];
        const errors = [];

        // Get all selected equipment from the page
        for (const equipmentId of selectedEquipmentIds) {
            const equipmentElement = document.querySelector(`[data-equipment-id="${equipmentId}"]`);
            if (!equipmentElement) {
                errors.push(`Оборудование ${equipmentId} не найдено`);
                continue;
            }

            // Extract equipment data from DOM element
            const equipmentData = {
                id: equipmentId,
                name: equipmentElement.dataset.equipmentName || '',
                barcode: equipmentElement.dataset.equipmentBarcode || '',
                serial_number: equipmentElement.dataset.equipmentSerial || '',
                category: equipmentElement.dataset.equipmentCategory || 'Без категории',
                quantity: 1, // Default quantity
                available: equipmentElement.dataset.equipmentAvailable === 'true'
            };

            // Check availability
            if (!equipmentData.available) {
                errors.push(`${equipmentData.name} недоступно`);
                continue;
            }

            // Add to cart
            const success = await window.universalCart.addItem(equipmentData);
            if (success) {
                successfullyAdded.push(equipmentData.name);
            } else {
                errors.push(`Не удалось добавить ${equipmentData.name}`);
            }
        }

        // Show results
        if (successfullyAdded.length > 0) {
            showToast(`Добавлено ${successfullyAdded.length} позиций в корзину`, 'success');
        }

        if (errors.length > 0) {
            console.warn('Cart addition errors:', errors);
            showToast(`Ошибки: ${errors.join(', ')}`, 'warning');
        }

        // Clear selection after adding
        clearSelection();

    } catch (error) {
        console.error('Error adding equipment to cart:', error);
        showToast('Ошибка добавления в корзину', 'danger');
    }
}

/**
 * Clear current selection
 */
function clearSelection() {
    selectedEquipmentIds.clear();
    const checkboxes = document.querySelectorAll('.equipment-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
    updateCartControlsVisibility();
}

/**
 * Get current selection count
 * @returns {number} Number of selected items
 */
function getSelectionCount() {
    return selectedEquipmentIds.size;
}

/**
 * Get selected equipment IDs
 * @returns {Set} Set of selected equipment IDs
 */
function getSelectedEquipmentIds() {
    return new Set(selectedEquipmentIds);
}

/**
 * Initialize cart integration for equipment search
 * This is the main entry point for setting up cart functionality
 */
function initializeCartIntegration() {
    console.log('[CartIntegration] Initializing cart integration for equipment search');

    // Setup event listeners will be called after search results are rendered
    // This function serves as a marker for initialization

    return {
        generateMultiSelectionControls,
        generateEquipmentItemWithCheckbox,
        setupCartIntegrationEventListeners,
        updateCartControlsVisibility,
        hideCartControls,
        clearSelection,
        getSelectionCount
    };
}

/**
 * Toggle equipment selection in search results
 * @param {HTMLElement} checkbox - Equipment checkbox
 */
function toggleEquipmentSelection(checkbox) {
    try {
        const row = checkbox.closest('tr');
        if (!row) return;

        const equipmentId = parseInt(row.dataset.equipmentId);
        const isChecked = checkbox.checked;

        if (isChecked) {
            // Add visual selection
            row.classList.add('table-info');

            // Extract equipment data
            const equipmentData = extractEquipmentDataFromRow(row);

            // Add to cart
            addToCartFromSelection(equipmentData);
        } else {
            // Remove visual selection
            row.classList.remove('table-info');

            // Remove from cart
            removeFromCartByEquipmentId(equipmentId);
        }

    } catch (error) {
        console.error('[CartIntegration] Toggle selection failed:', error);
        showToast('Ошибка при выборе оборудования', 'danger');
    }
}

/**
 * Extract equipment data from table row
 * @param {HTMLElement} row - Table row element
 * @returns {Object} Equipment data
 */
function extractEquipmentDataFromRow(row) {
    return {
        id: row.dataset.equipmentId,
        name: row.dataset.equipmentName || row.querySelector('a')?.textContent || 'Неизвестное оборудование',
        barcode: row.dataset.equipmentBarcode || '',
        serial_number: row.dataset.equipmentSerial || '',
        category: row.dataset.equipmentCategory || 'Без категории',
        quantity: 1,
        available: row.dataset.equipmentAvailable !== 'false'
    };
}

/**
 * Add equipment to cart from selection
 * @param {Object} equipmentData - Equipment data
 */
async function addToCartFromSelection(equipmentData) {
    if (!window.universalCart) {
        console.error('Universal Cart not available');
        return;
    }

    try {
        const success = await window.universalCart.addItem(equipmentData);
        if (!success) {
            console.warn('Failed to add item to cart:', equipmentData.name);
        }
    } catch (error) {
        console.error('Error adding to cart from selection:', error);
    }
}

/**
 * Remove equipment from cart by ID
 * @param {number} equipmentId - Equipment ID
 */
async function removeFromCartByEquipmentId(equipmentId) {
    if (!window.universalCart) {
        console.error('Universal Cart not available');
        return;
    }

    try {
        // Find item key by equipment ID
        const items = window.universalCart.getItems();
        const itemToRemove = items.find(item => item.id == equipmentId);

        if (itemToRemove) {
            // Generate the same key that would be used internally
            const itemKey = `${itemToRemove.id}_${itemToRemove.barcode || ''}`;
            await window.universalCart.removeItem(itemKey);
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
    }
}

/**
 * Execute cart action (add items to project/booking)
 * @param {Object} options - Action options
 */
async function executeCartAction(options = {}) {
    try {
        // Check if Universal Cart is available
        if (!window.universalCart) {
            console.error('[CartIntegration] Universal Cart not available');
            showToast('Корзина не загружена', 'danger');
            return false;
        }

        const cart = window.universalCart;
        const items = cart.getItems();

        if (items.length === 0) {
            showToast('Корзина пуста', 'warning');
            return false;
        }

        // Get project and booking data
        const projectData = getProjectDataFromPage();
        const bookingDates = getBookingDatesFromPage();

        if (!projectData.projectId) {
            showToast('Не удалось найти ID проекта', 'danger');
            return false;
        }

        // Execute cart action using cart's executeAction method
        const actionConfig = {
            type: 'add_to_project',
            projectId: projectData.projectId,
            clientId: projectData.clientId,
            startDate: bookingDates.startDate,
            endDate: bookingDates.endDate,
            ...options
        };

        const result = await cart.executeAction(actionConfig);

        if (result.success) {
            showToast(`Успешно добавлено ${result.processedItems} позиций в проект`, 'success');

            // Clear cart after successful action
            await cart.clear();

            // Reload page to show updated equipment list
            setTimeout(() => {
                window.location.reload();
            }, 1000);

            return true;
        } else {
            showToast(`Ошибка: ${result.error}`, 'danger');
            return false;
        }

    } catch (error) {
        console.error('[CartIntegration] Execute action failed:', error);
        showToast('Ошибка выполнения действия', 'danger');
        return false;
    }
}

/**
 * Get project data from current page
 * @returns {Object}
 */
function getProjectDataFromPage() {
    try {
        // Try to get project ID from URL
        const urlMatch = window.location.pathname.match(/\/projects\/(\d+)/);
        const projectId = urlMatch ? parseInt(urlMatch[1]) : null;

        // Try to get client ID from project data
        let clientId = null;
        if (window.projectData && window.projectData.client_id) {
            clientId = window.projectData.client_id;
        } else if (window.projectData && window.projectData.client && window.projectData.client.id) {
            clientId = window.projectData.client.id;
        }

        return {
            projectId,
            clientId
        };

    } catch (error) {
        console.error('[CartIntegration] Failed to get project data:', error);
        return {
            projectId: null,
            clientId: null
        };
    }
}

/**
 * Get booking dates from current page
 * @returns {Object}
 */
function getBookingDatesFromPage() {
    try {
        // Try to get dates from daterangepicker
        const dateRangeInput = document.getElementById('newBookingPeriod');
        if (dateRangeInput && $(dateRangeInput).data('daterangepicker')) {
            const picker = $(dateRangeInput).data('daterangepicker');
            return {
                startDate: picker.startDate.format('YYYY-MM-DDTHH:mm:ss'),
                endDate: picker.endDate.format('YYYY-MM-DDTHH:mm:ss')
            };
        }

        // Fallback: try to find date inputs
        const startDateInput = document.querySelector('input[name="start_date"], #startDate');
        const endDateInput = document.querySelector('input[name="end_date"], #endDate');

        if (startDateInput && endDateInput) {
            return {
                startDate: startDateInput.value,
                endDate: endDateInput.value
            };
        }

        return {
            startDate: null,
            endDate: null
        };

    } catch (error) {
        console.error('[CartIntegration] Failed to get booking dates:', error);
        return {
            startDate: null,
            endDate: null
        };
    }
}

/**
 * Clear search selection
 */
function clearSearchSelection() {
    try {
        // Clear all checkboxes
        const checkboxes = document.querySelectorAll('.equipment-checkbox:checked');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const row = checkbox.closest('tr');
            if (row) {
                row.classList.remove('table-info');
            }
        });

        // Update bulk selection checkbox
        const bulkCheckbox = document.getElementById('bulkSelectCheckbox');
        if (bulkCheckbox) {
            bulkCheckbox.checked = false;
        }

    } catch (error) {
        console.error('[CartIntegration] Failed to clear selection:', error);
    }
}

/**
 * Handle cart action button click
 * @param {Event} event - Click event
 */
async function handleCartActionClick(event) {
    event.preventDefault();

    const button = event.target.closest('button');
    if (button) {
        button.disabled = true;
    }

    try {
        await executeCartAction();
    } finally {
        if (button) {
            button.disabled = false;
        }
    }
}

/**
 * Initialize cart action integration
 */
function initCartActionIntegration() {
    try {
        // Add action button to cart UI if not already present
        const addActionButton = () => {
            const cartContainer = document.getElementById('universal-cart-container');
            if (!cartContainer) return;

            // Check if button already exists
            if (cartContainer.querySelector('.cart-action-btn')) return;

            // Create action button
            const actionButton = document.createElement('button');
            actionButton.className = 'btn btn-primary cart-action-btn mt-2 w-100';
            actionButton.innerHTML = '<i class="fas fa-plus"></i> Добавить в проект';
            actionButton.addEventListener('click', handleCartActionClick);

            // Add to cart header or footer
            const cartBody = cartContainer.querySelector('.cart-body');
            if (cartBody) {
                cartBody.appendChild(actionButton);
            }
        };

        // Add button when cart is shown
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const cartContainer = document.getElementById('universal-cart-container');
                    if (cartContainer && !cartContainer.classList.contains('d-none')) {
                        addActionButton();
                    }
                }
            });
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Try to add button immediately if cart is already visible
        setTimeout(addActionButton, 100);

        console.log('[CartIntegration] Action integration initialized');

    } catch (error) {
        console.error('[CartIntegration] Failed to initialize action integration:', error);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartActionIntegration);
} else {
    initCartActionIntegration();
}

// Global exports for browser usage
if (typeof window !== 'undefined') {
    window.generateMultiSelectionControls = generateMultiSelectionControls;
    window.generateEquipmentItemWithCheckbox = generateEquipmentItemWithCheckbox;
    window.setupCartIntegrationEventListeners = setupCartIntegrationEventListeners;
    window.updateSelectAllState = updateSelectAllState;
    window.updateCartControlsVisibility = updateCartControlsVisibility;
    window.hideCartControls = hideCartControls;
    window.addSelectedEquipmentToCart = addSelectedEquipmentToCart;
    window.clearSelection = clearSelection;
    window.getSelectionCount = getSelectionCount;
    window.getSelectedEquipmentIds = getSelectedEquipmentIds;
    window.initializeCartIntegration = initializeCartIntegration;
    window.toggleEquipmentSelection = toggleEquipmentSelection;
    window.executeCartAction = executeCartAction;
    window.handleCartActionClick = handleCartActionClick;
    window.initCartActionIntegration = initCartActionIntegration;
}

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateMultiSelectionControls,
        generateEquipmentItemWithCheckbox,
        setupCartIntegrationEventListeners,
        updateSelectAllState,
        updateCartControlsVisibility,
        hideCartControls,
        addSelectedEquipmentToCart,
        clearSelection,
        getSelectionCount,
        getSelectedEquipmentIds,
        initializeCartIntegration,
        toggleEquipmentSelection,
        executeCartAction,
        handleCartActionClick,
        initCartActionIntegration
    };
}
