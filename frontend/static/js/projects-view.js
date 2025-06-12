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
});

// Make function available globally for dynamic updates
window.toggleEquipmentDatesColumn = toggleEquipmentDatesColumn;
