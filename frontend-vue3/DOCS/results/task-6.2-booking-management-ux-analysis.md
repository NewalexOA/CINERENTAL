# Booking Management UX Analysis

**Task**: Task 6.2: Booking Management UX Analysis
**Generated**: 2025-08-28
**Status**: Completed

---

## 📋 Overview

The CINERENTAL booking and reservation system provides sophisticated equipment rental management with advanced filtering, real-time availability checking, and comprehensive conflict resolution. The system consists of three main interfaces: booking list with advanced filtering, individual booking detail management, and equipment availability checking integrated throughout the project workflow.

### Key Features Analyzed

- **Advanced filtering system** with real-time search across multiple dimensions
- **Date range selection** with time precision and predefined ranges
- **Equipment availability checking** with conflict detection and resolution
- **Quantity management** for equipment bookings with smart aggregation
- **Status management** with payment tracking and booking lifecycle
- **Project integration** with seamless booking-to-project conversion
- **Conflict resolution** with visual conflict display and resolution guidance

---

## 🎯 Current Implementation Analysis

### Advanced Filtering System

#### Multi-Dimensional Filtering Architecture

**File**: `frontend/static/js/bookings.js`

```javascript
const bookingManager = {
    // State management for complex filtering
    state: {
        currentFilters: {},
        paginationState: {}
    },

    // Debounced filtering system
    initFilterForm() {
        const debouncedLoadBookings = debounce(() => this.loadBookings(), 500);

        // Interactive filtering listeners
        clientSearchInput.addEventListener('input', debouncedLoadBookings);
        equipmentSearchInput.addEventListener('input', debouncedLoadBookings);
        paymentStatusSelect.addEventListener('change', () => this.loadBookings());
        activeOnlyCheckbox.addEventListener('change', () => this.loadBookings());
    }
}
```

**Filtering Capabilities**:

- **Real-time search** across client name, email, phone with debouncing
- **Equipment search** by name or serial number
- **Payment status filtering** (Paid, Pending, Cancelled, Refunded)
- **Date range filtering** with calendar picker integration
- **Active-only toggle** for current vs historical bookings
- **URL synchronization** for bookmarkable filter states

#### Date Range Picker Integration

```javascript
// Sophisticated date picker with predefined ranges
const dateRangeOptions = {
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
    }
};
```

**Date Range Features**:

- **Predefined ranges** for common time periods
- **Flexible date selection** with calendar interface
- **Time precision** support (HH:mm format)
- **Timezone handling** with offset calculation
- **Validation** with moment.js integration

### Equipment Availability System

#### Conflict Detection and Resolution

**File**: `frontend/static/js/project/equipment/availability.js`

```javascript
export async function checkEquipmentAvailability(equipmentId, startDate, endDate) {
    const availability = await api.get(`/equipment/${equipmentId}/availability`, {
        start_date: startDate,
        end_date: endDate
    });

    // Visual conflict display
    if (availability.conflicts && availability.conflicts.length > 0) {
        conflictsList.innerHTML = '';
        availability.conflicts.forEach(conflict => {
            const conflictItem = document.createElement('div');
            conflictItem.className = 'list-group-item list-group-item-danger small';
            // Display conflict details with project/client context
        });
    }
}
```

**Availability Checking Features**:

- **Real-time conflict detection** with API integration
- **Visual conflict display** with project/client context
- **Smart aggregation** for equipment with/without serial numbers
- **Booking status integration** (Active, Draft, Completed, Cancelled)
- **Cross-project conflict resolution** guidance

#### Time Precision Management

```javascript
function addCustomMinuteValidation($picker) {
    const allowedMinutes = ['00', '15', '30', '45', '59'];

    // Restrict minute selection to business-relevant intervals
    $minuteInputs.each(function() {
        const $select = $(this);
        $select.empty();
        allowedMinutes.forEach(minute => {
            const option = $('<option></option>').attr('value', minute).text(minute);
            $select.append(option);
        });
    });
}
```

**Time Management Features**:

- **Business hour validation** (restricted minute intervals)
- **Timezone offset handling** for accurate storage
- **24-hour format** support for international users
- **Smart default times** (00:00 start, 23:59 end)

### Booking Lifecycle Management

#### Status and Payment Tracking

**File**: `frontend/static/js/bookings.js`

