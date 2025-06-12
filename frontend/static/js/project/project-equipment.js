/**
 * Project equipment management functionality
 */

import { initializeEquipmentManagement } from './equipment/index.js';

// Equipment list state (legacy - maintained for backward compatibility)
let equipmentList = [];

// Barcode scanner state
let scanner = null;
let scannerActive = false;

export {
    equipmentList,
    initializeEquipmentManagement
};
