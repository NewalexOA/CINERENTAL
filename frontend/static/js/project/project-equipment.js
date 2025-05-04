/**
 * Project equipment management functionality
 */

import { initializeEquipmentManagement } from './equipment/index.js';

// Equipment list state
let equipmentList = [];

// Pagination state
let currentPage = 1;
let totalPages = 1;
let pageSize = 20;
let totalCount = 0;
let searchDebounceTimer;

// Barcode scanner state
let scanner = null;
let scannerActive = false;

export {
    equipmentList,
    currentPage,
    totalPages,
    pageSize,
    totalCount,
    initializeEquipmentManagement
};
