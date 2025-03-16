// Main JavaScript for rental equipment management system

// Constants
const API_BASE_URL = '/api/v1';

// Utility functions
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
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

    // Initialize and show toas
    const bsToast = new bootstrap.Toast(toast);
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
    async get(endpoint) {
        try {
            const url = endpoint.includes('?') || endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
            const response = await fetch(`${API_BASE_URL}${url}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                const error = new Error(errorData.detail || 'Ошибка при получении данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    },

    async post(endpoint, data) {
        try {
            // Convert decimal fields to strings to avoid precision issues
            if (data && typeof data === 'object') {
                Object.keys(data).forEach(key => {
                    if (typeof data[key] === 'number' && key.includes('cost')) {
                        data[key] = String(data[key]);
                    }
                });
            }

            console.log('API POST request to:', API_BASE_URL + endpoint);
            console.log('Data being sent:', JSON.stringify(data, null, 2));

            const url = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
            const response = await fetch(`${API_BASE_URL}${url}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            // Save response text
            const responseText = await response.text();
            let responseData;

            try {
                // Try to parse JSON
                responseData = JSON.parse(responseText);
            } catch (e) {
                // If parsing fails, use text
                responseData = responseText;
            }

            if (!response.ok) {
                console.error('API error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: responseData
                });

                const error = new Error(`API Error: ${response.status} ${response.statusText}`);
                error.response = {
                    status: response.status,
                    statusText: response.statusText,
                    data: responseData
                };
                throw error;
            }

            // If successful, return data
            return responseData;
        } catch (error) {
            console.error('Error posting data:', error);
            throw error;
        }
    },

    async patch(endpoint, data) {
        try {
            const url = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
            const response = await fetch(`${API_BASE_URL}${url}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                const error = new Error(errorData.detail || 'Ошибка при обновлении данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            return await response.json();
        } catch (error) {
            console.error('Error patching data:', error);
            throw error;
        }
    },

    async put(endpoint, data) {
        try {
            const url = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
            const response = await fetch(`${API_BASE_URL}${url}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                const error = new Error(errorData.detail || 'Ошибка при отправке данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            return await response.json();
        } catch (error) {
            console.error('Error putting data:', error);
            throw error;
        }
    },

    async delete(endpoint) {
        try {
            const url = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
            const response = await fetch(`${API_BASE_URL}${url}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { detail: 'Network error or empty response' };
                }
                const error = new Error(errorData.detail || 'Error deleting data');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            // Check if there is content to parse
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json') && response.status !== 204) {
                try {
                    return await response.json();
                } catch (e) {
                    console.log('Response does not contain JSON data, returning success result');
                    return { success: true };
                }
            }

            // If response is empty or status is 204 No Content, return success
            return { success: true };
        } catch (error) {
            console.error('Error deleting data:', error);
            throw error;
        }
    }
};

// Scanner integration
class BarcodeScanner {
    constructor() {
        this.isListening = false;
        this.buffer = '';
        this.lastScan = null;
    }

    start() {
        if (this.isListening) return;
        this.isListening = true;
        document.addEventListener('keypress', this.handleKeyPress.bind(this));
        console.log('Barcode scanner listening started');
    }

    stop() {
        this.isListening = false;
        document.removeEventListener('keypress', this.handleKeyPress.bind(this));
        console.log('Barcode scanner listening stopped');
    }

    handleKeyPress(event) {
        if (!this.isListening) return;

        // Ignore if the event target is an input field
        if (event.target.tagName === 'INPUT') return;

        if (event.key === 'Enter') {
            this.processBarcode(this.buffer);
            this.buffer = '';
        } else {
            this.buffer += event.key;
        }
    }

    async processBarcode(barcode) {
        if (!barcode) return;

        try {
            const equipment = await api.get(`/equipment/barcode/${barcode}`);
            this.onScan(equipment);
        } catch (error) {
            console.error('Error processing barcode:', error);
            this.onError(error);
        }
    }

    onScan(equipment) {
        // Override this method to handle successful scans
        console.log('Equipment scanned:', equipment);
    }

    onError(error) {
        // Override this method to handle scan errors
        console.error('Scan error:', error);
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
const equipmentSearch = {
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
                    <button type="button" class="btn btn-sm btn-outline-secondary" onclick="copyBarcode('${item.barcode}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
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
        equipmentSearch.init();
    }
});
