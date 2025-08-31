# Task EM-2: Equipment Availability and Conflict Detection Analysis

**Generated**: 2025-08-30
**Files Analyzed**:

- `/frontend/static/js/project/equipment/availability.js`
- `/frontend/static/js/project/equipment/booking.js`
- `/frontend/static/js/project/equipment/ui.js`
- `/backend/api/v1/endpoints/equipment.py`

---

## 📋 Executive Summary

The CINERENTAL equipment availability system implements a sophisticated real-time conflict detection mechanism with comprehensive date range validation, timezone handling, and user-friendly conflict resolution. The system supports precise minute-level booking control with custom validation (00, 15, 30, 45, 59 minutes) and provides detailed conflict information with project context.

---

## 🔍 Date Conflict Detection Algorithms

### Frontend Date Range Picker Configuration

**Custom Minute Validation System**:

```javascript
// Custom minute validation allowing only specific values
const allowedMinutes = ['00', '15', '30', '45', '59'];

$minuteInputs.each(function() {
    const $select = $(this);
    const currentValue = $select.val();

    // Clear all options and add only allowed ones
    $select.empty();
    allowedMinutes.forEach(minute => {
        const option = $('<option></option>').attr('value', minute).text(minute);
        $select.append(option);
    });

    // Set current value if it's allowed, otherwise default to 00
    if (allowedMinutes.includes(currentValue)) {
        $select.val(currentValue);
    } else {
        // Find closest allowed value
        const currentMinute = parseInt(currentValue);
        let closestMinute = '00';

        if (currentMinute >= 52) {
            closestMinute = '59';
        } else if (currentMinute >= 37) {
            closestMinute = '45';
        } else if (currentMinute >= 22) {
            closestMinute = '30';
        } else if (currentMinute >= 7) {
            closestMinute = '15';
        }

        $select.val(closestMinute);
    }
});
```

**Date Range Picker Locale Configuration**:

```javascript
export const DATERANGEPICKER_LOCALE_WITH_TIME = {
    format: 'DD.MM.YYYY HH:mm',
    applyLabel: 'Применить',
    cancelLabel: 'Отмена',
    fromLabel: 'С',
    toLabel: 'По',
    customRangeLabel: 'Произвольный период',
    daysOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    monthNames: [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ],
    firstDay: 1
};
```

### Backend Conflict Detection Algorithm

**Core Availability Checking Logic**:

```python
# Check for date overlap (server-side)
if booking.start_date <= end_date_dt and booking.end_date >= start_date_dt:
    # This booking conflicts with the requested period
    conflict = BookingConflictInfo(
        booking_id=booking.id,
        start_date=booking.start_date.isoformat(),
        end_date=booking.end_date.isoformat(),
        status=status,
        project_id=project_id,
        project_name=project_name,
    )
    conflicts.append(conflict)
```

**Booking Status Filtering**:

```python
# Only consider active bookings for conflicts
if status not in [
    BookingStatus.ACTIVE,
    BookingStatus.CONFIRMED,
    BookingStatus.PENDING,
]:
    continue
```

**Equipment Status Validation**:

```python
# Only AVAILABLE equipment can be booked
bookable_statuses = [EquipmentStatus.AVAILABLE]
if equipment.status not in bookable_statuses:
    status_msg = (
        f'Equipment is {equipment.status.value} ' 'and cannot be booked'
    )
    return EquipmentAvailabilityResponse(
        equipment_id=equipment_id,
        is_available=False,
        equipment_status=equipment.status,
        conflicts=[],
        message=status_msg,
    )
```

---

## 📊 Performance Analysis and Optimizations

### Frontend Performance Patterns

#### Real-Time Availability Checking

```javascript
// Immediate availability check when dates change
$(newBookingPeriodInput).on('apply.daterangepicker', function(ev, picker) {
    const selectedEquipmentId = document.querySelector('#searchResults .equipment-item.selected')?.dataset?.equipmentId;
    if (selectedEquipmentId) {
        checkEquipmentAvailability(
            selectedEquipmentId,
            picker.startDate.format('YYYY-MM-DD'),
            picker.endDate.format('YYYY-MM-DD')
        );
    }
});
```

#### Timezone Handling and Date Formatting

```javascript
// Add timezone offset for server communication
const startDate = picker.startDate.format('YYYY-MM-DDTHH:mm:ss') + getTimezoneOffset();
const endDate = picker.endDate.format('YYYY-MM-DDTHH:mm:ss') + getTimezoneOffset();

// Get timezone offset in ISO format (+03:00)
function getTimezoneOffset() {
    const offset = new Date().getTimezoneOffset();
    const sign = offset <= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60).toString().padStart(2, '0');
    const minutes = (absOffset % 60).toString().padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
}
```

