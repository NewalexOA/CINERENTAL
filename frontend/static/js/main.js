// Main JavaScript for CINERENTAL

// Constants
const API_BASE_URL = '/api/v1';

// Utility functions
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

// Document ready handler
document.addEventListener('DOMContentLoaded', () => {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
});