```javascript
function renderBookings(bookings) {
    bookings.forEach(booking => {
        // Payment Status Badge
        let paymentBadgeClass = 'bg-warning text-dark';
        if (booking.payment_status === 'PAID') {
            paymentBadgeClass = 'bg-success';
        } else if (booking.payment_status === 'CANCELLED') {
            paymentBadgeClass = 'bg-secondary';
        }

        // Booking Status Badge with color coding
        let statusBadgeClass = 'bg-info';
        if (statusText === 'COMPLETED') {
            statusBadgeClass = 'bg-success';
        } else if (statusText === 'CANCELLED') {
            statusBadgeClass = 'bg-secondary';
        } else if (statusText === 'ACTIVE') {
            statusBadgeClass = 'bg-primary';
        }
    });
}
```

**Status Management Features**:

- **Payment status tracking** with visual indicators
- **Booking lifecycle states** (Pending, Confirmed, Active, Completed, Cancelled, Overdue)
- **Color-coded badges** for quick status recognition
- **Status-based action availability** (Complete, Cancel, Edit)
- **Payment workflow integration** with modal-based updates

### Quantity Management System

#### Smart Equipment Aggregation

**File**: `frontend/static/js/project/equipment/booking.js`

```javascript
export async function addSelectedEquipmentToProject() {
    // Check for existing bookings with same equipment
    if (!hasSerialNumber && projectData.bookings) {
        const existingBooking = projectData.bookings.find(booking => {
            return bookingEquipmentId === equipmentId &&
                   (!booking.serial_number || booking.serial_number.trim().length === 0);
        });

        if (existingBooking) {
            // Update existing booking quantity instead of creating new
            const newQuantity = currentQuantity + quantity;
            await api.patch(`/bookings/${existingBooking.id}`, {
                quantity: newQuantity
            });
        }
    }
}
```

**Quantity Management Features**:

- **Smart aggregation** for non-serialized equipment
- **Quantity increment/decrement** with visual feedback
- **Serial number handling** for unique equipment
- **Confirmation dialogs** for quantity changes
- **Visual quantity indicators** in booking lists

---

## 🔍 UX Interaction Patterns

### Advanced Filtering Interface

#### Search Input Design

```html
<div class="input-group">
    <span class="input-group-text">
        <i class="fas fa-search"></i>
    </span>
    <input type="text" class="form-control rounded" id="clientSearchInput"
           placeholder="Поиск по имени, телефону или email клиента..." minlength="3">
    <div id="client-search-spinner" class="spinner-border spinner-border-sm d-none">
        <span class="visually-hidden">Поиск...</span>
    </div>
</div>
```

**Search UX Patterns**:

- **Progressive enhancement** with loading indicators
- **Minimum character validation** (3 characters)
- **Debounced input** for performance optimization
- **Multi-field search** with intelligent field detection
- **Visual feedback** during search operations

#### Filter Persistence and URL Integration

```javascript
// URL synchronization for bookmarkable states
updateUrl() {
    const urlParams = new URLSearchParams();
    if (clientSearch) urlParams.set('client_search', clientSearch);
    if (equipmentSearch) urlParams.set('equipment_search', equipmentSearch);
    if (paymentStatus) urlParams.set('payment_status', paymentStatus);
    if (dateRange) urlParams.set('date_range', dateRange);

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    history.pushState({}, '', newUrl);
}
```

**URL Integration Features**:

- **Bookmarkable filter states** for user convenience
- **Browser back/forward support** with filter preservation
- **Deep linking** to specific filtered views
- **Shareable URLs** for filter combinations
- **Initial state restoration** from URL parameters

### Date Range Selection UX

#### Calendar Interface Design

```html
<div class="col-md-6">
    <label class="form-label">Период</label>
    <input type="text" class="form-control" name="date_range" readonly>
</div>
```

**Calendar UX Patterns**:

- **Read-only input** to prevent manual entry errors
- **Visual calendar popup** with intuitive navigation
- **Predefined ranges** for common scenarios
- **Responsive design** for mobile devices
- **Time precision** with hour/minute selection

#### Range Selection Feedback

```javascript
$(dateRangeInput).on('apply.daterangepicker', (ev, picker) => {
    $(dateRangeInput).val(
        picker.startDate.format('YYYY-MM-DD') + ' - ' +
        picker.endDate.format('YYYY-MM-DD')
    );
    this.loadBookings(); // Immediate filter application
});
```