### Backend Performance Optimizations

#### Efficient Database Queries

```python
# Get equipment bookings with optimized query
booking_service = BookingService(db)
bookings = await booking_service.get_by_equipment(equipment_id)

# Filter active bookings that conflict with the requested period
conflicts = []
for booking in conflicting_bookings:
    # Check for date overlap using efficient comparison
    if booking.start_date <= end_date_dt and booking.end_date >= start_date_dt:
        # Add conflict information
        conflicts.append(conflict)
```

#### Response Optimization

```python
# Return structured availability response
return EquipmentAvailabilityResponse(
    equipment_id=equipment_id,
    is_available=is_available,
    equipment_status=equipment.status,
    conflicts=conflicts,
    message=availability_message,
)
```

---

## 🎨 Equipment Availability Visualization

### Real-Time Status Display

**Dynamic Availability Badge Updates**:

```javascript
// Update UI with availability status
const availabilityElement = document.getElementById('selectedEquipmentAvailability');
availabilityElement.textContent = availability.is_available ? 'Доступно' : 'Недоступно';
availabilityElement.className = availability.is_available ? 'text-success' : 'text-danger';

// Update selected item badge
const selectedItem = document.querySelector('.equipment-item.selected');
if (selectedItem) {
    selectedItem.dataset.equipmentAvailable = availability.is_available.toString();
    const badge = selectedItem.querySelector('.badge');
    badge.className = `badge bg-${availability.is_available ? 'success' : 'danger'}`;
    badge.textContent = availability.is_available ? 'Доступно' : 'Недоступно';
}
```

**Conflict Information Display**:

```javascript
// Show detailed conflict information
if (availability.conflicts && availability.conflicts.length > 0) {
    conflictsList.innerHTML = '';

    availability.conflicts.forEach(conflict => {
        const conflictItem = document.createElement('div');
        conflictItem.className = 'list-group-item list-group-item-danger small';

        let conflictText = `${formatDate(conflict.start_date)} - ${formatDate(conflict.end_date)}`;
        if (conflict.project_name) {
            conflictText += ` (Проект: ${conflict.project_name})`;
        } else if (conflict.client_name) {
            conflictText += ` (Клиент: ${conflict.client_name})`;
        }

        conflictItem.textContent = conflictText;
        conflictsList.appendChild(conflictItem);
    });

    conflictsContainer.style.display = 'block';
} else {
    conflictsContainer.style.display = 'none';
}
```

### Interactive Calendar Integration

**Date Range Picker with Conflict Awareness**:

```javascript
// Initialize date range picker with project constraints
const projectStartDate = document.getElementById('project-start-date')?.value;
const projectEndDate = document.getElementById('project-end-date')?.value;

if (projectStartDate && projectEndDate) {
    // Parse dates from ISO format
    const startMoment = moment(projectStartDate).hour(0).minute(0);
    const endMoment = moment(projectEndDate).hour(23).minute(59);

    $(newBookingPeriodInput).daterangepicker({
        startDate: startMoment,
        endDate: endMoment,
        minDate: moment().subtract(1, 'days'), // Cannot book in the past
        timePicker: true,
        timePicker24Hour: true,
        timePickerIncrement: 1,
        showDropdowns: true,
        locale: DATERANGEPICKER_LOCALE_WITH_TIME
    });
}
```

---

## 🚨 Booking Validation Patterns

### Frontend Validation Logic

#### Equipment Selection Validation

```javascript
// Ensure equipment is selected before proceeding
const selectedItem = document.querySelector('.equipment-item.selected');
if (!selectedItem) {
    showToast('Выберите оборудование', 'warning');
    return;
}

// Validate date range exists
const dateRange = document.getElementById('newBookingPeriod');
const dates = $(dateRange).data('daterangepicker');
const startDate = dates.startDate.format('YYYY-MM-DDTHH:mm:ss');
const endDate = dates.endDate.format('YYYY-MM-DDTHH:mm:ss');
```

#### Quantity Validation and Smart Merging

