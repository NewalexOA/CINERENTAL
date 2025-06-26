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
window.addCartToProject = function() {
    if (window.universalCart) {
        const items = window.universalCart.getItems();
        if (items.length === 0) {
            showNotification('warning', 'Корзина пуста');
            return;
        }

        // Process each item and add to project
        items.forEach(item => {
            // Create booking for the item
            const bookingData = {
                equipment_id: item.id,
                quantity: item.quantity || 1,
                start_date: getCurrentProjectStartDate(),
                end_date: getCurrentProjectEndDate()
            };

            // Add to project using existing functionality
            addEquipmentToProject(bookingData);
        });

        // Clear cart after adding
        window.universalCart.clear();
        showNotification('success', `Добавлено ${items.length} позиций в проект`);
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
function addEquipmentToProject(bookingData) {
    // TODO: Implement actual API call to add equipment to project
    console.log('Adding equipment to project:', bookingData);
}
