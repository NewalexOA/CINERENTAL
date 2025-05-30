/**
 * Session Search Module
 * Handles searching and filtering within scanning session items
 */

// Module variables for search state
let currentSearchQuery = '';
let filteredItems = [];
let searchTimeout = null;

/**
 * Filter session items based on search query
 * @param {Array} items - Array of session items
 * @param {string} query - Search query
 * @returns {Array} Filtered items
 */
export function filterSessionItems(items, query) {
    if (!query || !query.trim()) {
        return items;
    }

    const searchTerm = query.toLowerCase().trim();

    return items.filter(item => {
        // Search in equipment name
        if (item.name && item.name.toLowerCase().includes(searchTerm)) {
            return true;
        }

        // Search in category name
        if (item.category_name && item.category_name.toLowerCase().includes(searchTerm)) {
            return true;
        }

        // Search in serial number
        if (item.serial_number && item.serial_number.toLowerCase().includes(searchTerm)) {
            return true;
        }

        // Search in barcode
        if (item.barcode && item.barcode.toLowerCase().includes(searchTerm)) {
            return true;
        }

        return false;
    });
}

/**
 * Update search counters in the UI
 * @param {number} foundCount - Number of found items
 * @param {number} totalCount - Total number of items
 */
export function updateSearchCounters(foundCount, totalCount) {
    const foundCountElement = document.getElementById('foundCount');
    const totalCountElement = document.getElementById('totalCount');
    const searchResultsElement = document.getElementById('searchResults');

    if (foundCountElement) {
        foundCountElement.textContent = foundCount;
    }
    if (totalCountElement) {
        totalCountElement.textContent = totalCount;
    }

    // Update the entire search results text to ensure proper spacing
    if (searchResultsElement) {
        searchResultsElement.innerHTML = `<span id="foundCount">${foundCount}</span>&nbsp;из&nbsp;<span id="totalCount">${totalCount}</span>`;
    }
}

/**
 * Highlight search term in text
 * @param {string} text - Text to highlight
 * @param {string} searchTerm - Term to highlight
 * @returns {string} Text with highlighted search term
 */