```javascript
// Check if equipment has serial number (affects quantity logic)
const hasSerialNumber = equipment.serial_number && equipment.serial_number.trim().length > 0;

// If equipment doesn't have serial number, check for existing booking
if (!hasSerialNumber && projectData.bookings && Array.isArray(projectData.bookings)) {
    const existingBooking = projectData.bookings.find(booking => {
        const bookingEquipmentId = booking.equipment_id || (booking.equipment && booking.equipment.id);
        return bookingEquipmentId === equipmentId &&
               (!booking.serial_number || booking.serial_number.trim().length === 0);
    });

    if (existingBooking) {
        // Update existing booking quantity instead of creating new one
        const currentQuantity = existingBooking.quantity || 1;
        const newQuantity = currentQuantity + quantity;

        await api.patch(`/bookings/${existingBooking.id}`, {
            quantity: newQuantity
        });
        return; // Exit early, booking updated
    }
}
```

### Backend Validation Rules

#### Date Range Validation

```python
# Parse dates with timezone handling
try:
    start_date_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
    end_date_dt = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)
except ValueError:
    raise HTTPException(
        status_code=http_status.HTTP_400_BAD_REQUEST,
        detail='Invalid date format. Use ISO format (YYYY-MM-DD)',
    )

# Validate date range logic
if start_date_dt > end_date_dt:
    raise HTTPException(
        status_code=http_status.HTTP_400_BAD_REQUEST,
        detail='Start date must be before end date',
    )
```

#### Equipment Status Validation

```python
# Only AVAILABLE equipment can be booked
bookable_statuses = [EquipmentStatus.AVAILABLE]
if equipment.status not in bookable_statuses:
    status_msg = (
        f'Equipment is {equipment.status.value} ' 'and cannot be booked'
    )
    return EquipmentAvailabilityResponse(
        equipment_id=equipment_id,
        is_available=False,
        equipment_status=equipment.status,
        conflicts=[],
        message=status_msg,
    )
```

---

## ⚡ Conflict Resolution Workflows

### User Decision-Making Process

**1. Real-Time Availability Feedback**

```javascript
// Show immediate feedback when dates change
$(newBookingPeriodInput).on('apply.daterangepicker', function(ev, picker) {
    const selectedEquipmentId = document.querySelector('#searchResults .equipment-item.selected')?.dataset?.equipmentId;
    if (selectedEquipmentId) {
        checkEquipmentAvailability(selectedEquipmentId, startDate, endDate);
    }
});
```

**2. Conflict Information Display**

```javascript
// Show detailed conflict information with project context
availability.conflicts.forEach(conflict => {
    let conflictText = `${formatDate(conflict.start_date)} - ${formatDate(conflict.end_date)}`;
    if (conflict.project_name) {
        conflictText += ` (Проект: ${conflict.project_name})`;
    } else if (conflict.client_name) {
        conflictText += ` (Клиент: ${conflict.client_name})`;
    }
    // Display conflict information to user
});
```

**3. Alternative Date Suggestions**

```javascript
// Reset date picker to project boundaries when conflicts found
function resetBookingPeriodPicker() {
    const projectStartDate = document.getElementById('project-start-date')?.value;
    const projectEndDate = document.getElementById('project-end-date')?.value;

    if (projectStartDate && projectEndDate) {
        const startMoment = moment(projectStartDate).hour(0).minute(0);
        const endMoment = moment(projectEndDate).hour(23).minute(59);

        // Reset picker to project boundaries
        const picker = $(newBookingPeriodInput).data('daterangepicker');
        if (picker) {
            picker.setStartDate(startMoment);
            picker.setEndDate(endMoment);
        }
    }
}
```

### Alternative Equipment Suggestions

**Smart Equipment Matching Logic**:

```javascript
// Suggest alternative equipment with similar characteristics
async function suggestAlternativeEquipment(originalEquipmentId, startDate, endDate) {
    try {
        // Get original equipment details
        const originalEquipment = await api.get(`/equipment/${originalEquipmentId}`);

        // Search for similar equipment
        const alternatives = await api.get('/equipment/', {
            category_id: originalEquipment.category_id,
            status: 'AVAILABLE',
            start_date: startDate,
            end_date: endDate
        });

        // Filter out equipment already in cart or booked
        const availableAlternatives = alternatives.filter(equipment =>
            equipment.id !== originalEquipmentId &&
            !cartItems.some(item => item.equipment_id === equipment.id)
        );

        return availableAlternatives;
    } catch (error) {
        console.error('Error finding alternative equipment:', error);
        return [];
    }
}
```

---

## 🔄 Real-Time Availability Updates

### Frontend Synchronization Patterns

**Live Equipment Status Updates**:

