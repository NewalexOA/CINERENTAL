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
import { initializeUniversalCartModule } from './project/cart/index.js';

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
    initializeUniversalCartModule();
});

window.toggleEquipmentDatesColumn = toggleEquipmentDatesColumn;
