/**
 * Equipment management module index
 */

import { checkEquipmentAvailability, initializeBookingPeriodPickers, initializeNewBookingPeriodPicker } from './availability.js';
import { handleQuantityIncrease, handleQuantityDecrease, handleBookingRemoval, addSelectedEquipmentToProject } from './booking.js';
import { initializeHIDScanner, startHIDScanner, stopHIDScanner, autoStartHIDScanner, autoStopHIDScanner } from './scanner.js';
import { initializeCategoryFilter, setupSearchInput, setupPaginationButtons, searchEquipmentByBarcode, searchEquipmentInCatalog } from './search.js';
import { displaySearchResults, updatePaginationUI, selectEquipment, showEquipmentDetails, hideEquipmentDetails, resetEquipmentSelection, showAddEquipmentZone, hideAddEquipmentZone, renderEquipmentSection } from './ui.js';

// Re-export all imported functions
export {
    checkEquipmentAvailability, initializeBookingPeriodPickers, initializeNewBookingPeriodPicker,
    handleQuantityIncrease, handleQuantityDecrease, handleBookingRemoval, addSelectedEquipmentToProject,
    initializeHIDScanner, startHIDScanner, stopHIDScanner, autoStartHIDScanner, autoStopHIDScanner,
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

    // Add equipment zone functionality with auto HID scanner management
    document.getElementById('addEquipmentBtn')?.addEventListener('click', () => {
        showAddEquipmentZone();
        initializeNewBookingPeriodPicker();
        autoStartHIDScanner(); // Auto-start HID scanner when opening modal
    });
    document.getElementById('closeAddZoneBtn')?.addEventListener('click', () => {
        hideAddEquipmentZone();
        autoStopHIDScanner(); // Auto-stop HID scanner when closing modal
    });
    document.getElementById('closeEquipmentDetailsBtn')?.addEventListener('click', hideEquipmentDetails);

    // Search functionality handled by input events and debounce in search.js

    // Add to project button
    document.getElementById('addToProjectBtn')?.addEventListener('click', addSelectedEquipmentToProject);

    // Initialize HID scanner (without auto-starting - will be managed by modal open/close)
    initializeHIDScanner();
}