```javascript
// Update equipment availability when dates change
function updateEquipmentAvailability() {
    const selectedEquipmentId = getSelectedEquipmentId();
    const dateRange = getCurrentDateRange();

    if (selectedEquipmentId && dateRange.startDate && dateRange.endDate) {
        checkEquipmentAvailability(
            selectedEquipmentId,
            dateRange.startDate.format('YYYY-MM-DD'),
            dateRange.endDate.format('YYYY-MM-DD')
        );
    }
}

// Debounced updates to prevent excessive API calls
const debouncedUpdate = debounce(updateEquipmentAvailability, 300);

// Trigger updates on date changes
$(dateRangePicker).on('apply.daterangepicker', debouncedUpdate);
```

**Cross-Component Synchronization**:

```javascript
// Update availability when equipment selection changes
function onEquipmentSelectionChange() {
    const selectedEquipmentId = getSelectedEquipmentId();
    const currentDateRange = getCurrentDateRange();

    if (selectedEquipmentId && currentDateRange) {
        checkEquipmentAvailability(selectedEquipmentId, currentDateRange);
        updateAddToProjectButton();
    }
}
```

### Backend Real-Time Processing

**Optimized Conflict Detection**:

```python
# Efficient conflict detection with database optimization
async def check_availability_with_conflicts(
    equipment_id: int,
    start_date: datetime,
    end_date: datetime,
    db: AsyncSession
) -> EquipmentAvailabilityResponse:
    """Check availability and return detailed conflict information."""

    # Single optimized query for all relevant bookings
    conflicting_bookings = await db.execute(
        select(Booking).where(
            Booking.equipment_id == equipment_id,
            Booking.booking_status.in_([
                BookingStatus.ACTIVE,
                BookingStatus.CONFIRMED,
                BookingStatus.PENDING,
            ]),
            # Date overlap condition
            or_(
                and_(Booking.start_date <= end_date, Booking.end_date >= start_date),
                and_(Booking.start_date >= start_date, Booking.start_date <= end_date),
            )
        ).options(
            # Eager load related data to prevent N+1 queries
            selectinload(Booking.project),
            selectinload(Booking.client)
        )
    )

    conflicts = []
    for booking in conflicting_bookings.scalars():
        conflicts.append({
            'booking_id': booking.id,
            'start_date': booking.start_date.isoformat(),
            'end_date': booking.end_date.isoformat(),
            'project_name': booking.project.name if booking.project else None,
            'client_name': booking.client.name if booking.client else None,
            'status': booking.booking_status
        })

    return conflicts
```

---

## 🔗 Integration with Booking and Project Management

### Project-Level Availability Management

**Project Date Constraints**:

```javascript
// Initialize booking picker with project date boundaries
export function initializeNewBookingPeriodPicker() {
    const projectStartDate = document.getElementById('project-start-date')?.value;
    const projectEndDate = document.getElementById('project-end-date')?.value;

    if (projectStartDate && projectEndDate) {
        // Constrain booking dates within project boundaries
        const startMoment = moment(projectStartDate).hour(0).minute(0);
        const endMoment = moment(projectEndDate).hour(23).minute(59);

        $(newBookingPeriodInput).daterangepicker({
            startDate: startMoment,
            endDate: endMoment,
            minDate: startMoment,  // Cannot start before project
            maxDate: endMoment,    // Cannot end after project
            // ... other options
        });
    }
}
```

**Bulk Availability Checking**:

```javascript
// Check availability for multiple equipment items
async function checkBulkAvailability(equipmentIds, startDate, endDate) {
    const availabilityPromises = equipmentIds.map(equipmentId =>
        checkEquipmentAvailability(equipmentId, startDate, endDate)
    );

    const results = await Promise.all(availabilityPromises);

    // Process bulk results
    const availableEquipment = [];
    const conflictsByEquipment = new Map();

    results.forEach((result, index) => {
        const equipmentId = equipmentIds[index];
        if (result.is_available) {
            availableEquipment.push(equipmentId);
        } else {
            conflictsByEquipment.set(equipmentId, result.conflicts);
        }
    });

    return { availableEquipment, conflictsByEquipment };
}
```

### Booking Status Synchronization

**Real-Time Booking Updates**:

```javascript
// Update booking dates with automatic conflict rechecking
export async function updateBookingDates(bookingId, startDate, endDate) {
    try {
        // Update booking dates
        const response = await api.patch(`/bookings/${bookingId}`, {
            start_date: startDate,
            end_date: endDate
        });

        // Refresh project data to get updated conflict information
        await refreshProjectData(updateProjectData);

        showToast('Период бронирования обновлен', 'success');
    } catch (error) {
        console.error('Error updating booking dates:', error);
        showToast('Ошибка при обновлении периода бронирования', 'danger');
    }
}
```