**Date Selection Features**:

- **Immediate feedback** with formatted display
- **Auto-filtering** on date range changes
- **Validation** with date format enforcement
- **Cancellation support** with original value restoration
- **Timezone awareness** for accurate storage

### Availability Conflict Resolution

#### Visual Conflict Display

```html
<div id="conflictsContainer" style="display: none;">
    <div class="alert alert-warning">
        <h6>Конфликты бронирования:</h6>
        <div id="conflictsList" class="list-group">
            <!-- Dynamic conflict items -->
        </div>
    </div>
</div>
```

**Conflict Resolution UX**:

- **Clear visual hierarchy** with warning styling
- **Detailed conflict information** (dates, project/client context)
- **Actionable guidance** for conflict resolution
- **Progressive disclosure** (expandable conflict details)
- **Color-coded severity** (warning for conflicts)

#### Real-time Availability Feedback

```javascript
// Dynamic availability status updates
availabilityElement.textContent = availability.is_available ? 'Доступно' : 'Недоступно';
availabilityElement.className = availability.is_available ? 'text-success' : 'text-danger';

// Disable booking button for unavailable equipment
document.getElementById('addToProjectBtn').disabled = !availability.is_available;
```

**Availability Feedback Features**:

- **Real-time status updates** during date selection
- **Visual status indicators** (green/red badges)
- **Interactive state management** (button enable/disable)
- **Context-aware messaging** based on conflict details
- **Progressive enhancement** for better user experience

---

## 📊 Business Logic Requirements

### Booking Data Model

#### Core Booking Fields

- **client_id**: Reference to client record
- **equipment_id**: Reference to equipment record
- **project_id**: Optional project association
- **start_date/end_date**: Booking period with time precision
- **quantity**: Number of equipment units
- **payment_status**: Payment tracking (PAID, PENDING, CANCELLED, REFUNDED)
- **booking_status**: Booking lifecycle (PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED, OVERDUE)
- **notes**: Additional booking information
- **total_amount**: Calculated booking cost

#### Computed Fields

- **duration_days**: Calculated from date range
- **conflict_count**: Number of scheduling conflicts
- **availability_status**: Real-time availability check
- **payment_due_date**: Based on booking start date

### Availability Conflict Logic

#### Conflict Detection Rules

```javascript
// Equipment availability conflict detection
const conflicts = await api.get(`/equipment/${equipmentId}/availability`, {
    start_date: startDate,
    end_date: endDate,
    exclude_booking_id: currentBookingId // For updates
});

// Conflict types:
// 1. Overlapping date ranges for same equipment
// 2. Equipment unavailable due to maintenance
// 3. Quantity conflicts (insufficient available units)
// 4. Client booking conflicts (same client, different equipment)
```

#### Conflict Resolution Strategies

1. **Date Adjustment**: Suggest alternative date ranges
2. **Equipment Substitution**: Recommend similar available equipment
3. **Quantity Reduction**: Adjust booking quantity if partial availability
4. **Conflict Negotiation**: Contact conflicting party for resolution
5. **Booking Cancellation**: Cancel existing booking to free up equipment

### Quantity Management Logic

#### Equipment Aggregation Rules

```javascript
// Smart quantity aggregation for non-serialized equipment
if (!hasSerialNumber) {
    // Find existing booking for same equipment in same project
    const existingBooking = projectData.bookings.find(booking =>
        booking.equipment_id === equipmentId &&
        !booking.serial_number
    );

    if (existingBooking) {
        // Increment quantity instead of creating new booking
        newQuantity = existingBooking.quantity + requestedQuantity;
        await updateBookingQuantity(existingBooking.id, newQuantity);
        return;
    }
}
```

#### Quantity Validation Rules

- **Serial Number Equipment**: Quantity must be 1 (unique items)
- **Non-Serial Equipment**: Quantity can be 1-N based on availability
- **Availability Checking**: Quantity cannot exceed available units
- **Business Rules**: Maximum quantity limits per booking type

---

## 🔄 Vue3 Implementation Specification

### Component Architecture

#### BookingList.vue - Main Management Interface

