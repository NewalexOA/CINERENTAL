// Bookings management for CINERENTAL

// Проверяем, существует ли уже функция showToast
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
    // Initialize date range picker
    initDateRangePicker(selector) {
        $(selector).daterangepicker({
            locale: {
                format: 'DD.MM.YYYY',
                separator: ' - ',
                applyLabel: 'Применить',
                cancelLabel: 'Отмена',
                fromLabel: 'От',
                toLabel: 'До',
                customRangeLabel: 'Произвольный',
                weekLabel: 'Н',
                daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
                monthNames: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
                firstDay: 1
            }
        });
    },

    // Load clients for forms
    async loadClients(selector = 'select[name="client_id"]') {
        try {
            const clients = await api.get('/clients/');
            const selects = document.querySelectorAll(selector);

            selects.forEach(select => {
                // Keep the first option (usually "All clients" or similar)
                const firstOption = select.querySelector('option:first-child');
                select.innerHTML = '';

                if (firstOption) {
                    select.appendChild(firstOption);
                }

                // Add client options
                clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = `${client.first_name} ${client.last_name}`;
                    select.appendChild(option);
                });
            });
        } catch (error) {
            console.error('Error loading clients:', error);
            showToast('Ошибка при загрузке клиентов', 'danger');
        }
    },

    // Load equipment for selection
    async loadEquipment(containerId = 'equipmentSelection') {
        try {
            const equipment = await api.get('/equipment/');
            const container = document.getElementById(containerId);

            if (!container) return;

            container.innerHTML = '';

            if (equipment.length === 0) {
                container.innerHTML = '<p class="text-muted">Нет доступного оборудования</p>';
                return;
            }

            // Group equipment by category
            const categories = {};
            equipment.forEach(item => {
                const categoryName = item.category_name || 'Без категории';
                if (!categories[categoryName]) {
                    categories[categoryName] = [];
                }
                categories[categoryName].push(item);
            });

            // Create equipment selection
            Object.entries(categories).forEach(([category, items]) => {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'mb-3';
                categoryDiv.innerHTML = `<h6>${category}</h6>`;

                items.forEach(item => {
                    const equipmentDiv = document.createElement('div');
                    equipmentDiv.className = 'form-check';
                    equipmentDiv.innerHTML = `
                        <input class="form-check-input" type="radio" name="equipment_id"
                            value="${item.id}" id="equipment${item.id}">
                        <label class="form-check-label" for="equipment${item.id}">
                            ${item.name} - ${item.daily_rate} ₽/день
                            <small class="text-muted d-block">
                                ${item.serial_number ? `S/N: ${item.serial_number}` : ''}
                                ${item.barcode ? `Штрих-код: ${item.barcode}` : ''}
                            </small>
                        </label>
                    `;
                    categoryDiv.appendChild(equipmentDiv);
                });

                container.appendChild(categoryDiv);
            });
        } catch (error) {
            console.error('Error loading equipment:', error);
            showToast('Ошибка при загрузке оборудования', 'danger');
        }
    },

    // Load equipment list for modal
    async loadEquipmentList(bookingId, containerId) {
        const container = document.getElementById(containerId);

        try {
            const booking = await api.get(`/bookings/${bookingId}`);

            container.innerHTML = booking.equipment.map(item => `
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${item.name}</h6>
                        <small class="text-muted">${item.category.name}</small>
                    </div>
                    <p class="mb-1">
                        <small>
                            <span class="me-3">S/N: ${item.serial_number}</span>
                            <span>Штрих-код: ${item.barcode}</span>
                        </small>
                    </p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading equipment list:', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    Ошибка загрузки списка оборудования
                </div>
            `;
        }
    },

    // Create new booking
    async createBooking() {
        try {
            const form = document.getElementById('newBookingForm');
            const formData = new FormData(form);

            // Validate form
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            // Get selected equipment
            const selectedEquipment = form.querySelector('input[name="equipment_id"]:checked');
            if (!selectedEquipment) {
                showToast('Выберите оборудование', 'warning');
                return;
            }

            // Parse date range
            const dateRange = formData.get('date_range').split(' - ');
            if (dateRange.length !== 2) {
                showToast('Выберите период бронирования', 'warning');
                return;
            }

            // Prepare data
            const data = {
                client_id: parseInt(formData.get('client_id')),
                equipment_id: parseInt(selectedEquipment.value),
                start_date: moment(dateRange[0], 'DD.MM.YYYY').format('YYYY-MM-DDT00:00:00'),
                end_date: moment(dateRange[1], 'DD.MM.YYYY').format('YYYY-MM-DDT00:00:00'),
                total_amount: 0,
                notes: formData.get('notes') || ''
            };

            // Send request
            await api.post('/bookings', data);

            // Show success message
            showToast('Бронирование успешно создано', 'success');

            // Reset form and close modal
            form.reset();
            $('#newBookingModal').modal('hide');

            // Reload bookings
            this.loadBookings();
        } catch (error) {
            console.error('Error creating booking:', error);
            showToast('Ошибка при создании бронирования', 'danger');
        }
    },

    /**
     * Load booking data for editing
     * @param {number} bookingId - ID of the booking to edit
     * @param {string} formId - ID of the form element
     * @param {string} equipmentContainerId - ID of the container for equipment selection
     */
    loadBookingForEdit: async function(bookingId, formId, equipmentContainerId) {
        try {
            // Load clients for dropdown
            await this.loadClients(`#${formId} select[name="client_id"]`);

            // Load equipment options
            await this.loadEquipment(equipmentContainerId);

            // Get booking details
            const booking = await api.get(`/bookings/${bookingId}`);

            // Set form values
            const form = document.getElementById(formId);
            form.querySelector('select[name="client_id"]').value = booking.client_id;

            // Set date range
            const startDate = moment(booking.start_date);
            const endDate = moment(booking.end_date);
            const dateRangeInput = form.querySelector('input[name="date_range"]');

            $(dateRangeInput).daterangepicker({
                startDate: startDate,
                endDate: endDate,
                locale: {
                    format: 'DD.MM.YYYY',
                    separator: ' - ',
                    applyLabel: 'Применить',
                    cancelLabel: 'Отмена'
                }
            });

            // Set equipment selection
            const equipmentContainer = document.getElementById(equipmentContainerId);
            const equipmentCheckbox = equipmentContainer.querySelector(`input[value="${booking.equipment_id}"]`);
            if (equipmentCheckbox) {
                equipmentCheckbox.checked = true;
            }

            // Set up update button
            document.getElementById('updateBooking').addEventListener('click', () => {
                this.updateBooking(form, bookingId);
            });

            // Set up delete button
            document.getElementById('deleteBooking').addEventListener('click', () => {
                this.deleteBooking(bookingId);
            });
        } catch (error) {
            console.error('Error loading booking data:', error);
            showToast('Ошибка при загрузке данных бронирования', 'danger');
        }
    },

    /**
     * Update booking
     * @param {HTMLFormElement} form - Form element with booking data
     * @param {number} bookingId - ID of the booking to update
     */
    updateBooking: async function(form, bookingId) {
        try {
            const formData = new FormData(form);
            const dateRange = formData.get('date_range').split(' - ');

            // Get selected equipment
            const equipmentContainer = document.getElementById('editEquipmentSelection');
            const selectedEquipment = equipmentContainer.querySelector('input[type="radio"]:checked');

            if (!selectedEquipment) {
                showToast('Выберите оборудование', 'warning');
                return;
            }

            const data = {
                client_id: parseInt(formData.get('client_id')),
                equipment_id: parseInt(selectedEquipment.value),
                start_date: moment(dateRange[0], 'DD.MM.YYYY').format('YYYY-MM-DDT00:00:00'),
                end_date: moment(dateRange[1], 'DD.MM.YYYY').format('YYYY-MM-DDT00:00:00'),
                total_amount: 0,
                notes: formData.get('notes')
            };

            await api.put(`/bookings/${bookingId}`, data);
            showToast('Бронирование успешно обновлено', 'success');
            location.reload();
        } catch (error) {
            console.error('Error updating booking:', error);
            showToast('Ошибка при обновлении бронирования', 'danger');
        }
    },

    /**
     * Delete booking
     * @param {number} bookingId - ID of the booking to delete
     */
    deleteBooking: async function(bookingId) {
        try {
            await api.delete(`/bookings/${bookingId}`);
            showToast('Бронирование успешно удалено', 'success');
            window.location.href = '/bookings';
        } catch (error) {
            console.error('Error deleting booking:', error);
            showToast('Ошибка при удалении бронирования', 'danger');
        }
    },

    // Helper function to parse date range
    parseDateRange(dateRange) {
        const [start, end] = dateRange.split(' - ');
        return {
            start_date: moment(start, 'DD.MM.YYYY').format('YYYY-MM-DDT00:00:00'),
            end_date: moment(end, 'DD.MM.YYYY').format('YYYY-MM-DDT00:00:00'),
            total_amount: 0 // Будет рассчитано на сервере
        };
    },

    // Helper function to format date range
    formatDateRange(start, end) {
        return `${moment(start).format('DD.MM.YYYY')} - ${moment(end).format('DD.MM.YYYY')}`;
    },

    /**
     * Initialize booking manager
     */
    init: function() {
        // Initialize date range picker for new bookings
        this.initDateRangePicker();

        // Load clients and equipment
        this.loadClients();
        this.loadEquipment();

        // Load bookings if we're on the bookings list page
        if (document.getElementById('bookingsTableBody')) {
            this.loadBookings();
        }

        // Initialize event listeners
        this.initEventListeners();
    },

    /**
     * Initialize event listeners
     */
    initEventListeners: function() {
        // Submit new booking form
        const newBookingForm = document.getElementById('newBookingForm');
        if (newBookingForm) {
            document.getElementById('submitBooking').addEventListener('click', () => {
                this.createBooking();
            });
        }

        // Filter bookings
        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.filterBookings();
            });

            document.getElementById('resetFilter').addEventListener('click', () => {
                filterForm.reset();
                this.loadBookings();
            });
        }

        // Update booking
        const updateBookingBtn = document.getElementById('updateBooking');
        if (updateBookingBtn) {
            updateBookingBtn.addEventListener('click', () => {
                const form = document.getElementById('editBookingForm');
                const bookingId = form.querySelector('input[name="id"]').value;
                this.updateBooking(form, bookingId);
            });
        }

        // Delete booking
        const deleteBookingBtn = document.getElementById('deleteBooking');
        if (deleteBookingBtn && !deleteBookingBtn.hasAttribute('data-event-attached')) {
            deleteBookingBtn.setAttribute('data-event-attached', 'true');
            deleteBookingBtn.addEventListener('click', () => {
                const bookingId = deleteBookingBtn.getAttribute('data-booking-id');
                if (bookingId) {
                    this.deleteBooking(bookingId);
                }
            });
        }

        // Change booking status
        const changeStatusBtn = document.getElementById('changeStatus');
        if (changeStatusBtn) {
            changeStatusBtn.addEventListener('click', () => {
                const form = document.getElementById('changeStatusForm');
                const bookingId = form.querySelector('input[name="booking_id"]').value;
                const status = form.querySelector('select[name="status"]').value;
                this.changeBookingStatus(bookingId, status);
            });
        }

        // Process payment
        const savePaymentBtn = document.getElementById('savePayment');
        if (savePaymentBtn) {
            savePaymentBtn.addEventListener('click', () => {
                const form = document.getElementById('paymentForm');
                const bookingId = form.querySelector('input[name="booking_id"]').value;
                const amount = parseFloat(form.querySelector('input[name="amount"]').value);
                const paymentStatus = form.querySelector('select[name="payment_status"]').value;
                this.processPayment(bookingId, amount, paymentStatus);
            });
        }
    },

    /**
     * Render bookings in the table
     * @param {Array} bookings - Array of booking objects
     */
    renderBookings: function(bookings) {
        const tableBody = document.getElementById('bookingsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (bookings.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">Нет бронирований</td>
                </tr>
            `;
            return;
        }

        bookings.forEach(booking => {
            const row = document.createElement('tr');

            // Format dates
            const startDate = moment(booking.start_date).format('DD.MM.YYYY');
            const endDate = moment(booking.end_date).format('DD.MM.YYYY');

            // Create status badge
            const statusClass = this.getStatusClass(booking.booking_status);
            const paymentStatusClass = this.getPaymentStatusClass(booking.payment_status);

            row.innerHTML = `
                <td>
                    <a href="/bookings/${booking.id}" class="text-decoration-none fw-bold">
                        #${booking.id}
                    </a>
                </td>
                <td>${booking.client_name}</td>
                <td>${booking.equipment_name}</td>
                <td>${startDate} - ${endDate}</td>
                <td><span class="badge bg-${statusClass}">${booking.booking_status}</span></td>
                <td><span class="badge bg-${paymentStatusClass}">${booking.payment_status}</span></td>
                <td>
                    <div class="d-flex gap-1">
                        <a href="/bookings/${booking.id}" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-eye"></i>
                        </a>
                        <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="modal"
                            data-bs-target="#editBookingModal" data-booking-id="${booking.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" data-bs-toggle="modal"
                            data-bs-target="#deleteBookingModal" data-booking-id="${booking.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            tableBody.appendChild(row);
        });

        // Add event listeners for edit buttons
        document.querySelectorAll('[data-bs-target="#editBookingModal"]').forEach(button => {
            button.addEventListener('click', () => {
                const bookingId = button.getAttribute('data-booking-id');
                this.loadBookingForEdit(bookingId, 'editBookingForm', 'editEquipmentSelection');
            });
        });

        // Add event listeners for delete buttons
        document.querySelectorAll('[data-bs-target="#deleteBookingModal"]').forEach(button => {
            button.addEventListener('click', () => {
                const bookingId = button.getAttribute('data-booking-id');
                document.getElementById('deleteBooking').setAttribute('data-booking-id', bookingId);
            });
        });

        // Set up delete confirmation
        document.getElementById('deleteBooking').addEventListener('click', () => {
            const bookingId = document.getElementById('deleteBooking').getAttribute('data-booking-id');
            this.deleteBooking(bookingId);
        });
    },

    /**
     * Get Bootstrap color class for booking status
     * @param {string} status - Booking status
     * @returns {string} - Bootstrap color class
     */
    getStatusClass: function(status) {
        const statusMap = {
            'PENDING': 'warning',
            'CONFIRMED': 'info',
            'ACTIVE': 'primary',
            'COMPLETED': 'success',
            'CANCELLED': 'danger',
            'OVERDUE': 'dark'
        };
        return statusMap[status] || 'secondary';
    },

    /**
     * Get Bootstrap color class for payment status
     * @param {string} status - Payment status
     * @returns {string} - Bootstrap color class
     */
    getPaymentStatusClass: function(status) {
        const statusMap = {
            'PENDING': 'warning',
            'PARTIAL': 'info',
            'PAID': 'success',
            'REFUNDED': 'danger'
        };
        return statusMap[status] || 'secondary';
    },

    /**
     * Load bookings from API
     */
    loadBookings: async function() {
        try {
            const bookings = await api.get('/bookings');
            this.renderBookings(bookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            showToast('Ошибка при загрузке бронирований', 'danger');
        }
    },

    /**
     * Filter bookings
     */
    filterBookings: async function() {
        const form = document.getElementById('filterForm');
        const formData = new FormData(form);

        const filters = {
            client_id: formData.get('client_id') || undefined,
            equipment_id: formData.get('equipment_id') || undefined,
            booking_status: formData.get('booking_status') || undefined,
            payment_status: formData.get('payment_status') || undefined
        };

        // Remove undefined values
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) {
                delete filters[key];
            }
        });

        // Add date range if provided
        const dateRange = formData.get('date_range');
        if (dateRange) {
            const [start, end] = dateRange.split(' - ');
            filters.start_date = moment(start, 'DD.MM.YYYY').format('YYYY-MM-DDT00:00:00');
            filters.end_date = moment(end, 'DD.MM.YYYY').format('YYYY-MM-DDT00:00:00');
        }

        try {
            // Convert filters to query string
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                queryParams.append(key, value);
            });

            const bookings = await api.get(`/bookings?${queryParams.toString()}`);
            this.renderBookings(bookings);

            showToast('Фильтры применены', 'success');
        } catch (error) {
            console.error('Error filtering bookings:', error);
            showToast('Ошибка при фильтрации бронирований', 'danger');
        }
    },

    /**
     * Initialize date range picker
     * @param {string} [selector='input[name="date_range"]'] - Selector for date range input
     */
    initDateRangePicker: function(selector = 'input[name="date_range"]') {
        const inputs = document.querySelectorAll(selector);

        inputs.forEach(input => {
            $(input).daterangepicker({
                autoUpdateInput: false,
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
                }
            });

            $(input).on('apply.daterangepicker', function(ev, picker) {
                $(this).val(picker.startDate.format('DD.MM.YYYY') + ' - ' + picker.endDate.format('DD.MM.YYYY'));
            });

            $(input).on('cancel.daterangepicker', function(ev, picker) {
                $(this).val('');
            });
        });
    },

    /**
     * Change booking status
     * @param {number} bookingId - ID of the booking
     * @param {string} status - New status
     */
    changeBookingStatus: async function(bookingId, status) {
        try {
            await api.put(`/bookings/${bookingId}/status`, { status: status });
            showToast('Статус бронирования успешно изменен', 'success');
            location.reload();
        } catch (error) {
            console.error('Error changing booking status:', error);
            showToast('Ошибка при изменении статуса бронирования', 'danger');
        }
    },

    /**
     * Process payment for booking
     * @param {number} bookingId - ID of the booking
     * @param {number} amount - Payment amount
     * @param {string} paymentStatus - New payment status
     */
    processPayment: async function(bookingId, amount, paymentStatus) {
        try {
            await api.put(`/bookings/${bookingId}/payment`, {
                paid_amount: amount,
                payment_status: paymentStatus
            });
            showToast('Оплата успешно обработана', 'success');
            location.reload();
        } catch (error) {
            console.error('Error processing payment:', error);
            showToast('Ошибка при обработке оплаты', 'danger');
        }
    },
};

// Initialize booking manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    bookingManager.init();
});
