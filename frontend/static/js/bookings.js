// Bookings management for ACT-RENTAL

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
    // Main initialization
    init() {
        // Initialize date range pickers
        this.initDateRangePicker('input[name="date_range"]');

        // Load clients for the forms
        this.loadClients();

        // Initialize form handlers
        this.initFormHandlers();

        // Initialize for specific elements if they exist
        if (document.getElementById('newBookingForm')) {
            this.initNewBookingForm();
        }

        if (document.getElementById('editBookingForm')) {
            this.initEditBookingForm();
        }

        if (document.getElementById('paymentForm')) {
            this.initPaymentForm();
        }

        // Booking details page specific
        const completeBookingBtn = document.getElementById('completeBookingBtn');
        if (completeBookingBtn) {
            completeBookingBtn.addEventListener('click', () => {
                const bookingId = completeBookingBtn.getAttribute('data-booking-id');
                this.changeBookingStatus(bookingId, 'COMPLETED');
            });
        }
    },

    // Initialize date range picker
    initDateRangePicker(selector = 'input[name="date_range"]') {
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
                $(this).trigger('change'); // Trigger change event for search updates
            });

            $(input).on('cancel.daterangepicker', function(ev, picker) {
                $(this).val('');
                $(this).trigger('change'); // Trigger change event for search updates
            });
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
                    option.textContent = client.name;
                    select.appendChild(option);
                });
            });
        } catch (error) {
            console.error('Error loading clients:', error);
            showToast('Ошибка при загрузке клиентов', 'danger');
        }
    },

    // Initialize form handlers for various actions
    initFormHandlers() {
        // Setup form submission for new bookings
        const submitBookingBtn = document.getElementById('submitBooking');
        if (submitBookingBtn) {
            submitBookingBtn.addEventListener('click', () => {
                this.createBooking();
            });
        }

        // Setup form submission for editing bookings
        const updateBookingBtn = document.getElementById('updateBooking');
        if (updateBookingBtn) {
            updateBookingBtn.addEventListener('click', () => {
                this.updateBooking();
            });
        }

        // Setup delete booking handler
        const deleteBookingBtn = document.getElementById('deleteBooking');
        if (deleteBookingBtn) {
            deleteBookingBtn.addEventListener('click', () => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteBookingModal'));
                const bookingId = modal._element.getAttribute('data-booking-id');
                this.deleteBooking(bookingId);
            });
        }
    },

    // Initialize the new booking form
    initNewBookingForm() {
        // Load equipment options
        this.loadEquipment('equipmentSelection');

        // Add event listener to the form
        document.getElementById('newBookingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createBooking();
        });
    },

    // Initialize the edit booking form
    initEditBookingForm() {
        // Setup form load when modal is shown
        document.getElementById('editBookingModal').addEventListener('show.bs.modal', (event) => {
            const button = event.relatedTarget;
            const bookingId = button.getAttribute('data-booking-id');
            this.loadBookingDetails(bookingId);
        });

        // Add event listener to the form
        document.getElementById('editBookingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateBooking();
        });
    },

    // Initialize the payment form
    initPaymentForm() {
        const savePaymentBtn = document.getElementById('savePayment');
        if (savePaymentBtn) {
            savePaymentBtn.addEventListener('click', () => {
                const form = document.getElementById('paymentForm');
                const bookingId = form.elements.booking_id.value;
                const paymentStatus = form.elements.payment_status.value;
                this.processPayment(bookingId, paymentStatus).then(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
                    if (modal) modal.hide();
                    // Reload the page after a short delay
                    setTimeout(() => window.location.reload(), 1000);
                });
            });
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
                const categoryName = item.category_name;
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
                            ${item.name}
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

    // Load booking details for editing
    async loadBookingDetails(bookingId) {
        try {
            const booking = await api.get(`/bookings/${bookingId}`);

            // Populate form fields
            const form = document.getElementById('editBookingForm');
            form.elements.id.value = booking.id;
            form.elements.client_id.value = booking.client_id;

            // Set date range
            const startDate = moment(booking.start_date).format('DD.MM.YYYY');
            const endDate = moment(booking.end_date).format('DD.MM.YYYY');
            form.elements.date_range.value = `${startDate} - ${endDate}`;

            // Load equipment options and set selected equipment
            await this.loadEquipment('editEquipmentSelection');
            const equipmentInput = document.querySelector(`#editEquipmentSelection input[value="${booking.equipment_id}"]`);
            if (equipmentInput) {
                equipmentInput.checked = true;
            }

            // Set notes
            if (form.elements.notes) {
                form.elements.notes.value = booking.notes || '';
            }
        } catch (error) {
            console.error('Error loading booking details:', error);
            showToast('Ошибка при загрузке данных бронирования', 'danger');
        }
    },

    // Create new booking
    async createBooking() {
        try {
            const form = document.getElementById('newBookingForm');

            // Validate form
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const formData = new FormData(form);

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
                total_amount: 0, // This will be calculated on the server
                notes: formData.get('notes') || ''
            };

            // Create booking
            await api.post('/bookings/', data);

            // Show success message
            showToast('Бронирование успешно создано', 'success');

            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('newBookingModal'));
            if (modal) modal.hide();
            form.reset();

            // Reload page
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error('Error creating booking:', error);
            showToast('Ошибка при создании бронирования', 'danger');
        }
    },

    // Update existing booking
    async updateBooking() {
        try {
            const form = document.getElementById('editBookingForm');

            // Validate form
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            const formData = new FormData(form);
            const bookingId = formData.get('id');

            // Get selected equipment
            const selectedEquipment = document.querySelector('#editEquipmentSelection input[name="equipment_id"]:checked');
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
                notes: formData.get('notes') || ''
            };

            // Update booking
            await api.put(`/bookings/${bookingId}`, data);

            // Show success message
            showToast('Бронирование успешно обновлено', 'success');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editBookingModal'));
            if (modal) modal.hide();

            // Reload page
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error('Error updating booking:', error);
            showToast('Ошибка при обновлении бронирования', 'danger');
        }
    },

    // Delete booking
    async deleteBooking(bookingId) {
        try {
            await api.delete(`/bookings/${bookingId}`);

            showToast('Бронирование успешно удалено', 'success');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteBookingModal'));
            if (modal) modal.hide();

            // Redirect to bookings list or reload page
            if (window.location.pathname === `/bookings/${bookingId}`) {
            window.location.href = '/bookings';
            } else {
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
            showToast('Ошибка при удалении бронирования', 'danger');
        }
    },

    // Change booking status
    async changeBookingStatus(bookingId, status) {
        try {
            await api.patch(`/bookings/${bookingId}/status`, { booking_status: status });

            showToast(`Статус бронирования обновлен на "${status}"`, 'success');
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error('Error changing booking status:', error);
            showToast('Ошибка при изменении статуса бронирования', 'danger');
        }
    },

    // Process payment
    async processPayment(bookingId, paymentStatus) {
        try {
            const response = await api.patch(`/bookings/${bookingId}/payment`, {
                payment_status: paymentStatus,
                paid_amount: 0 // Dummy value for now
            });

            showToast('Статус оплаты обновлен', 'success');
            return response;
        } catch (error) {
            console.error('Error processing payment:', error);
            showToast('Ошибка при обновлении статуса оплаты', 'danger');
            throw error;
        }
    }
};