```vue
<template>
  <div class="booking-management">
    <!-- Advanced filtering header -->
    <BookingFilters
      v-model:client-search="clientSearch"
      v-model:equipment-search="equipmentSearch"
      v-model:payment-status="paymentStatus"
      v-model:date-range="dateRange"
      v-model:active-only="activeOnly"
      @filter-changed="handleFilterChange"
    />

    <!-- Booking table with pagination -->
    <BookingTable
      :bookings="filteredBookings"
      :loading="loading"
      :pagination="pagination"
      @page-changed="handlePageChange"
      @booking-updated="handleBookingUpdate"
    />

    <!-- Action modals -->
    <BookingModal
      v-model="showEditModal"
      :booking="selectedBooking"
      @save="handleBookingSave"
    />

    <PaymentModal
      v-model="showPaymentModal"
      :booking="selectedBooking"
      @payment-updated="handlePaymentUpdate"
    />
  </div>
</template>
```

#### BookingDetail.vue - Individual Booking Management

```vue
<template>
  <div class="booking-detail">
    <!-- Navigation breadcrumb -->
    <Breadcrumb :items="breadcrumbItems" />

    <!-- Booking information cards -->
    <div class="row">
      <div class="col-md-8">
        <BookingInfoCard :booking="booking" />
        <EquipmentInfoCard :equipment="booking.equipment" />
      </div>

      <div class="col-md-4">
        <ClientInfoCard :client="booking.client" />
        <BookingActionsCard
          :booking="booking"
          @edit="showEditModal = true"
          @update-payment="showPaymentModal = true"
          @complete="handleCompleteBooking"
          @delete="handleDeleteBooking"
        />
      </div>
    </div>
  </div>
</template>
```

### Pinia Store Architecture

#### Booking Store Design

```typescript
// stores/booking.ts
export const useBookingStore = defineStore('booking', {
  state: () => ({
    bookings: [] as Booking[],
    currentBooking: null as Booking | null,
    filters: {
      clientSearch: '',
      equipmentSearch: '',
      paymentStatus: '',
      dateRange: null as DateRange | null,
      activeOnly: true
    },
    pagination: {
      page: 1,
      size: 25,
      total: 0,
      pages: 0
    },
    loading: false
  }),

  getters: {
    filteredBookings: (state) => {
      // Client-side filtering for real-time search
      return state.bookings.filter(booking => {
        const clientMatch = !state.filters.clientSearch ||
          booking.client_name.toLowerCase().includes(state.filters.clientSearch.toLowerCase()) ||
          booking.client_email.toLowerCase().includes(state.filters.clientSearch.toLowerCase());

        const equipmentMatch = !state.filters.equipmentSearch ||
          booking.equipment_name.toLowerCase().includes(state.filters.equipmentSearch.toLowerCase()) ||
          (booking.equipment_serial_number &&
           booking.equipment_serial_number.toLowerCase().includes(state.filters.equipmentSearch.toLowerCase()));

        const paymentMatch = !state.filters.paymentStatus ||
          booking.payment_status === state.filters.paymentStatus;

        const activeMatch = !state.filters.activeOnly ||
          ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(booking.booking_status);

        return clientMatch && equipmentMatch && paymentMatch && activeMatch;
      });
    },

    activeBookings: (state) => {
      return state.bookings.filter(booking =>
        ['PENDING', 'CONFIRMED', 'ACTIVE'].includes(booking.booking_status)
      );
    },

    bookingsByStatus: (state) => {
      return state.bookings.reduce((acc, booking) => {
        const status = booking.booking_status;
        if (!acc[status]) acc[status] = [];
        acc[status].push(booking);
        return acc;
      }, {} as Record<string, Booking[]>);
    }
  },

  actions: {
    async loadBookings(params?: BookingFilters) {
      this.loading = true;
      try {
        const queryParams = {
          ...this.filters,
          ...params,
          page: this.pagination.page,
          size: this.pagination.size
        };

        const response = await bookingApi.getBookings(queryParams);
        this.bookings = response.items;
        this.pagination = {
          page: response.page,
          size: response.size,
          total: response.total,
          pages: response.pages
        };

        // Update URL for bookmarkable state
        this.updateUrl();
      } catch (error) {
        console.error('Error loading bookings:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async loadBookingDetail(bookingId: string) {
      this.loading = true;
      try {
        const booking = await bookingApi.getBooking(bookingId);
        this.currentBooking = booking;
      } catch (error) {
        console.error('Error loading booking detail:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateBooking(bookingId: string, updates: Partial<Booking>) {
      try {
        const updatedBooking = await bookingApi.updateBooking(bookingId, updates);
        // Update local state
        const index = this.bookings.findIndex(b => b.id === bookingId);
        if (index !== -1) {
          this.bookings[index] = updatedBooking;
        }
        return updatedBooking;
      } catch (error) {
        console.error('Error updating booking:', error);
        throw error;
      }
    },

    async checkAvailability(equipmentId: string, dateRange: DateRange) {
      try {
        const result = await bookingApi.checkAvailability(equipmentId, dateRange);
        return result;
      } catch (error) {
        console.error('Error checking availability:', error);
        throw error;
      }
    },

    updateFilters(newFilters: Partial<BookingFilters>) {
      this.filters = { ...this.filters, ...newFilters };
      this.pagination.page = 1; // Reset to first page
      this.loadBookings();
    },

    updateUrl() {
      const params = new URLSearchParams();
      Object.entries(this.filters).forEach(([key, value]) => {
        if (value) params.set(key, String(value));
      });
      params.set('page', String(this.pagination.page));

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }
});
```