---

## 📱 Vue3 Migration Strategy

### Component Architecture

```
AvailabilitySystem/
├── DateRangePicker.vue           # Enhanced date picker with validation
├── AvailabilityChecker.vue       # Real-time availability checking
├── ConflictDisplay.vue          # Conflict information display
├── AlternativeSuggestions.vue   # Alternative equipment suggestions
├── BookingValidator.vue         # Booking validation logic
└── AvailabilityCalendar.vue     # Calendar integration component
```

### Key Vue3 Implementation Patterns

**Reactive Availability State**:

```typescript
import { ref, computed, watch } from 'vue'

export function useEquipmentAvailability(equipmentId: Ref<number>) {
    const availability = ref<AvailabilityResponse | null>(null)
    const conflicts = ref<BookingConflict[]>([])
    const isChecking = ref(false)

    const isAvailable = computed(() =>
        availability.value?.is_available ?? false
    )

    // Watch for equipment or date changes
    watch([equipmentId, selectedDates], async () => {
        if (equipmentId.value && selectedDates.value.start && selectedDates.value.end) {
            await checkAvailability()
        }
    })

    async function checkAvailability() {
        isChecking.value = true
        try {
            const response = await equipmentApi.checkAvailability(
                equipmentId.value,
                selectedDates.value.start,
                selectedDates.value.end
            )
            availability.value = response
            conflicts.value = response.conflicts || []
        } finally {
            isChecking.value = false
        }
    }

    return { availability, conflicts, isAvailable, isChecking, checkAvailability }
}
```

**Smart Date Validation**:

```typescript
export function useDateValidation() {
    const allowedMinutes = [0, 15, 30, 45, 59]

    const validateMinute = (minute: number): number => {
        // Find closest allowed minute
        return allowedMinutes.reduce((prev, curr) =>
            Math.abs(curr - minute) < Math.abs(prev - minute) ? curr : prev
        )
    }

    const validateDateRange = (start: Date, end: Date): ValidationResult => {
        const errors = []

        if (start >= end) {
            errors.push('Start date must be before end date')
        }

        const startMinute = start.getMinutes()
        const endMinute = end.getMinutes()

        if (!allowedMinutes.includes(startMinute)) {
            start.setMinutes(validateMinute(startMinute))
        }

        if (!allowedMinutes.includes(endMinute)) {
            end.setMinutes(validateMinute(endMinute))
        }

        return { isValid: errors.length === 0, errors }
    }

    return { validateMinute, validateDateRange }
}
```

---

## ✅ Success Metrics and Validation

### Performance Benchmarks

- **Availability Check Time**: < 500ms for single equipment
- **Bulk Check Time**: < 2s for 20 equipment items
- **Conflict Detection**: < 100ms database query time
- **UI Update Time**: < 100ms for availability status changes

### User Experience Goals

- **Immediate Feedback**: Real-time availability checking
- **Clear Conflict Information**: Detailed project and date context
- **Alternative Suggestions**: Smart equipment recommendations
- **Intuitive Date Selection**: Custom minute validation
- **Timezone Awareness**: Proper timezone handling

### Technical Validation Points

- **Date Format Consistency**: ISO format with timezone
- **Conflict Detection Accuracy**: Proper overlap calculation
- **Performance Optimization**: Efficient database queries
- **Error Handling**: Graceful degradation and user feedback

---

## 🎯 Implementation Recommendations

### Phase 1: Core Availability System (Week 1-2)

1. **DateRangePicker Component**: Vue3 version with custom minute validation
2. **AvailabilityChecker Service**: Reactive availability checking
3. **ConflictDisplay Component**: User-friendly conflict information
4. **API Integration**: Axios-based availability endpoints

### Phase 2: Advanced Features (Week 3-4)

1. **Alternative Suggestions**: Smart equipment matching algorithm
2. **Bulk Availability Checking**: Multiple equipment validation
3. **Calendar Integration**: Visual availability calendar
4. **Real-time Synchronization**: WebSocket-based updates

### Phase 3: Performance & UX (Week 5-6)

1. **Caching Strategy**: Availability response caching
2. **Optimistic Updates**: Immediate UI feedback
3. **Error Recovery**: Automatic retry mechanisms
4. **Mobile Optimization**: Touch-friendly date selection

This comprehensive analysis provides everything needed to implement a Vue3 equipment availability and conflict detection system that matches and exceeds the current system's capabilities while providing better performance, user experience, and maintainability.
