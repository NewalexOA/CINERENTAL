// Main JavaScript for rental equipment management system
import { formatDate, showToast, debounce, formatCurrency, validateForm, initDateRangePicker } from './utils/common.js';
import { api } from './utils/api.js';

// Global API configuration
window.API_CONFIG = {
    user_id: document.querySelector('meta[name="user-id"]')?.content || '1'
};

// Make showToast available globally
window.showToast = showToast;

// Loader functions
window.loaderCounter = 0; // Counter of active operations using loader

window.showLoader = function() {
    window.loaderCounter++;

    let loader = document.getElementById('global-loader');

    // Create loader if it doesn't exis
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'position-fixed w-100 h-100 d-flex justify-content-center align-items-center';
        loader.style.top = '0';
        loader.style.left = '0';
        loader.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        loader.style.zIndex = '9999';

        loader.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Загрузка...</span>
            </div>
        `;

        document.body.appendChild(loader);
    }

    // Store timestamp and remove hidden attribute
    loader.dataset.timestamp = Date.now().toString();
    loader.removeAttribute('hidden');
};

window.hideLoader = function() {
    window.loaderCounter--;

    // Never hide loader if counter > 0
    if (window.loaderCounter > 0) {
        return;
    }

    // Reset counter to 0 in case it became negative
    window.loaderCounter = 0;

    const loader = document.getElementById('global-loader');
    if (loader) {
        // Use hidden attribute instead of CSS
        loader.setAttribute('hidden', '');
    }

    // Safety: force hide loader after 5 seconds if it is still visible
    setTimeout(() => {
        const loaderCheck = document.getElementById('global-loader');
        if (loaderCheck && !loaderCheck.hasAttribute('hidden')) {
            console.warn('Loader was not hidden within 5 seconds, forcing hide');
            loaderCheck.setAttribute('hidden', '');
            window.loaderCounter = 0; // Reset counter
        }
    }, 5000);
};

// Function to forcibly reset loader state
window.resetLoader = function() {
    window.loaderCounter = 0;

    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.setAttribute('hidden', '');

        // If loader is still visible after setting hidden attribute
        if (getComputedStyle(loader).display !== 'none') {
            console.warn('Loader still visible after setting hidden attribute, using CSS display property');
            loader.style.display = 'none';
        }
    }

    console.log('Loader state has been forcibly reset');
};

/**
 * Class for barcode scanner functionality.
 * Handles scanner input and processes equipment data.
 */
class BarcodeScanner {
    /**
     * Initialize barcode scanner.
     * @param {function} onScan - Callback for successful scan
     * @param {function} onError - Callback for scan error
     * @param {string} sessionId - Initial session ID
     */
    constructor(onScan = null, onError = null, sessionId = null) {
        this.isListening = false;
        this.buffer = '';
        this.lastChar = '';
        this.lastTime = 0;
        this.THRESHOLD = 20; // Maximum ms between keystrokes to be considered from scanner

        // Default handlers
        this.onScan = onScan || ((barcode) => console.log('Scanned:', barcode));
        this.onError = onError || ((error) => console.error('Scan error:', error));

        // Initialize session if scanStorage is available
        this.sessionId = sessionId;
        if (window.scanStorage) {
            const activeSession = window.scanStorage.getActiveSession();
            if (activeSession) {
                this.sessionId = activeSession.id;
            } else {
                // Create new session if none exists
                const newSession = window.scanStorage.createSession('New Session ' + new Date().toLocaleString());
                this.sessionId = newSession.id;
            }
        }

        // Bind methods to keep this context
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.processBarcode = this.processBarcode.bind(this);
    }

    /**
     * Start listening for scanner input.
     */
    start() {
        if (!this.isListening) {
            document.addEventListener('keypress', this.handleKeyPress);
            this.isListening = true;
            console.log('Barcode scanner started');
        }
    }

    /**
     * Stop listening for scanner input.
     */
    stop() {
        if (this.isListening) {
            document.removeEventListener('keypress', this.handleKeyPress);
            this.isListening = false;
            console.log('Barcode scanner stopped');
        }
    }

    /**
     * Handle keypress events to capture scanner input.
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyPress(event) {
        const currentTime = new Date().getTime();

        // Reset buffer if too much time has passed
        if (currentTime - this.lastTime > 500) {
            this.buffer = '';
        }

        // Check if key was pressed in rapid succession
        const isScanner = currentTime - this.lastTime <= this.THRESHOLD;
        this.lastTime = currentTime;

        // If Enter key and buffer has content, process the barcode
        if (event.key === 'Enter' && this.buffer.length > 0) {
            // Only process if likely from a scanner
            if (isScanner || this.buffer.length >= 8) {
                event.preventDefault();
                const barcode = this.buffer;
                this.buffer = '';

                if (this.isValidBarcode(barcode)) {
                    this.processBarcode(barcode);
                } else {
                    this.onError(new Error('Invalid barcode format: ' + barcode));
                }
            }
        } else {
            // Add character to buffer
            this.buffer += event.key;
        }

        this.lastChar = event.key;
    }

    /**
     * Validate barcode format.
     * @param {string} barcode - Barcode to validate
     * @returns {boolean} True if valid
     */
    isValidBarcode(barcode) {
        return barcode && barcode.length >= 3 && /^[A-Za-z0-9\-]+$/.test(barcode);
    }

    /**
     * Process scanned barcode.
     * @param {string} barcode - Scanned barcode
     */
    async processBarcode(barcode) {
        console.log('Processing barcode:', barcode);
        try {
            const response = await fetch(`/api/v1/equipment/barcode/${barcode}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Оборудование со штрих-кодом ${barcode} не найдено`);
                } else {
                    throw new Error(`Ошибка при получении данных: ${response.status} ${response.statusText}`);
                }
            }
            const equipment = await response.json();

            let addedToSession = false;
            let isDuplicate = false;

            // Save to session storage if available and this.sessionId is set
            if (window.scanStorage && this.sessionId) {
                const equipmentDataForSession = {
                    equipment_id: equipment.id,
                    name: equipment.name,
                    barcode: equipment.barcode,
                    serial_number: equipment.serial_number || null,
                    category_id: equipment.category_id || equipment.category?.id || null,
                    category_name: equipment.category_name || equipment.category?.name || 'Без категории'
                };

                // Use this.sessionId for adding equipment
                const addResult = window.scanStorage.addEquipment(this.sessionId, equipmentDataForSession);

                if (addResult === 'duplicate_serial_exists') {
                    isDuplicate = true;
                    addedToSession = false;
                    console.log(`Equipment with ID ${equipment.id} and S/N ${equipment.serial_number || 'N/A'} already in session ${this.sessionId}.`);
                } else if (addResult === 'item_added' || addResult === 'quantity_incremented') {
                    isDuplicate = false;
                    addedToSession = true;
                    console.log(`Equipment ID ${equipment.id} successfully processed for session ${this.sessionId}. Result: ${addResult}`);
                } else {
                    isDuplicate = false;
                    addedToSession = false;
                    console.warn(`Failed to add equipment ID ${equipment.id} to session ${this.sessionId} or no specific result code. Result: ${addResult}`);
                }
            } else {
                // Updated log message for clarity
                if (!window.scanStorage) {
                    console.log('ScanStorage not available when trying to add equipment.');
                } else { // Implies this.sessionId is null/undefined
                    console.log('No session ID found in BarcodeScanner instance when trying to add equipment.');
                }
            }

            this.onScan(equipment, { isDuplicate, addedToSession });

        } catch (error) {
            console.error('Barcode scan error:', error);
            this.onError(error);
        }
    }

    /**
     * Get the current session ID.
     * @returns {string|null} Current session ID
     */
    getSessionId() {
        return this.sessionId;
    }

    /**
     * Set a new session ID.
     * @param {string} id - New session ID
     */
    setSessionId(id) {
        this.sessionId = id;
        if (window.scanStorage) {
            window.scanStorage.setActiveSession(id);
        }
    }
}

// Export BarcodeScanner to global scope
window.BarcodeScanner = BarcodeScanner;

// Equipment search functionality
window.equipmentSearch = {
    init() {
        const searchInput = document.querySelector('#searchInput');
        const categoryFilter = document.querySelector('#categoryFilter');
        const statusFilter = document.querySelector('#statusFilter');
        const searchSpinner = document.querySelector('#search-spinner');
        const initialEquipment = [...document.getElementById('equipmentTable').children];

        // Get initial values from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const initialQuery = urlParams.get('query') || '';
        const initialCategory = urlParams.get('category_id') || '';
        const initialStatus = urlParams.get('status') || '';

        // Set initial values
        searchInput.value = initialQuery;
        categoryFilter.value = initialCategory;
        statusFilter.value = initialStatus;

        const updateResults = debounce(async () => {
            const query = searchInput.value.trim();
            const category = categoryFilter.value;
            const status = statusFilter.value;

            searchSpinner.classList.remove('d-none');
            try {
                const params = new URLSearchParams();

                // Добавляем поисковый запрос если он достаточной длины
                if (query.length >= 3) {
                    params.append('query', query);
                }

                // Добавляем фильтры
                if (category) {
                    params.append('category_id', category);
                }
                if (status) {
                    params.append('status', status);
                }

                params.append('include_deleted', 'false');

                // Add timestamp for cache prevention
                params.append('_t', Date.now());

                // Формируем URL с параметрами
                const url = params.toString() ? `/equipment?${params.toString()}` : '/equipment';

                // Update browser URL without reloading the page
                const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
                window.history.replaceState({}, '', newUrl);

                console.log('Request URL:', url);
                const results = await api.get(url);
                console.log('Results:', results);

                const table = document.getElementById('equipmentTable');
                if (!table) {
                    console.error('Table element not found');
                    return;
                }

                if (results.length === 0) {
                    table.innerHTML = '<tr><td colspan="6" class="text-center">Ничего не найдено</td></tr>';
                    return;
                }

                table.innerHTML = results.map(item => formatEquipmentRow(item)).join('');
            } catch (error) {
                console.error('Search error:', error);
                showToast('Ошибка при поиске оборудования', 'danger');
            } finally {
                searchSpinner.classList.add('d-none');
            }
        }, 300);

        // Add event listeners
        searchInput.addEventListener('input', updateResults);
        categoryFilter.addEventListener('change', updateResults);
        statusFilter.addEventListener('change', updateResults);

        // Load initial data
        updateResults();
    }
};

// Get status color for badges
function getStatusColor(status) {
    switch (status) {
        case 'AVAILABLE':
            return 'success';
        case 'RENTED':
            return 'warning';
        case 'MAINTENANCE':
            return 'info';
        case 'BROKEN':
            return 'danger';
        case 'RETIRED':
            return 'secondary';
        default:
            return 'primary';
    }
}

// Format equipment row for table
function formatEquipmentRow(item) {
    return `
        <tr>
            <td>
                <div class="fw-bold">${item.name}</div>
                <small class="text-muted">${item.description || ''}</small>
            </td>
            <td>${item.category_name}</td>
            <td>${item.serial_number || ''}</td>
            <td>
                <span class="badge bg-${getStatusColor(item.status)}">
                    ${item.status}
                </span>
            </td>
            <td>
                <div class="btn-group">
                    <a href="/equipment/${item.id}" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-info-circle"></i>
                    </a>
                    <button type="button" class="btn btn-sm btn-outline-secondary btn-print-barcode"
                            data-equipment-id="${item.id}"
                            data-barcode="${item.barcode}">
                        <i class="fas fa-print"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-success btn-add-to-scan"
                            data-equipment-id="${item.id}"
                            data-name="${item.name}"
                            data-barcode="${item.barcode}"
                            data-serial-number="${item.serial_number || ''}"
                            data-category-id="${item.category_id}"
                            data-category-name="${item.category_name}">
                        <i class="fas fa-qrcode"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Setup global event delegation for equipment table actions
function setupGlobalEventHandlers() {
    // Check if handlers are already initialized
    if (document.documentElement.hasAttribute('data-global-handlers-initialized')) {
        console.log('Global event handlers already initialized, skipping');
        return;
    }

    console.log('Initializing global event handlers');

    // Equipment actions handler
    document.addEventListener('click', function(event) {
        const button = event.target.closest('button');
        if (!button) return;

        // Handle print barcode button
        if (button.classList.contains('btn-print-barcode')) {
            event.preventDefault();

            const equipmentId = button.dataset.equipmentId;
            const barcode = button.dataset.barcode;
            if (equipmentId && barcode) {
                if (window.printBarcode) {
                    window.printBarcode(equipmentId, barcode);
                } else {
                    console.error('printBarcode function not found in global scope');
                }
            }
        }

        // Handle add to scan button
        else if (button.classList.contains('btn-add-to-scan')) {
            event.preventDefault();

            const equipmentId = button.dataset.equipmentId;
            const name = button.dataset.name;
            const barcode = button.dataset.barcode;
            const serialNumber = button.dataset.serialNumber;
            const categoryId = button.dataset.categoryId;
            const categoryName = button.dataset.categoryName;

            if (equipmentId) {
                if (window.addToScanSession) {
                    window.addToScanSession(equipmentId, name, barcode, serialNumber, categoryId, categoryName);
                } else {
                    console.error('addToScanSession function not found in global scope');
                }
            }
        }
    });

    // Set marker that handlers are initialized
    document.documentElement.setAttribute('data-global-handlers-initialized', 'true');
}

// --- Client Search and Sort Functionality ---

// Function to render a single client card (adapt structure as needed)
function renderClientCard(client) {
    // Basic security check: Ensure client object and essential fields exist
    if (!client || typeof client.id === 'undefined' || typeof client.name === 'undefined') {
        console.error('Invalid client data received:', client);
        return ''; // Return empty string or a placeholder if needed
    }

    // Basic sanitization/escaping for display (more robust solution might be needed)
    const escapeHTML = (str) => String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '\'': '&#39;',
        '"': '&quot;'
    }[tag] || tag));

    const clientId = escapeHTML(client.id);
    const clientName = escapeHTML(client.name);
    const clientCompany = escapeHTML(client.company || '');
    const clientEmail = escapeHTML(client.email || '');
    const clientPhone = escapeHTML(client.phone || '');
    const bookingsCount = escapeHTML(client.bookings_count !== undefined ? client.bookings_count : '0');
    const createdAt = client.created_at ? formatDate(client.created_at) : 'N/A';

    return `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="card-title mb-1">${clientName}</h5>
                            <h6 class="card-subtitle text-muted">${clientCompany}</h6>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-link text-dark" type="button" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li>
                                    <a class="dropdown-item" href="/clients/${clientId}">
                                        <i class="fas fa-info-circle"></i> Подробнее
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#editClientModal" data-client-id="${clientId}">
                                        <i class="fas fa-edit"></i> Редактировать
                                    </a>
                                </li>
                                <li>
                                    <hr class="dropdown-divider">
                                </li>
                                <li>
                                    <a class="dropdown-item text-danger" href="#" data-bs-toggle="modal" data-bs-target="#deleteClientModal" data-client-id="${clientId}">
                                        <i class="fas fa-trash"></i> Удалить
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="mb-3">
                        <div class="text-muted mb-2">
                            <i class="fas fa-envelope"></i> ${clientEmail}
                        </div>
                        <div class="text-muted">
                            <i class="fas fa-phone"></i> ${clientPhone}
                        </div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-primary">
                                <i class="fas fa-box"></i> ${bookingsCount} бронирований
                            </span>
                        </div>
                        <small class="text-muted">
                            Добавлен ${createdAt}
                        </small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Function to update the client list display
function updateClientDisplay(clients) {
    const clientsGrid = document.getElementById('clientsGrid');
    if (!clientsGrid) return;

    clientsGrid.innerHTML = '';

    if (clients && clients.length > 0) {
        clients.forEach(client => {
            clientsGrid.innerHTML += renderClientCard(client);
        });
    } else {
        // Display a message if no clients found
        clientsGrid.innerHTML = '<div class="col-12"><p class="text-center text-muted">Клиенты не найдены.</p></div>';
    }
}

// Function to fetch clients from API and update display
async function fetchAndUpdateClients() {
    const searchInput = document.getElementById('searchClient');
    const sortOrderSelect = document.getElementById('sortOrder');
    const clientsGrid = document.getElementById('clientsGrid');

    if (!clientsGrid) return; // Should not happen if init checks pass

    const query = searchInput ? searchInput.value.trim() : '';
    const sortBy = sortOrderSelect ? sortOrderSelect.value : 'name'; // Default sort
    // Add sort order if needed (e.g., a toggle button or separate select)
    const sortOrder = 'asc'; // Assuming ascending for now

    console.log(`Fetching clients: Query="${query}", SortBy="${sortBy}", Order="${sortOrder}"`);

    // Show loading indicator
    clientsGrid.innerHTML = '<div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Загрузка...</span></div></div>';

    try {
        const params = {};
        if (query) {
            params.query = query;
        }
        if (sortBy) {
            params.sort_by = sortBy;
            params.sort_order = sortOrder;
        }
        // Add pagination params if needed: params.skip = ..., params.limit = ...

        const clients = await api.get('/clients/', params);
        console.log('Received clients:', clients);
        if (Array.isArray(clients)) {
            updateClientDisplay(clients);
        } else {
            console.error('Invalid response format from API:', clients);
            updateClientDisplay([]);
        }
    } catch (error) {
        console.error('Error fetching clients:', error);
        clientsGrid.innerHTML = '<div class="col-12"><p class="text-center text-danger">Ошибка загрузки клиентов.</p></div>';
        if (window.showToast) {
             window.showToast('Ошибка при загрузке клиентов.', 'danger');
        }
    }
}

// Initialize client search and sort controls
function initClientControls() {
    if (window.disableGlobalClientControls === true) {
        console.log('Global client controls initialization skipped (disabled by page).');
        return;
    }

    const searchInput = document.getElementById('searchClient');
    const sortOrderSelect = document.getElementById('sortOrder');
    const clientsGrid = document.getElementById('clientsGrid');

    if (!searchInput || !sortOrderSelect || !clientsGrid) {
        console.log('Client search/sort controls or grid not found on this page.');
        return;
    }

    console.log('Initializing client controls (search & sort)...');

    const debouncedFetch = debounce(fetchAndUpdateClients, 300);

    searchInput.addEventListener('input', debouncedFetch);
    sortOrderSelect.addEventListener('change', fetchAndUpdateClients);

    // Initial load (optional, if you want to load based on initial state)
     fetchAndUpdateClients(); // Load based on initial input/select values

}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components here
    console.log('Main application initialized');

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));

    // Setup global event handlers
    setupGlobalEventHandlers();

    // Initialize equipment search
    if (document.getElementById('searchInput')) {
        window.equipmentSearch.init();
    }

    initClientControls(); // Initialize client search and sort
});
