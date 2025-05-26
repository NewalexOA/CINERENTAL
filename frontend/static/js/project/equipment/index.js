/**
 * Equipment management module index
 */

import { checkEquipmentAvailability, initializeBookingPeriodPickers, initializeNewBookingPeriodPicker } from './availability.js';
import { handleQuantityIncrease, handleQuantityDecrease, handleBookingRemoval, addSelectedEquipmentToProject } from './booking.js';
import { initializeHIDScanner, startHIDScanner, stopHIDScanner } from './scanner.js';
import { initializeCategoryFilter, setupSearchInput, setupPaginationButtons, searchEquipmentByBarcode, searchEquipmentInCatalog } from './search.js';
import { displaySearchResults, updatePaginationUI, selectEquipment, showEquipmentDetails, hideEquipmentDetails, resetEquipmentSelection, showAddEquipmentZone, hideAddEquipmentZone, renderEquipmentSection } from './ui.js';

// Re-export all imported functions
export {
    checkEquipmentAvailability, initializeBookingPeriodPickers, initializeNewBookingPeriodPicker,
    handleQuantityIncrease, handleQuantityDecrease, handleBookingRemoval, addSelectedEquipmentToProject,
    initializeHIDScanner, startHIDScanner, stopHIDScanner,
    initializeCategoryFilter, setupSearchInput, setupPaginationButtons, searchEquipmentByBarcode, searchEquipmentInCatalog,
    displaySearchResults, updatePaginationUI, selectEquipment, showEquipmentDetails, hideEquipmentDetails, resetEquipmentSelection, showAddEquipmentZone, hideAddEquipmentZone, renderEquipmentSection
};

/**
 * Initialize equipment management features
 */
export function initializeEquipmentManagement() {
    if (document.querySelectorAll('.booking-period-input').length > 0) {
        // Initialize booking period pickers for existing equipment
        initializeBookingPeriodPickers();
    } else {
        console.warn('No booking period inputs found, skipping initialization');
    }

    // Initialize category filter
    initializeCategoryFilter();

    // Setup search input with debounce
    setupSearchInput();

    // Setup pagination buttons
    setupPaginationButtons();

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

    // Add equipment zone functionality
    document.getElementById('addEquipmentBtn')?.addEventListener('click', () => {
        showAddEquipmentZone();
        initializeNewBookingPeriodPicker();
    });
    document.getElementById('closeAddZoneBtn')?.addEventListener('click', hideAddEquipmentZone);
    document.getElementById('closeEquipmentDetailsBtn')?.addEventListener('click', hideEquipmentDetails);

    // Search functionality
    document.getElementById('searchBarcodeBtn')?.addEventListener('click', searchEquipmentByBarcode);
    document.getElementById('searchCatalogBtn')?.addEventListener('click', searchEquipmentInCatalog);

    // Add to project button
    document.getElementById('addToProjectBtn')?.addEventListener('click', addSelectedEquipmentToProject);

    // Initialize HID scanner and setup tab switching
    initializeHIDScanner();
    setupTabSwitching();

    // Auto-start HID scanner if scanner tab is active by default
    const scannerTab = document.getElementById('scanner-tab');
    if (scannerTab && scannerTab.classList.contains('active')) {
        console.log('Scanner tab is active on page load, starting HID scanner');
        // Small delay to ensure DOM is fully ready
        setTimeout(() => {
            startHIDScanner();
        }, 100);
    }
}

/**
 * Setup tab switching for scanner functionality
 */
function setupTabSwitching() {
    const scannerTab = document.getElementById('scanner-tab');
    const catalogTab = document.getElementById('catalog-tab');

    if (scannerTab) {
        scannerTab.addEventListener('shown.bs.tab', function() {
            console.log('Scanner tab activated');
            startHIDScanner();
        });

        scannerTab.addEventListener('hidden.bs.tab', function() {
            console.log('Scanner tab deactivated');
            stopHIDScanner();
        });
    }

    if (catalogTab) {
        catalogTab.addEventListener('shown.bs.tab', function() {
            console.log('Catalog tab activated');
            stopHIDScanner();
        });
    }
}