### Composable Design

#### useBookingFilters Composable

```typescript
// composables/useBookingFilters.ts
export function useBookingFilters() {
  const bookingStore = useBookingStore();

  const clientSearch = ref('');
  const equipmentSearch = ref('');
  const paymentStatus = ref('');
  const dateRange = ref<DateRange | null>(null);
  const activeOnly = ref(true);

  // Debounced filter updates
  const debouncedClientSearch = refDebounced(clientSearch, 500);
  const debouncedEquipmentSearch = refDebounced(equipmentSearch, 500);

  // Watch for filter changes and update store
  watch([debouncedClientSearch, debouncedEquipmentSearch, paymentStatus, activeOnly], () => {
    bookingStore.updateFilters({
      clientSearch: debouncedClientSearch.value,
      equipmentSearch: debouncedEquipmentSearch.value,
      paymentStatus: paymentStatus.value,
      activeOnly: activeOnly.value
    });
  });

  watch(dateRange, (newRange) => {
    if (newRange) {
      bookingStore.updateFilters({ dateRange: newRange });
    }
  });

  return {
    clientSearch,
    equipmentSearch,
    paymentStatus,
    dateRange,
    activeOnly
  };
}
```

#### useEquipmentAvailability Composable

```typescript
// composables/useEquipmentAvailability.ts
export function useEquipmentAvailability(equipmentId: string) {
  const bookingStore = useBookingStore();

  const availability = ref<AvailabilityResult | null>(null);
  const conflicts = ref<BookingConflict[]>([]);
  const loading = ref(false);

  const checkAvailability = async (dateRange: DateRange) => {
    loading.value = true;
    try {
      const result = await bookingStore.checkAvailability(equipmentId, dateRange);
      availability.value = result;

      if (result.conflicts) {
        conflicts.value = result.conflicts;
      } else {
        conflicts.value = [];
      }

      return result;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  return {
    availability: readonly(availability),
    conflicts: readonly(conflicts),
    loading: readonly(loading),
    checkAvailability
  };
}
```

### Component Communication Patterns

#### Event-Driven Architecture

```typescript
// BookingTable.vue event emissions
const emit = defineEmits<{
  'booking-selected': [booking: Booking];
  'booking-updated': [booking: Booking];
  'page-changed': [page: number];
}>();

// Parent component event handling
const handleBookingUpdate = async (booking: Booking) => {
  try {
    await bookingStore.updateBooking(booking.id, booking);
    toastStore.addToast({
      type: 'success',
      message: 'Бронирование обновлено успешно'
    });
  } catch (error) {
    toastStore.addToast({
      type: 'error',
      message: 'Ошибка при обновлении бронирования'
    });
  }
};
```

### Date Range Picker Integration

#### Vue3 Date Picker Component

```vue
<!-- BookingDateRangePicker.vue -->
<template>
  <div class="booking-date-range-picker">
    <label class="form-label">Период бронирования</label>
    <input
      ref="dateInputRef"
      type="text"
      class="form-control"
      :value="formattedRange"
      readonly
      @click="showPicker = true"
    />

    <!-- Custom date range picker overlay -->
    <Teleport to="body">
      <div v-if="showPicker" class="date-range-overlay" @click="showPicker = false">
        <div class="date-range-modal" @click.stop>
          <div class="date-range-header">
            <h5>Выберите период</h5>
            <button type="button" class="btn-close" @click="showPicker = false"></button>
          </div>

          <div class="date-range-body">
            <!-- Custom calendar implementation -->
            <DateRangeCalendar
              v-model="selectedRange"
              :presets="datePresets"
              :min-date="minDate"
              :max-date="maxDate"
              with-time
              @range-selected="handleRangeSelected"
            />
          </div>

          <div class="date-range-footer">
            <button type="button" class="btn btn-secondary" @click="showPicker = false">
              Отмена
            </button>
            <button type="button" class="btn btn-primary" @click="applyRange">
              Применить
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
```

