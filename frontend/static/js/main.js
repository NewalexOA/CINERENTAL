// Main JavaScript for rental equipment management system

// Constants
const API_BASE_URL = '/api/v1';

// Utility functions
const debounce = (func, wait, immediate) => {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

const formatDate = (date) => {
    // Use Moment.js for reliable date formatting
    const m = moment(date); // moment() handles various input formats
    if (!m.isValid()) {
        // Return placeholder or empty string if date is invalid
        return 'Неверная дата';
    }
    // Format using Moment's format function (LL is locale-aware long date format like 'September 4, 1986')
    // Using 'L' for a shorter format like '09/04/1986' or customize as needed 'DD.MM.YYYY'
    return m.format('DD.MM.YYYY'); // Example: 10.04.2025
    // Or use toLocaleDateString if preferred, but moment parsing helps reliability
    // return m.toDate().toLocaleDateString('ru-RU', {
    //     year: 'numeric',
    //     month: 'long',
    //     day: 'numeric'
    // });
};

const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB'
    }).format(amount);
};

// Toast notification function
window.showToast = function(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');

    if (!toastContainer) {
        // Create toast container if it doesn't exis
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    // Create toast elemen
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    // Add toast to container
    document.getElementById('toastContainer').appendChild(toast);

    // Initialize and show toast with shorter delay
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 }); // Add delay option (3 seconds)
    bsToast.show();

    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
};

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

