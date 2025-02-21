// Main JavaScript for CINERENTAL

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

// API calls
const api = {
    async get(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    },

    async post(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error posting data:', error);
            throw error;
        }
    },

    async put(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Error updating data:', error);
            throw error;
        }
    },

    async delete(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
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

// Toast notifications
const showToast = (message, type = 'info') => {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type}`;
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

    document.getElementById('toast-container').appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
};

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
        const searchSpinner = document.querySelector('#search-spinner');
        const initialEquipment = [...document.getElementById('equipmentTable').children];

        searchInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.trim();
            console.log('Search query:', query);  // Debug log

            if (query.length < 3) {
                // Restore initial table state for short queries
                const table = document.getElementById('equipmentTable');
                table.innerHTML = '';
                initialEquipment.forEach(row => table.appendChild(row.cloneNode(true)));
                return;
            }

            searchSpinner.classList.remove('d-none');
            try {
                console.log('Search URL:', API_BASE_URL + `/equipment/search/${encodeURIComponent(query)}`);  // Debug log
                const results = await api.get(`/equipment/search/${encodeURIComponent(query)}`);
                console.log('Search results:', results);  // Debug log

                // Update table with results
                const table = document.getElementById('equipmentTable');
                if (!table) {
                    console.error('Table element not found');  // Debug log
                    return;
                }

                table.innerHTML = results.map(item => `
                    <tr>
                        <td>
                            <div class="fw-bold">${item.name}</div>
                            <small class="text-muted">${item.description || ''}</small>
                        </td>
                        <td>${item.category_name || 'Без категории'}</td>
                        <td>${item.barcode}</td>
                        <td>
                            <span class="badge bg-${item.status === 'AVAILABLE' ? 'success' : item.status === 'RENTED' ? 'warning' : 'danger'}">
                                ${item.status}
                            </span>
                        </td>
                        <td>${formatCurrency(item.daily_rate)}</td>
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
                `).join('');
            } catch (error) {
                console.error('Search error:', error);  // Debug log
                showToast('Ошибка при поиске оборудования', 'danger');
            } finally {
                searchSpinner.classList.add('d-none');
            }
        }, 300));
    }
};

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