---

## 🔗 Integration Requirements

### Equipment Management Integration

#### Availability Checking Integration

```typescript
// Equipment selection with availability checking
const handleEquipmentSelection = async (equipment: Equipment) => {
  selectedEquipment.value = equipment;

  // Check availability for current date range
  if (selectedDateRange.value) {
    await checkEquipmentAvailability(equipment.id, selectedDateRange.value);
  }
};

// Date range change triggers availability recheck
watch(selectedDateRange, async (newRange) => {
  if (selectedEquipment.value && newRange) {
    await checkEquipmentAvailability(selectedEquipment.value.id, newRange);
  }
});
```

#### Quantity Management Integration

```typescript
// Smart quantity handling based on equipment type
const handleQuantityChange = (newQuantity: number) => {
  const equipment = selectedEquipment.value;

  if (equipment.serial_number) {
    // Serial numbered equipment must be quantity 1
    if (newQuantity !== 1) {
      toastStore.addToast({
        type: 'warning',
        message: 'Оборудование с серийным номером должно иметь количество 1'
      });
      return;
    }
  }

  // Check availability for new quantity
  checkEquipmentAvailability(equipment.id, selectedDateRange.value, newQuantity);
};
```

### Project Management Integration

#### Booking-to-Project Conversion

```typescript
// Seamless project creation from bookings
const convertBookingsToProject = async (bookingIds: string[]) => {
  try {
    // Get booking details
    const bookings = await Promise.all(
      bookingIds.map(id => bookingApi.getBooking(id))
    );

    // Create project with booking data
    const projectData = {
      name: `Проект из бронирований ${new Date().toLocaleDateString()}`,
      client_id: bookings[0].client_id,
      start_date: bookings.reduce((earliest, booking) =>
        booking.start_date < earliest ? booking.start_date : earliest,
        bookings[0].start_date
      ),
      end_date: bookings.reduce((latest, booking) =>
        booking.end_date > latest ? booking.end_date : latest,
        bookings[0].end_date
      ),
      bookings: bookingIds
    };

    const project = await projectApi.createProject(projectData);

    // Update booking project associations
    await Promise.all(
      bookingIds.map(bookingId =>
        bookingApi.updateBooking(bookingId, { project_id: project.id })
      )
    );

    return project;
  } catch (error) {
    console.error('Error converting bookings to project:', error);
    throw error;
  }
};
```

### Payment System Integration

#### Payment Status Workflow

```typescript
// Payment status management with workflow
const updatePaymentStatus = async (bookingId: string, newStatus: PaymentStatus) => {
  try {
    const updatedBooking = await bookingApi.updatePaymentStatus(bookingId, newStatus);

    // Trigger workflow based on payment status
    switch (newStatus) {
      case 'PAID':
        await handlePaymentCompleted(updatedBooking);
        break;
      case 'CANCELLED':
        await handlePaymentCancelled(updatedBooking);
        break;
      case 'REFUNDED':
        await handlePaymentRefunded(updatedBooking);
        break;
    }

    return updatedBooking;
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};
```

---

## 🧪 Testing Scenarios

### Unit Testing Requirements

#### Booking Store Tests

```typescript
describe('useBookingStore', () => {
  it('should filter bookings by client search', () => {
    const store = useBookingStore();
    store.bookings = mockBookings;

    store.filters.clientSearch = 'john';
    const filtered = store.filteredBookings;

    expect(filtered).toHaveLength(1);
    expect(filtered[0].client_name).toBe('John Doe');
  });

  it('should handle availability checking', async () => {
    const store = useBookingStore();
    mockBookingApi.checkAvailability.mockResolvedValue({
      is_available: false,
      conflicts: [mockConflict]
    });

    const result = await store.checkAvailability('equipment-1', mockDateRange);

    expect(result.is_available).toBe(false);
    expect(result.conflicts).toHaveLength(1);
  });
});
```