// API calls
const api = {
    async get(endpoint, params = null) {
        const startTime = performance.now();
        let url = endpoint;

        // Build query string if params are provided
        if (params && Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            // Append query string correctly
            url += (url.includes('?') ? '&' : '?') + queryString;
        }

        // Optional: Decide if trailing slash is needed for non-parameterized requests
        // For consistency, maybe remove the auto-adding slash logic here
        // if backend handles both with/without slash, or ensure it's correct.
        // Let's remove the automatic slash adding for now, assuming backend is flexible or we provide correct endpoints.
        // const finalUrl = url.includes('?') || url.endsWith('/') ? url : `${url}/`; // Old logic
        const finalUrl = url; // Simplified

        try {
            console.group(`%c[API] GET Request: ${API_BASE_URL}${finalUrl}`, 'color: #2196F3; font-weight: bold;');
            console.log('Time:', new Date().toISOString());

            const response = await fetch(`${API_BASE_URL}${finalUrl}`);
            console.log('Status:', response.status, response.statusText);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                console.error('Error Data:', errorData);
                const error = new Error(errorData.detail || 'Ошибка при получении данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            const data = await response.json();
            const endTime = performance.now();
            console.log('Response Data:', data);
            console.log(`Request took ${(endTime - startTime).toFixed(2)}ms`);
            console.groupEnd();
            return data;
        } catch (error) {
            console.error('Error Details:', error);
            console.groupEnd();
            // Re-throw a more informative error if possible
            const errorMessage = error.response?.data?.detail || error.message || 'Ошибка при получении данных';
            throw new Error(errorMessage);
        }
    },

    async post(endpoint, data) {
        const startTime = performance.now();
        try {
            console.group(`%c[API] POST Request: ${API_BASE_URL}${endpoint}`, 'color: #4CAF50; font-weight: bold;');
            console.log('Time:', new Date().toISOString());
            console.log('Request Data:', data);

            // Convert decimal fields to strings to avoid precision issues
            if (data && typeof data === 'object') {
                Object.keys(data).forEach(key => {
                    if (typeof data[key] === 'number' && key.includes('cost')) {
                        data[key] = String(data[key]);
                    }
                });
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            console.log('Status:', response.status, response.statusText);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                console.error('Error Data:', errorData);
                const error = new Error(errorData.detail || 'Ошибка при отправке данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            const responseData = await response.json();
            const endTime = performance.now();
            console.log('Response Data:', responseData);
            console.log(`Request took ${(endTime - startTime).toFixed(2)}ms`);
            console.groupEnd();
            return responseData;
        } catch (error) {
            console.error('Error Data:', error.response?.data);
            // Log detailed validation errors if available (FastAPI)
            let errorMessage = 'Произошла ошибка при выполнении запроса'; // Default message
            if (error.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    // Handle FastAPI validation errors (list of objects)
                    console.error('Validation Errors:', error.response.data.detail);
                    errorMessage = error.response.data.detail.map(err => `${err.loc ? err.loc.join(' -> ') : 'field'}: ${err.msg}`).join('; \n');
                } else if (typeof error.response.data.detail === 'string') {
                    // Handle simple string detail messages
                    console.error('Error Detail:', error.response.data.detail);
                    errorMessage = error.response.data.detail;
                } else {
                     console.error('Unknown Error Detail Format:', error.response.data.detail);
                     errorMessage = JSON.stringify(error.response.data.detail);
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            console.error('User-facing Error Message:', errorMessage); // Log the message shown to user
            console.error('Full Error Object:', error); // Log the full error object for debugging
            throw new Error(errorMessage); // Throw the specific message
        }
    },

    async put(endpoint, data) {
        const startTime = performance.now();
        try {
            console.group(`%c[API] PUT Request: ${API_BASE_URL}${endpoint}`, 'color: #FF9800; font-weight: bold;');
            console.log('Time:', new Date().toISOString());
            console.log('Request Data:', data);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            console.log('Status:', response.status, response.statusText);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                console.error('Error Data:', errorData);
                const error = new Error(errorData.detail || 'Ошибка при обновлении данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            const responseData = await response.json();
            const endTime = performance.now();
            console.log('Response Data:', responseData);
            console.log(`Request took ${(endTime - startTime).toFixed(2)}ms`);
            console.groupEnd();
            return responseData;
        } catch (error) {
            console.error('Error Details:', error);
            console.groupEnd();
            throw error;
        }
    },

    async delete(endpoint) {
        const startTime = performance.now();
        try {
            console.group(`%c[API] DELETE Request: ${API_BASE_URL}${endpoint}`, 'color: #F44336; font-weight: bold;');
            console.log('Time:', new Date().toISOString());

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE'
            });

            console.log('Status:', response.status, response.statusText);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                console.error('Error Data:', errorData);
                const error = new Error(errorData.detail || 'Ошибка при удалении данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            const endTime = performance.now();
            console.log(`Request took ${(endTime - startTime).toFixed(2)}ms`);
            console.groupEnd();
            return true;
        } catch (error) {
            console.error('Error Details:', error);
            console.groupEnd();
            throw error;
        }
    },

    async patch(endpoint, data) {
        const startTime = performance.now();
        try {
            console.group(`%c[API] PATCH Request: ${API_BASE_URL}${endpoint}`, 'color: #9C27B0; font-weight: bold;');
            console.log('Time:', new Date().toISOString());
            console.log('Request Data:', data);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            console.log('Status:', response.status, response.statusText);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                console.error('Error Data:', errorData);
                const error = new Error(errorData.detail || 'Ошибка при частичном обновлении данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            const responseData = await response.json();
            const endTime = performance.now();
            console.log('Response Data:', responseData);
            console.log(`Request took ${(endTime - startTime).toFixed(2)}ms`);
            console.groupEnd();
            return responseData;
        } catch (error) {
            console.error('Error Details:', error);
            console.groupEnd();
            throw error;
        }
    }
};

/**
 * Class for barcode scanner functionality.
 * Handles scanner input and processes equipment data.
 */
class BarcodeScanner {
    /**
     * Initialize barcode scanner.
     * @param {Function} onScan - Callback function for successful scan
     * @param {Function} onError - Callback function for scan errors
     */
    constructor(onScan = null, onError = null) {
        this.isListening = false;
        this.buffer = '';
        this.lastChar = '';
        this.lastTime = 0;
        this.THRESHOLD = 20; // Maximum ms between keystrokes to be considered from scanner

        // Default handlers
        this.onScan = onScan || ((equipment) => console.log('Scanned equipment:', equipment));
        this.onError = onError || ((error) => console.error('Scanner error:', error));

        // Initialize session if scanStorage is available
        this.sessionId = null;
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

            let addedToSession = false; // Flag to track if item was actually added
            let isDuplicate = false;

            // Save to session storage if available
            if (window.scanStorage && this.sessionId) {
                const result = window.scanStorage.addEquipment(this.sessionId, equipment);
                if (result === 'duplicate') {
                    isDuplicate = true;
                    console.log(`Barcode ${barcode} corresponds to equipment ID ${equipment.id} which is already in session ${this.sessionId}.`);
                } else if (typeof result === 'object' && result !== null) {
                    // Check if the result is a session object (success)
                    addedToSession = true;
                }
            }

            // Trigger onScan only if successfully added (or if no storage used)
            // Pass additional info about duplication status
            this.onScan(equipment, { isDuplicate: isDuplicate, addedToSession: addedToSession });

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

// Form validation
const validateForm = (formElement) => {
    const form = formElement instanceof HTMLFormElement ? formElement : document.querySelector(formElement);
    if (!form) return false;

    form.classList.add('was-validated');
    return form.checkValidity();
};

// Date range picker initialization
const initDateRangePicker = (element, options = {}) => {
    const defaultOptions = {
        locale: {
            format: 'DD.MM.YYYY',
            separator: ' - ',
            applyLabel: 'Применить',
            cancelLabel: 'Отмена',
            fromLabel: 'С',
            toLabel: 'По',
            customRangeLabel: 'Произвольный',
            weekLabel: 'Н',
            daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
            monthNames: [
                'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
            ],
            firstDay: 1
        },
        opens: 'right',
        autoApply: true,
        ...options
    };

    return new daterangepicker(element, defaultOptions);
};

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

                console.log('Request URL:', API_BASE_URL + url);
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
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="printBarcode('${item.id}', '${item.barcode}')">
                        <i class="fas fa-print"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-success btn-qrcode" onclick="addToScanSession('${item.id}', '${item.name}', '${item.barcode}', '${item.category_id}', '${item.category_name}')">
                        <i class="fas fa-qrcode"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
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
    const clientCompany = escapeHTML(client.company || ''); // Handle null/undefined company
    const clientEmail = escapeHTML(client.email || ''); // Handle null/undefined email
    const clientPhone = escapeHTML(client.phone || ''); // Handle null/undefined phone
    const bookingsCount = escapeHTML(client.bookings_count !== undefined ? client.bookings_count : '0'); // Handle undefined counts
    const createdAt = client.created_at ? formatDate(client.created_at) : 'N/A'; // Use existing formatDate

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
    if (!clientsGrid) return; // Exit if grid element not found

    clientsGrid.innerHTML = ''; // Clear current clients

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
            params.sort_by = sortBy; // Parameter name expected by backend
            params.sort_order = sortOrder; // Parameter name expected by backend
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
    const searchInput = document.getElementById('searchClient');
    const sortOrderSelect = document.getElementById('sortOrder');
    const clientsGrid = document.getElementById('clientsGrid');

    if (!searchInput || !sortOrderSelect || !clientsGrid) {
        console.log('Client search/sort controls or grid not found on this page.');
        return; // Exit if elements aren't present
    }

    console.log('Initializing client controls (search & sort)...');

    // Use debounce for fetching/updating
    const debouncedFetch = debounce(fetchAndUpdateClients, 300);

    searchInput.addEventListener('input', debouncedFetch);
    sortOrderSelect.addEventListener('change', fetchAndUpdateClients); // No debounce needed on change

    // Initial load (optional, if you want to load based on initial state)
     fetchAndUpdateClients(); // Load based on initial input/select values

}

// Document ready handler
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));

    // Initialize equipment search
    if (document.getElementById('searchInput')) {
        window.equipmentSearch.init();
    }

    initClientControls(); // Initialize client search and sort
});
