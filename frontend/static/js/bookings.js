// Bookings management for ACT-RENTAL

// Import utilities
import { debounce } from './utils/common.js';

// Check if the showToast function already exists
if (typeof window.showToast !== 'function') {
    // Toast notification
    window.showToast = function(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');

        if (!toastContainer) {
            // Create toast container if it doesn't exist
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }

        // Create toast element
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

        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Booking management
const bookingManager = {
    // DOM Elements
    elements: {
        form: document.getElementById('filterForm'),
        clientSearchInput: document.getElementById('clientSearchInput'),
        equipmentSearchInput: document.getElementById('equipmentSearchInput'),
        paymentStatusSelect: document.querySelector('select[name="payment_status"]'),
        dateRangeInput: document.querySelector('input[name="date_range"]'),
        bookingsTableBody: document.getElementById('bookingsTableBody'),
        resetButton: document.getElementById('resetFilter'),
        clientSearchSpinner: document.getElementById('client-search-spinner'),
        equipmentSearchSpinner: document.getElementById('equipment-search-spinner'),
        activeOnlyCheckbox: document.getElementById('activeOnlyCheckbox'),
    },

    // State
    state: {
        requestId: 0, // monotonically increasing to track freshest request
        lastSuccessful: null // cache of last successful response for fallback
    },

    // Initialize the component
    init() {
        console.log('Booking Manager Initializing...');
        if (this.elements.form) {
            this.initFilterForm();
            console.log('Filter form initialized.');
        } else {
            console.warn('Filter form not found. Skipping initialization.');
        }
        // Add event listeners for modals, etc. if needed
    },

    // Initialize filter form functionality
    initFilterForm() {
        const { form, dateRangeInput, resetButton, clientSearchInput, equipmentSearchInput, paymentStatusSelect, activeOnlyCheckbox } = this.elements;

        if (!form) return;

        // Debounced version of loadBookings for input fields
        const debouncedLoadBookings = debounce(() => this.loadBookings(), 500);

        // 1. Set initial values from URL
        this.setFormValuesFromUrl();

        // 2. Initialize Date Range Picker
        if (dateRangeInput) {
            const dateRangeOptions = {
                autoUpdateInput: false,
            locale: {
                    cancelLabel: 'Очистить',
                    applyLabel: 'Применить',
                    format: 'YYYY-MM-DD',
                separator: ' - ',
                    daysOfWeek: moment.weekdaysMin(),
                    monthNames: moment.monthsShort(),
                firstDay: 1
                },
                ranges: {
                    'Сегодня': [moment(), moment()],
                    'Завтра': [moment().add(1, 'days'), moment().add(1, 'days')],
                    'Эта неделя': [moment().startOf('week'), moment().endOf('week')],
                    'Следующая неделя': [moment().add(1, 'week').startOf('week'), moment().add(1, 'week').endOf('week')],
                    'Этот месяц': [moment().startOf('month'), moment().endOf('month')],
                    'Следующий месяц': [moment().add(1, 'month').startOf('month'), moment().add(1, 'month').endOf('month')]
                },
                opens: 'left'
            };

            $(dateRangeInput).daterangepicker(dateRangeOptions);

            $(dateRangeInput).on('apply.daterangepicker', (ev, picker) => {
                $(dateRangeInput).val(picker.startDate.format('YYYY-MM-DD') + ' - ' + picker.endDate.format('YYYY-MM-DD'));
                this.loadBookings();
            });

            $(dateRangeInput).on('cancel.daterangepicker', () => {
                $(dateRangeInput).val('');
                this.loadBookings();
            });

            // Set initial value if present in URL
            const urlParams = new URLSearchParams(window.location.search);
            const dateRangeParam = urlParams.get('date_range');
            if (dateRangeParam) {
                const dates = dateRangeParam.split(' - ');
                if (dates.length === 2) {
                    const startDate = moment(dates[0], 'YYYY-MM-DD');
                    const endDate = moment(dates[1], 'YYYY-MM-DD');
                    if (startDate.isValid() && endDate.isValid()) {
                        $(dateRangeInput).data('daterangepicker').setStartDate(startDate);
                        $(dateRangeInput).data('daterangepicker').setEndDate(endDate);
                        $(dateRangeInput).val(dateRangeParam);
                    }
                }
             } else {
                $(dateRangeInput).val('');
            }

        } else {
            console.warn('Date range input not found.');
        }

        // 3. Load initial bookings based on URL/form values
        this.loadBookings();

        // 4. Add Event Listeners
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.loadBookings();
        });

        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetFilter();
            });
        }

        // --- Interactive filtering listeners ---
        if (clientSearchInput) {
             clientSearchInput.addEventListener('input', debouncedLoadBookings);
        }
        if (equipmentSearchInput) {
            equipmentSearchInput.addEventListener('input', debouncedLoadBookings);
        }
        if (paymentStatusSelect) {
            paymentStatusSelect.addEventListener('change', () => this.loadBookings());
        }
        if (activeOnlyCheckbox) {
            activeOnlyCheckbox.addEventListener('change', () => this.loadBookings());
        }
        // --- End Interactive filtering listeners ---

    },

    // Set form values based on URL parameters
    setFormValuesFromUrl() {
        const { clientSearchInput, equipmentSearchInput, paymentStatusSelect } = this.elements;
        const urlParams = new URLSearchParams(window.location.search);

        const clientSearch = urlParams.get('client_search') || '';
        const equipmentSearch = urlParams.get('equipment_search') || '';
        const paymentStatus = urlParams.get('payment_status') || '';

        if (clientSearchInput) clientSearchInput.value = clientSearch;
        if (equipmentSearchInput) equipmentSearchInput.value = equipmentSearch;
        if (paymentStatusSelect) paymentStatusSelect.value = paymentStatus;
    },

    // Get API parameters from the current form state
    getApiParams() {
        const { clientSearchInput, equipmentSearchInput, paymentStatusSelect, dateRangeInput, activeOnlyCheckbox } = this.elements;
        const params = {};

        const clientQuery = clientSearchInput ? clientSearchInput.value.trim() : '';
        const equipmentQuery = equipmentSearchInput ? equipmentSearchInput.value.trim() : '';
        const paymentStatus = paymentStatusSelect ? paymentStatusSelect.value : '';
        const dateRange = dateRangeInput ? dateRangeInput.value : '';

        if (clientQuery.length >= 3 || clientQuery.length === 0) {
             params.query = clientQuery;
        }
        if (equipmentQuery.length >= 3 || equipmentQuery.length === 0) {
            params.equipment_query = equipmentQuery;
        }
        if (paymentStatus) {
            params.payment_status = paymentStatus;
        }

        if (dateRange) {
            const dates = dateRange.split(' - ');
            if (dates.length === 2) {
                const startDate = moment(dates[0], 'YYYY-MM-DD');
                const endDate = moment(dates[1], 'YYYY-MM-DD');
                if (startDate.isValid() && endDate.isValid()) {
                     params.start_date = startDate.toISOString();
                     params.end_date = endDate.toISOString();
                }
            }
        }

        // Add active_only parameter
        if (activeOnlyCheckbox && activeOnlyCheckbox.checked) {
            params.active_only = 'true';
        } else {
            params.active_only = 'false';
        }

        console.log('API Params:', params);
        return params;
    },

    // Update browser URL based on current filters
    updateUrl() {
        const { clientSearchInput, equipmentSearchInput, paymentStatusSelect, dateRangeInput } = this.elements;
        const urlParams = new URLSearchParams();

        const clientSearch = clientSearchInput ? clientSearchInput.value.trim() : '';
        const equipmentSearch = equipmentSearchInput ? equipmentSearchInput.value.trim() : '';
        const paymentStatus = paymentStatusSelect ? paymentStatusSelect.value : '';
        const dateRange = dateRangeInput ? dateRangeInput.value : '';

        if (clientSearch) urlParams.set('client_search', clientSearch);
        if (equipmentSearch) urlParams.set('equipment_search', equipmentSearch);
        if (paymentStatus) urlParams.set('payment_status', paymentStatus);
        if (dateRange) urlParams.set('date_range', dateRange);

        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        history.pushState({}, '', newUrl);
        console.log('URL Updated:', newUrl);
    },

    // Load bookings from the API based on current filters
    async loadBookings() {
        await this.loadBookingsPage(1);
    },

    // Render the list of bookings in the table
    renderBookings(bookings) {
        const { bookingsTableBody } = this.elements;
        bookingsTableBody.innerHTML = '';

        if (!bookings || bookings.length === 0) {
            bookingsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Бронирования не найдены.</td></tr>';
            return;
        }

        bookings.forEach(booking => {
            const row = document.createElement('tr');

            // Format dates
            const startDate = moment(booking.start_date).format('DD.MM.YYYY');
            const endDate = moment(booking.end_date).format('DD.MM.YYYY');
            const period = `${startDate} - ${endDate}`;

            // Payment Status Badge
            let paymentBadgeClass = 'bg-warning text-dark';
            let paymentStatusText = 'Ожидается';
            if (booking.payment_status === 'PAID') {
                paymentBadgeClass = 'bg-success';
                paymentStatusText = 'Оплачено';
            } else if (booking.payment_status === 'CANCELLED' || booking.payment_status === 'REFUNDED') {
                paymentBadgeClass = 'bg-secondary';
                paymentStatusText = booking.payment_status === 'CANCELLED' ? 'Отменен' : 'Возвращен';
            }

            // Booking Status Badge
            let statusBadgeClass = 'bg-info';
            let statusText = booking.status || booking.booking_status;
            if (statusText === 'COMPLETED') {
                statusBadgeClass = 'bg-success';
                statusText = 'Завершено';
            } else if (statusText === 'CANCELLED') {
                statusBadgeClass = 'bg-secondary';
                statusText = 'Отменено';
            } else if (statusText === 'ACTIVE') {
                statusBadgeClass = 'bg-primary';
                statusText = 'Активно';
            } else if (statusText === 'CONFIRMED') {
                statusBadgeClass = 'bg-warning text-dark';
                statusText = 'Подтверждено';
            } else if (statusText === 'PENDING') {
                statusBadgeClass = 'bg-light text-dark';
                statusText = 'Ожидает';
            } else if (statusText === 'OVERDUE') {
                statusBadgeClass = 'bg-danger';
                statusText = 'Просрочено';
            }

            // Project link or N/A
            const projectLink = booking.project_id && booking.project_name
                ? `<a href="/projects/${booking.project_id}">${booking.project_name}</a>`
                : '<span class="text-muted">N/A</span>';

            // Quantity display
            const quantityDisplay = booking.quantity > 1 ? ` (x${booking.quantity})` : '';

            row.innerHTML = `
                <td><a href="/clients/${booking.client_id}">${booking.client_name || 'Не указан'}</a></td>
                <td>
                    <div>
                        <a href="/equipment/${booking.equipment_id}">${booking.equipment_name || 'N/A'}</a>${quantityDisplay}
                    </div>
                    ${booking.equipment_serial_number ? `<small class="text-muted">S/N: ${booking.equipment_serial_number}</small>` : ''}
                </td>
                <td>${period}</td>
                <td>${projectLink}</td>
                <td><span class="badge ${statusBadgeClass}">${statusText}</span></td>
                <td><span class="badge ${paymentBadgeClass}">${paymentStatusText}</span></td>
            `;
            bookingsTableBody.appendChild(row);
        });
    },

    // Render pagination information and controls
    renderPaginationInfo(data) {
        const pageStart = document.getElementById('pageStart');
        const pageEnd = document.getElementById('pageEnd');
        const totalItems = document.getElementById('totalItems');
        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');

        if (!pageStart || !pageEnd || !totalItems || !prevPage || !nextPage) return;

        const startItem = (data.page - 1) * data.size + 1;
        const endItem = Math.min(data.page * data.size, data.total);

        pageStart.textContent = data.total > 0 ? startItem : 0;
        pageEnd.textContent = endItem;
        totalItems.textContent = data.total;

        // Update pagination controls
        const prevPageItem = prevPage.closest('.page-item');
        const nextPageItem = nextPage.closest('.page-item');

        prevPageItem.classList.toggle('disabled', data.page <= 1);
        nextPageItem.classList.toggle('disabled', data.page >= data.pages);

        // Add click handlers
        prevPage.onclick = (e) => {
            e.preventDefault();
            if (data.page > 1) {
                this.loadBookingsPage(data.page - 1);
            }
        };

        nextPage.onclick = (e) => {
            e.preventDefault();
            if (data.page < data.pages) {
                this.loadBookingsPage(data.page + 1);
            }
        };
    },

    // Load specific page of bookings
    async loadBookingsPage(page = 1) {
        const { bookingsTableBody, clientSearchSpinner, equipmentSearchSpinner } = this.elements;
        if (!bookingsTableBody) return;

        if (clientSearchSpinner) clientSearchSpinner.classList.remove('d-none');
        if (equipmentSearchSpinner) equipmentSearchSpinner.classList.remove('d-none');

        this.updateUrl();
        const apiParams = this.getApiParams();
        apiParams.page = page;
        const queryString = new URLSearchParams(apiParams).toString();

        // Track request to prevent stale responses from overwriting UI
        const requestId = ++this.state.requestId;

        try {
            const response = await fetch(`/api/v1/bookings/?${queryString}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Ignore stale responses if a newer request was started
            if (requestId !== this.state.requestId) {
                return;
            }

            this.renderBookings(data.items);
            this.renderPaginationInfo(data);

            // Cache successful data for potential fallback rendering
            this.state.lastSuccessful = data;
        } catch (error) {
            console.error('Error loading bookings:', error);
            if (requestId !== this.state.requestId) {
                // If stale, just exit quietly
                return;
            }
            if (this.state.lastSuccessful) {
                this.renderBookings(this.state.lastSuccessful.items || []);
                this.renderPaginationInfo(this.state.lastSuccessful);
            } else {
                bookingsTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Ошибка загрузки бронирований.</td></tr>';
            }
        } finally {
            if (clientSearchSpinner) clientSearchSpinner.classList.add('d-none');
            if (equipmentSearchSpinner) equipmentSearchSpinner.classList.add('d-none');
        }
    },

    // Reset filter form and reload bookings
    resetFilter() {
        const { form, clientSearchInput, equipmentSearchInput, paymentStatusSelect, dateRangeInput } = this.elements;
        if (form) form.reset();
                if (clientSearchInput) clientSearchInput.value = '';
        if (equipmentSearchInput) equipmentSearchInput.value = '';
        if (paymentStatusSelect) paymentStatusSelect.value = '';
         if (dateRangeInput) {
             $(dateRangeInput).val('');
         }

        this.loadBookings();
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if there is an equipment parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const equipmentId = urlParams.get('equipment');

    // Initialize bookings functionality
    bookingManager.init();

    // If equipment parameter exists, open the booking modal with preselected equipment
    if (equipmentId) {
        // We need to wait for the equipment to load before opening the modal
        const checkEquipmentLoaded = setInterval(() => {
            const equipmentSelection = document.getElementById('equipmentSelection');
            if (equipmentSelection && equipmentSelection.querySelector('input[type="radio"]')) {
                clearInterval(checkEquipmentLoaded);

                // Find the equipment radio button
                const equipmentRadio = equipmentSelection.querySelector(`input[value="${equipmentId}"]`);
                if (equipmentRadio) {
                    equipmentRadio.checked = true;

                    // Open the modal
                    const modal = new bootstrap.Modal(document.getElementById('newBookingModal'));
                    modal.show();
                } else {
                    console.error(`Equipment with ID ${equipmentId} not found`);
                    showToast('Оборудование не найдено или недоступно для бронирования', 'warning');
                }
            }
        }, 100);

        // Set a timeout to avoid infinite loop if equipment doesn't load
        setTimeout(() => clearInterval(checkEquipmentLoaded), 5000);
    }
});