#### Component Testing

```typescript
describe('BookingFilters.vue', () => {
  it('should emit filter changes with debouncing', async () => {
    const wrapper = mount(BookingFilters, {
      global: {
        plugins: [createTestingPinia()]
      }
    });

    const input = wrapper.find('[data-test="client-search"]');
    await input.setValue('test search');

    // Wait for debouncing
    await new Promise(resolve => setTimeout(resolve, 600));

    expect(wrapper.emitted('filter-changed')).toBeTruthy();
  });

  it('should handle date range selection', async () => {
    const wrapper = mount(BookingFilters);

    // Simulate date range selection
    const dateRangeInput = wrapper.find('[data-test="date-range"]');
    await dateRangeInput.trigger('click');

    // Mock date picker interaction
    const applyButton = wrapper.find('[data-test="apply-range"]');
    await applyButton.trigger('click');

    expect(wrapper.emitted('filter-changed')).toBeTruthy();
  });
});
```

### E2E Testing Scenarios

#### Complete Booking Management Workflow

```typescript
test('complete booking lifecycle management', async ({ page }) => {
  // Navigate to bookings page
  await page.goto('/bookings');

  // Test advanced filtering
  await page.fill('[data-test="client-search"]', 'test client');
  await page.selectOption('[data-test="payment-status"]', 'PENDING');
  await page.click('[data-test="active-only"]');

  // Verify filtered results
  await expect(page.locator('.booking-row')).toHaveCount(2);

  // Test booking detail navigation
  await page.click('.booking-row:first-child');
  await expect(page.url()).toMatch(/\/bookings\/\d+/);

  // Test booking editing
  await page.click('[data-test="edit-booking"]');
  await page.fill('[data-test="booking-notes"]', 'Updated notes');
  await page.click('[data-test="save-booking"]');

  // Verify success message
  await expect(page.locator('.toast-success')).toBeVisible();

  // Test payment status update
  await page.click('[data-test="payment-status"]');
  await page.selectOption('[data-test="payment-status-select"]', 'PAID');
  await page.click('[data-test="save-payment"]');

  // Verify payment status update
  await expect(page.locator('.badge:contains("Оплачено")')).toBeVisible();
});
```

#### Availability Conflict Testing

```typescript
test('equipment availability checking with conflicts', async ({ page }) => {
  // Navigate to equipment selection
  await page.goto('/projects/1');

  // Select equipment
  await page.click('[data-test="equipment-item"]:first-child');

  // Set conflicting date range
  await page.click('[data-test="date-range-picker"]');
  await page.click('[data-test="preset-tomorrow"]');
  await page.click('[data-test="apply-range"]');

  // Verify conflict display
  await expect(page.locator('[data-test="conflict-alert"]')).toBeVisible();
  await expect(page.locator('[data-test="conflict-item"]')).toHaveCount(1);

  // Verify booking button is disabled
  await expect(page.locator('[data-test="add-to-project-btn"]')).toBeDisabled();

  // Change to non-conflicting dates
  await page.click('[data-test="date-range-picker"]');
  await page.click('[data-test="preset-next-week"]');
  await page.click('[data-test="apply-range"]');

  // Verify conflict resolution
  await expect(page.locator('[data-test="conflict-alert"]')).not.toBeVisible();
  await expect(page.locator('[data-test="add-to-project-btn"]')).not.toBeDisabled();
});
```

---

## 📋 Migration Notes

### Key Challenges Identified

#### Complex State Management

**Current Issues**:

- **Multiple filter states** with URL synchronization
- **Real-time availability checking** with conflict resolution
- **Quantity aggregation logic** for equipment types
- **Date range precision** with timezone handling

**Vue3 Solutions**:

- **Pinia store** with reactive filters and URL sync
- **Composables** for availability checking and conflict management
- **Computed properties** for smart quantity aggregation
- **Date utilities** with timezone support

#### Advanced Date Picker Integration

**Current Issues**:

- **jQuery date range picker** with custom minute validation
- **Complex date range logic** with predefined ranges
- **Timezone offset calculation** for accurate storage

**Vue3 Solutions**:

- **Vue3 date picker components** (vue-datepicker, primevue)
- **Custom composables** for date range management
- **Timezone utilities** with dayjs or date-fns

#### Conflict Resolution UX