// Bookings search functionality
const bookingSearch = {
    init() {
        const clientSearchInput = document.querySelector('#clientSearchInput');
        const bookingStatusFilter = document.querySelector('select[name="booking_status"]');
        const paymentStatusFilter = document.querySelector('select[name="payment_status"]');
        const dateRangeInput = document.querySelector('input[name="date_range"]');
        const searchSpinner = document.querySelector('#search-spinner');

        // Skip if not on the bookings list page
        if (!clientSearchInput) return;

        // Get initial values from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const initialClientSearch = urlParams.get('client_search') || '';
        const initialBookingStatus = urlParams.get('booking_status') || '';
        const initialPaymentStatus = urlParams.get('payment_status') || '';
        const initialDateRange = urlParams.get('date_range') || '';

        // Set initial values
        clientSearchInput.value = initialClientSearch;
        if (bookingStatusFilter) bookingStatusFilter.value = initialBookingStatus;
        if (paymentStatusFilter) paymentStatusFilter.value = initialPaymentStatus;
        if (dateRangeInput) dateRangeInput.value = initialDateRange;

        // Using the debounce function from main.js
        const updateResults = debounce(async () => {
            const clientSearch = clientSearchInput.value.trim();
            const bookingStatus = bookingStatusFilter ? bookingStatusFilter.value : '';
            const paymentStatus = paymentStatusFilter ? paymentStatusFilter.value : '';
            const dateRange = dateRangeInput ? dateRangeInput.value : '';

            console.log('Search parameters:', {
                clientSearch,
                bookingStatus,
                paymentStatus,
                dateRange
            });

            if (searchSpinner) searchSpinner.classList.remove('d-none');

            try {
                const apiParams = new URLSearchParams();
                const urlParams = new URLSearchParams();

                // Add search query if it has sufficient length
                if (clientSearch.length >= 3) {
                    urlParams.append('client_search', clientSearch);
                    // Use the query parameter for client search in API request
                    apiParams.append('query', clientSearch);
                    console.log('Added client search query:', clientSearch);
                }

                // Add filters
                if (bookingStatus) {
                    urlParams.append('booking_status', bookingStatus);
                    apiParams.append('booking_status', bookingStatus);
                    console.log('Added booking status filter:', bookingStatus);
                }

                if (paymentStatus) {
                    urlParams.append('payment_status', paymentStatus);
                    apiParams.append('payment_status', paymentStatus);
                    console.log('Added payment status filter:', paymentStatus);
                }

                if (dateRange) {
                    urlParams.append('date_range', dateRange);
                    // Parse dates for API request, if available
                    if (dateRange.includes(' - ')) {
                        const [startStr, endStr] = dateRange.split(' - ');
                        const startDate = new Date(startStr);
                        const endDate = new Date(endStr);
                        if (!isNaN(startDate.getTime())) {
                            apiParams.append('start_date', startDate.toISOString());
                            console.log('Added start_date:', startDate.toISOString());
                        }
                        if (!isNaN(endDate.getTime())) {
                            apiParams.append('end_date', endDate.toISOString());
                            console.log('Added end_date:', endDate.toISOString());
                        }
                    }
                }

                // Add timestamp for cache prevention
                apiParams.append('_t', Date.now());

                // Update browser URL without reloading the page
                const newUrl = urlParams.toString() ? `?${urlParams.toString()}` : window.location.pathname;
                window.history.replaceState({}, '', newUrl);

                // Request data through API - ensure correct path formation with leading slash
                // Based on how API_BASE_URL is concatenated in api.get()
                const apiUrl = `/bookings?${apiParams.toString()}`;
                console.log('API Request URL:', apiUrl);

                // Check if api object exists
                if (typeof api === 'undefined') {
                    console.error('API object is not defined. Check if api.js is included.');
                    showToast('Ошибка: API объект не определен', 'danger');
                    return;
                }

                console.log('Full API URL will be:', '/api/v1' + apiUrl);
                console.log('Sending API request...');
                const response = await api.get(apiUrl);
                console.log('API response received:', response);

                // Get list of bookings from API response
                if (Array.isArray(response)) {
                    console.log(`Received ${response.length} bookings from API`);
        const tableBody = document.getElementById('bookingsTableBody');

                    if (!tableBody) {
                        console.error('Table body element not found: #bookingsTableBody');
            return;
        }

                    console.log('Clearing table body...');
                    // Clear current table content
                    tableBody.innerHTML = '';

                    if (response.length === 0) {
                        // If no data, show message
                        console.log('No bookings found, adding empty row message');
                        const emptyRow = document.createElement('tr');
                        emptyRow.innerHTML = '<td colspan="7" class="text-center">Бронирования не найдены</td>';
                        tableBody.appendChild(emptyRow);
                    } else {
                        // Fill table with data from API
                        console.log('Adding booking rows to table...');
                        response.forEach((booking, index) => {
                            console.log(`Processing booking ${index + 1}/${response.length}:`, booking);
                            console.log(`Booking status field:`, booking.booking_status || booking.status);
                            console.log(`Payment status field:`, booking.payment_status || booking.payment);
            const row = document.createElement('tr');

                            // Format date
                            const startDate = new Date(booking.start_date);
                            const endDate = new Date(booking.end_date);
                            const formattedStartDate = startDate.toLocaleDateString('ru-RU');
                            const formattedEndDate = endDate.toLocaleDateString('ru-RU');

                            // Create table row with booking data
            row.innerHTML = `
                <td>
                                    <a href="/bookings/${booking.id}" class="text-primary">
                                        ${booking.id}
                    </a>
                </td>
                                <td>${booking.client_name || 'Н/Д'}</td>
                                <td>${booking.equipment_name || 'Н/Д'}</td>
                                <td>${formattedStartDate} - ${formattedEndDate}</td>
                                <td>
                                    <span class="badge ${getStatusBadgeClass(booking.booking_status || booking.status)}">
                                        ${getStatusDisplayName(booking.booking_status || booking.status)}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge ${getPaymentStatusBadgeClass(booking.payment_status || booking.payment)}">
                                        ${getPaymentStatusDisplayName(booking.payment_status || booking.payment)}
                                    </span>
                                </td>
                                <td class="text-right">
                        <a href="/bookings/${booking.id}" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-eye"></i>
                        </a>
                </td>
            `;
            tableBody.appendChild(row);
        });
                        console.log('Finished adding all booking rows to table');
                    }
                } else {
                    console.error('API response is not an array:', response);
                    throw new Error('API response format is invalid');
                }
        } catch (error) {
                console.error('Search error:', error);
                console.error('Error details:', error.message);
                if (error.response) {
                    console.error('Error response:', error.response);
                }
                showToast('Ошибка при поиске бронирований', 'danger');
            } finally {
                if (searchSpinner) searchSpinner.classList.add('d-none');
                console.log('Search operation completed');
            }
        }, 300);

        // Helper functions for status formatting
        function getStatusBadgeClass(status) {
            const statusClasses = {
                'PENDING': 'badge-warning',
                'ACTIVE': 'badge-success',
                'COMPLETED': 'badge-primary',
                'CANCELED': 'badge-danger',
                'OVERDUE': 'badge-dark'
            };
            return statusClasses[status] || 'badge-secondary';
        }

        function getStatusDisplayName(status) {
            const statusNames = {
                'PENDING': 'Ожидает',
                'ACTIVE': 'Активно',
                'COMPLETED': 'Завершено',
                'CANCELED': 'Отменено',
                'OVERDUE': 'Просрочено'
            };
            return statusNames[status] || status;
        }

        function getPaymentStatusBadgeClass(status) {
            const statusClasses = {
                'PENDING': 'badge-warning',
                'PAID': 'badge-success',
                'PARTIALLY_PAID': 'badge-info',
                'REFUNDED': 'badge-secondary',
                'OVERDUE': 'badge-danger'
            };
            return statusClasses[status] || 'badge-secondary';
        }

        function getPaymentStatusDisplayName(status) {
            const statusNames = {
                'PENDING': 'Ожидает',
                'PAID': 'Оплачено',
                'PARTIALLY_PAID': 'Частично',
                'REFUNDED': 'Возврат',
                'OVERDUE': 'Просрочено'
            };
            return statusNames[status] || status;
        }

        // Add event listeners
        if (clientSearchInput) clientSearchInput.addEventListener('input', updateResults);
        if (bookingStatusFilter) bookingStatusFilter.addEventListener('change', updateResults);
        if (paymentStatusFilter) paymentStatusFilter.addEventListener('change', updateResults);
        if (dateRangeInput) dateRangeInput.addEventListener('change', updateResults);

        // Handle reset button
        const resetButton = document.getElementById('resetFilter');
        if (resetButton) {
            resetButton.addEventListener('click', function() {
                if (clientSearchInput) clientSearchInput.value = '';
                if (bookingStatusFilter) bookingStatusFilter.value = '';
                if (paymentStatusFilter) paymentStatusFilter.value = '';
                if (dateRangeInput) dateRangeInput.value = '';
                updateResults();
            });
        }

        // Load initial data if needed
        if (initialClientSearch || initialBookingStatus || initialPaymentStatus || initialDateRange) {
            updateResults();
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    bookingManager.init();
    bookingSearch.init();
});
