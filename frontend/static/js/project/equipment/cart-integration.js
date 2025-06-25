/**
 * Cart Integration Module for Equipment Search
 *
 * Handles multi-selection, bulk operations, and cart integration
 * for the equipment search functionality.
 *
 * @author ACT-Rental Team
 * @created 2025-06-23
 */

import { showToast } from '../../utils/common.js';

// State for multi-selection
let selectedEquipmentIds = new Set();

/**
 * Add multi-selection controls to search results container
 * @param {number} selectedCount - Current number of selected items
 * @returns {string} HTML for controls
 */
export function generateMultiSelectionControls(selectedCount = 0) {
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
export function generateEquipmentItemWithCheckbox(item) {
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
export function setupCartIntegrationEventListeners() {
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
export function updateSelectAllState() {
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
export function updateCartControlsVisibility() {
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
export function hideCartControls() {
    const cartControls = document.getElementById('cartControls');
    if (cartControls) {
        cartControls.style.display = 'none';
    }
    selectedEquipmentIds.clear();
}

/**
 * Add selected equipment to cart
 */
export async function addSelectedEquipmentToCart() {
    if (selectedEquipmentIds.size === 0) return;

    try {
        // Dynamic import to avoid circular dependencies
        const { UniversalCart } = await import('../../universal-cart/universal-cart.js');

        // Get cart configuration
        const ADD_EQUIPMENT_CONFIG = {
            type: 'equipment_add',
            maxItems: 100,
            enableStorage: true,
            autoSave: true,
            debug: false
        };

        // Initialize or get existing cart
        if (!window.universalCart) {
            window.universalCart = new UniversalCart(ADD_EQUIPMENT_CONFIG);
        }

        const cart = window.universalCart;
        let addedCount = 0;
        let failedCount = 0;

        // Add each selected item to cart
        for (const equipmentId of selectedEquipmentIds) {
            const equipmentItem = document.querySelector(`[data-equipment-id="${equipmentId}"]`);
            if (!equipmentItem) continue;

            const itemData = {
                id: parseInt(equipmentId),
                name: equipmentItem.dataset.equipmentName,
                barcode: equipmentItem.dataset.equipmentBarcode,
                serial_number: equipmentItem.dataset.equipmentSerial || null,
                category: equipmentItem.dataset.equipmentCategory,
                quantity: 1,
                addedAt: new Date().toISOString()
            };

            const success = await cart.addItem(itemData);
            if (success) {
                addedCount++;
            } else {
                failedCount++;
            }
        }

        // Show result notification
        if (failedCount === 0) {
            showToast(`Добавлено ${addedCount} позиций в корзину`, 'success');
        } else if (addedCount === 0) {
            showToast(`Не удалось добавить ни одной позиции`, 'danger');
        } else {
            showToast(`Добавлено ${addedCount} из ${selectedEquipmentIds.size} позиций`, 'warning');
        }

        // Clear selection after successful add
        if (addedCount > 0) {
            clearSelection();
        }

        // Show cart UI if available
        if (cart.ui) {
            cart.ui.show();
        }

    } catch (error) {
        console.error('Failed to add selected equipment to cart:', error);
        showToast('Ошибка при добавлении в корзину', 'danger');
    }
}

/**
 * Clear current selection
 */
export function clearSelection() {
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
export function getSelectionCount() {
    return selectedEquipmentIds.size;
}

/**
 * Get selected equipment IDs
 * @returns {Set} Set of selected equipment IDs
 */
export function getSelectedEquipmentIds() {
    return new Set(selectedEquipmentIds);
}

/**
 * Initialize cart integration for equipment search
 * This is the main entry point for setting up cart functionality
 */
export function initializeCartIntegration() {
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