**Current Issues**:

- **Dynamic conflict display** with DOM manipulation
- **Real-time availability feedback** during date selection
- **Complex conflict aggregation** for multiple bookings

**Vue3 Solutions**:

- **Reactive conflict state** with computed properties
- **Component-based conflict display** with animations
- **Optimistic updates** for better user experience

### Implementation Priorities

#### Phase 1: Core Functionality (High Priority)

1. **Booking List Component**: Basic filtering and display
2. **Booking Detail Component**: Information display and basic editing
3. **Date Range Picker**: Vue3 date picker integration
4. **Basic CRUD Operations**: Create, read, update, delete bookings

#### Phase 2: Advanced Features (Medium Priority)

1. **Advanced Filtering**: Real-time search with debouncing
2. **Availability Checking**: Conflict detection and display
3. **Quantity Management**: Smart aggregation and validation
4. **Payment Integration**: Payment status workflow

#### Phase 3: Performance & Polish (Low Priority)

1. **Virtual Scrolling**: For large booking lists
2. **Advanced Caching**: API response optimization
3. **Conflict Resolution**: Advanced conflict handling
4. **Mobile Optimization**: Touch-friendly interfaces

### API Considerations

#### Backend Compatibility

**Existing Endpoints**:

- `GET /bookings` - List bookings with filtering
- `GET /bookings/{id}` - Get booking details
- `POST /bookings` - Create new booking
- `PUT /bookings/{id}` - Update booking
- `DELETE /bookings/{id}` - Delete booking
- `GET /equipment/{id}/availability` - Check equipment availability

**Additional Requirements**:

- **Bulk Operations**: Update multiple bookings
- **Advanced Filtering**: Complex query support
- **Real-time Updates**: WebSocket for availability changes
- **Conflict Resolution**: Suggest alternative dates/equipment

#### Data Transformation

**Booking Object Mapping**:

```typescript
interface Booking {
  id: string;
  client_id: string;
  equipment_id: string;
  project_id?: string;
  start_date: string; // ISO format with timezone
  end_date: string;   // ISO format with timezone
  quantity: number;
  payment_status: 'PAID' | 'PENDING' | 'CANCELLED' | 'REFUNDED';
  booking_status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
  notes?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  // Relations
  client?: Client;
  equipment?: Equipment;
  project?: Project;
}
```

### Error Handling Strategy

#### User-Friendly Error Messages

```typescript
const bookingErrorMessages = {
  'AVAILABILITY_CONFLICT': 'Оборудование недоступно в выбранные даты. Выберите другие даты или оборудование.',
  'QUANTITY_EXCEEDED': 'Запрошенное количество превышает доступное.',
  'PAYMENT_REQUIRED': 'Необходимо оплатить бронирование перед активацией.',
  'DATE_RANGE_INVALID': 'Некорректный период бронирования.',
  'EQUIPMENT_UNAVAILABLE': 'Оборудование временно недоступно.',
  'CLIENT_INACTIVE': 'Клиент заблокирован. Активируйте клиента перед бронированием.'
};
```

#### Graceful Degradation

- **Offline Mode**: Cache recent bookings and availability data
- **Partial Loading**: Load critical booking information first
- **Retry Logic**: Automatic retry for failed availability checks
- **Fallback UI**: Meaningful error states with retry options

---

## ✅ Summary

The CINERENTAL booking and reservation system represents a sophisticated equipment rental management platform with advanced filtering, real-time availability checking, and comprehensive conflict resolution. The system demonstrates excellent UX patterns with:

- **Advanced multi-dimensional filtering** with real-time search and URL synchronization
- **Sophisticated date range management** with time precision and predefined ranges
- **Intelligent conflict detection** with visual feedback and resolution guidance
- **Smart quantity management** with equipment type awareness
- **Comprehensive payment tracking** with status-based workflows

**Key Migration Benefits**:

- **Reactive State Management**: Pinia provides better data flow and real-time updates
- **Component Reusability**: Modular design for consistent booking workflows
- **Type Safety**: TypeScript prevents runtime errors in complex booking logic
- **Performance**: Optimized filtering and availability checking
- **User Experience**: Consistent interaction patterns across booking lifecycle

The Vue3 migration will significantly enhance the system's maintainability while preserving the sophisticated booking management capabilities that rental managers depend on for efficient equipment allocation and conflict-free scheduling.