function highlightSearchTerm(text, searchTerm) {
    if (!text || !searchTerm) return text || '';

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

/**
 * Render session items with search filtering applied
 * @param {Object} session - Session object
 * @param {Array} itemsToRender - Items to render (filtered or all)
 * @param {Function} attachItemButtonListeners - Callback to attach button listeners
 */
export function renderSessionItems(session, itemsToRender, attachItemButtonListeners) {
    const itemsList = document.getElementById('sessionItemsList');
    const noSessionItems = document.getElementById('noSessionItems');
    const sessionEquipmentTable = document.getElementById('sessionEquipmentTable');

    if (!itemsList) {
        console.error('Session items list element not found');
        return;
    }

    // Clear the list
    itemsList.innerHTML = '';

    if (itemsToRender.length === 0) {
        if (getCurrentSearchQuery().trim()) {
            // Show "no search results" message
            if (noSessionItems) {
                noSessionItems.textContent = 'Ничего не найдено по запросу';
                noSessionItems.classList.remove('d-none');
            }
        } else {
            // Show "no items" message
            if (noSessionItems) {
                noSessionItems.textContent = 'Нет отсканированного оборудования';
                noSessionItems.classList.remove('d-none');
            }
        }
        if (sessionEquipmentTable && sessionEquipmentTable.querySelector('table')) {
            sessionEquipmentTable.querySelector('table').classList.add('d-none');
        }
    } else {
        if (noSessionItems) {
            noSessionItems.classList.add('d-none');
        }
        if (sessionEquipmentTable && sessionEquipmentTable.querySelector('table')) {
            sessionEquipmentTable.querySelector('table').classList.remove('d-none');
        }

        // Render each item in the table
        itemsToRender.forEach(item => {
            const hasSerialNumber = !!item.serial_number;
            const quantity = item.quantity || 1;

            // Define buttons based on whether the item has a serial number
            let buttonsHtml;
            if (hasSerialNumber) {
                // Item WITH serial number: Show remove button
                buttonsHtml = `
                    <button class="btn btn-sm btn-outline-danger remove-item-btn" data-equipment-id="${item.equipment_id}" title="Удалить">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            } else {
                // Item WITHOUT serial number: Show increment and decrement/remove buttons
                let firstButtonHtml;
                if (quantity > 1) {
                    // Quantity > 1: Show decrement button
                    firstButtonHtml = `
                        <button class="btn btn-outline-secondary decrement-item-btn" data-equipment-id="${item.equipment_id}" title="Уменьшить кол-во">
                            <i class="fas fa-minus"></i>
                        </button>
                    `;
                } else {
                    // Quantity === 1: Show remove button instead of decrement
                    firstButtonHtml = `
                        <button class="btn btn-sm btn-outline-danger remove-item-btn" data-equipment-id="${item.equipment_id}" title="Удалить">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                }
                // Always show increment button
                const incrementButtonHtml = `
                    <button class="btn btn-outline-secondary increment-item-btn" data-equipment-id="${item.equipment_id}" title="Увеличить кол-во">
                        <i class="fas fa-plus"></i>
                    </button>
                `;
                // Combine buttons in desired order (+ first, then -/X)
                buttonsHtml = `
                    <div class="btn-group btn-group-sm" role="group">
                        ${incrementButtonHtml}
                        ${firstButtonHtml}
                    </div>
                `;
            }

            const row = document.createElement('tr');

            // Add search highlighting if there's a search query
            let nameHtml = item.name;
            let categoryHtml = item.category_name || item.category?.name || 'Без категории';
            let serialHtml = item.serial_number;

            if (getCurrentSearchQuery().trim()) {
                const query = getCurrentSearchQuery().toLowerCase().trim();
                nameHtml = highlightSearchTerm(item.name, query);
                categoryHtml = highlightSearchTerm(categoryHtml, query);
                if (serialHtml) {
                    serialHtml = highlightSearchTerm(serialHtml, query);
                }
            }

            row.innerHTML = `
                <td>
                    <div>${nameHtml}</div>
                    ${hasSerialNumber ? `<small class="text-muted d-block">S/N: ${serialHtml}</small>` : ''}
                </td>
                <td>${categoryHtml}</td>
                <td class="text-center">
                    ${quantity}
                </td>
                <td class="text-center">
                    ${buttonsHtml}
                </td>
            `;
            itemsList.appendChild(row);
        });

        // Add event listeners AFTER updating the items
        if (attachItemButtonListeners) {
            attachItemButtonListeners(session.id);
        }
    }
}

/**
 * Initialize session search functionality
 * @param {Function} performSearchCallback - Callback function to perform search
 */
export function initSessionSearch(performSearchCallback) {
    const searchInput = document.getElementById('sessionSearchInput');
    const clearButton = document.getElementById('clearSessionSearch');

    if (!searchInput || !clearButton) {
        console.warn('Session search elements not found');
        return;
    }

    // Search input handler with debounce
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        setCurrentSearchQuery(query);

        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Set new timeout for debounced search
        searchTimeout = setTimeout(() => {
            if (performSearchCallback) {
                performSearchCallback(query);
            }
        }, 300);
    });

    // Clear search button handler
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        setCurrentSearchQuery('');
        if (performSearchCallback) {
            performSearchCallback('');
        }
        searchInput.focus();
    });

    // Enter key handler
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            if (performSearchCallback) {
                performSearchCallback(e.target.value);
            }
        }
    });
}

/**
 * Perform search on session items
 * @param {string} query - Search query
 * @param {Object} scanStorage - Scan storage instance
 * @param {Function} renderCallback - Callback to render items
 */
export function performSessionSearch(query, scanStorage, renderCallback) {
    setCurrentSearchQuery(query);
    const activeSession = scanStorage.getActiveSession();

    if (!activeSession || !activeSession.items || !Array.isArray(activeSession.items)) {
        return;
    }

    // Filter items based on search query
    filteredItems = filterSessionItems(activeSession.items, query);

    // Update counters
    updateSearchCounters(filteredItems.length, activeSession.items.length);

    // Re-render items with filtered results
    if (renderCallback) {
        renderCallback(activeSession, filteredItems);
    }

    console.log(`Search performed: "${query}" - Found ${filteredItems.length} of ${activeSession.items.length} items`);
}

// Getters and setters for module state
export function getCurrentSearchQuery() {
    return currentSearchQuery;
}

function setCurrentSearchQuery(query) {
    currentSearchQuery = query;
}

export function resetSearchState() {
    currentSearchQuery = '';
    filteredItems = [];
    if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
    }
}
