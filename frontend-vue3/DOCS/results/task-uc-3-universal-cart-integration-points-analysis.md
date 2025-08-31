# Task UC-3: Universal Cart Integration Points Analysis

## Overview

The Universal Cart system represents a sophisticated integration hub within CINERENTAL, connecting multiple frontend components including equipment search, barcode scanners, project management, and backend APIs. This analysis reveals a complex event-driven architecture with multiple integration patterns that enable seamless cross-component communication and state synchronization.

## Current Integration Architecture

### Core Integration Components

#### 1. Multi-Selection Integration (`cart-integration.js`)

**Purpose**: Enables bulk equipment selection and cart operations from search results

**Key Features:**

```javascript
// Multi-selection controls generation
function generateMultiSelectionControls(selectedCount = 0) {
    return `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <input class="form-check-input" type="checkbox" id="selectAllCheckbox">
            <span id="selectedCount" class="text-muted me-3">Выбрано: ${selectedCount}</span>
            <button id="addSelectedToCartBtn" class="btn btn-primary btn-sm">
                <i class="fas fa-shopping-cart"></i> Добавить в корзину
            </button>
        </div>
    `;
}
```

**Integration Pattern:**

- **DOM Extraction**: Equipment data extracted from HTML attributes
- **Bulk Processing**: Selected items processed in batches
- **Global Cart Access**: Uses `window.universalCart` for cart operations
- **Error Handling**: Individual item failures don't stop batch processing

#### 2. Project Cart Integration (`cart-integration.js`, `cart-operations.js`)

**Purpose**: Handles project-specific cart operations and booking creation

**Key Integration Points:**

```javascript
// Project data extraction from page context
function getProjectDataFromPage() {
    const urlMatch = window.location.pathname.match(/\/projects\/(\d+)/);
    const projectId = urlMatch ? parseInt(urlMatch[1]) : null;

    let clientId = null;
    if (window.projectData?.client_id) {
        clientId = window.projectData.client_id;
    }

    return { projectId, clientId };
}
```

**Batch Processing Logic:**

```javascript
// Intelligent date handling for cart items
const bookingData = {
    equipment_id: item.id,
    quantity: item.quantity || 1,
    start_date: item.use_project_dates === false && item.custom_start_date
        ? item.custom_start_date
        : projectDates.start,
    end_date: item.use_project_dates === false && item.custom_end_date
        ? item.custom_end_date
        : projectDates.end
};
```

### Scanner Integration Systems

#### 1. HID Scanner Integration (`scanner.js`, `project/equipment/scanner.js`)

**Purpose**: Direct barcode scanning integration with cart operations

**Integration Flow:**

```javascript
// HID scanner result handling
async function handleHIDScanResult(equipment, scanInfo) {
    // 1. Fill barcode input field
    const barcodeInput = document.getElementById('barcodeInput');
    barcodeInput.value = equipment.barcode;

    // 2. Add directly to cart
    const success = await addScannedEquipmentToCart(equipment);

    if (success) {
        showToast(`Добавлено в корзину: ${equipment.name}`, 'success');
    } else {
        // Fallback to search if cart addition fails
        await searchEquipmentByBarcode();
    }
}
```

**Cart Configuration for Scanner:**

```javascript
// Scanner-specific cart configuration
const tableConfig = {
    ...ADD_EQUIPMENT_CONFIG,
    renderMode: 'table',           // Table mode for scanner integration
    compactView: true,             // Compact display
    showAdvancedControls: false,   // Simplified controls
    tableSettings: {
        showHeader: true,
        sortable: false,
        striped: true,
        hover: true,
        responsive: true
    }
};
```

#### 2. Camera Scanner Integration (`scanner.js`)

**Purpose**: Camera-based barcode scanning with cart integration

**Integration Pattern:**

```javascript
// Camera scanner result processing
async function handleScanResult(result) {
    const barcode = result.codeResult.code;
    stopScanner();

    // Direct cart addition attempt
    const equipment = await findEquipmentByBarcode(barcode);
    if (equipment) {
        const success = await addScannedEquipmentToCart(equipment);
        if (success) {
            showToast(`Добавлено в корзину: ${equipment.name}`, 'success');
            return;
        }
    }

    // Fallback to search interface
    document.getElementById('barcodeInput').value = barcode;
    await searchEquipmentByBarcode();
}
```

### API Integration Patterns

#### 1. Equipment Availability Integration

**Purpose**: Real-time availability checking during cart operations

**Integration Points:**

```javascript
// Availability checking for unique equipment
const availabilityResponse = await api.get(
    `/equipment/${bookingData.equipment_id}/availability?start_date=${startDate}&end_date=${endDate}`
);

if (!availabilityResponse.is_available) {
    const conflictInfo = availabilityResponse.conflicts
        .map(conflict => `${conflict.start_date} - ${conflict.end_date} (Проект: ${conflict.project_name})`)
        .join('; ');

    throw new Error(`Оборудование недоступно на указанные даты. Конфликты: ${conflictInfo}`);
}
```

#### 2. Booking Creation Integration

**Purpose**: Converting cart items to actual project bookings

**Complex Logic:**

```javascript
// Handle unique vs non-unique equipment differently
if (isUniqueEquipment) {
    // Check availability first
    const availabilityResponse = await api.get(`/equipment/${bookingData.equipment_id}/availability`);

    if (!availabilityResponse.is_available) {
        return { success: false, error: conflictMessage, conflicts: availabilityResponse.conflicts };
    }

    // Create new booking
    return await createNewBooking(bookingData, startDate, endDate, quantityToAdd, projectId, clientId);
} else {
    // Check for existing booking to increase quantity
    const existingBooking = existingBookings.find(booking =>
        booking.equipment_id === parseInt(bookingData.equipment_id) &&
        booking.start_date === startDate &&
        booking.end_date === endDate
    );

    if (existingBooking) {
        // Update quantity instead of creating new booking
        const newQuantity = existingBooking.quantity + quantityToAdd;
        await api.patch(`/bookings/${existingBooking.id}`, { quantity: newQuantity });
        return { success: true, action: 'quantity_increased' };
    }

    // Create new booking for non-unique equipment
    return await createNewBooking(bookingData, startDate, endDate, quantityToAdd, projectId, clientId);
}
```

### Event-Driven Architecture

#### 1. Custom Event System

**Purpose**: Cross-component communication and state synchronization

**Event Types:**

```javascript
// Cart business logic events
cart.on('itemAdded', (data) => {
    renderer.trackActivity('add', data.item.name);
    cartUI.render();
    cartUI._showNotification('Позиция добавлена в корзину', 'success');
    cartUI._animateBadge();
});

cart.on('itemRemoved', (data) => {
    renderer.trackActivity('remove', data.item.name);
    cartUI.render();
    cartUI._showNotification('Позиция удалена из корзины', 'info');
});
```

#### 2. DOM Event Integration

**Purpose**: Date range picker and form integration

**Date Change Events:**

```javascript
// Date range picker integration
container.addEventListener('cartItemDateChanged', (event) => {
    const { itemId, startDate, endDate } = event.detail;

    // Update cart item dates
    cart.updateItemDates(itemKey, startDate, endDate);

    console.log('[CartEventHandler] Item dates updated:', {
        itemId, itemKey, startDate, endDate,
        use_project_dates: false
    });
});
```

#### 3. Page-Level Integration Events

**Purpose**: Project data updates and search result refreshes

**Integration Events:**

```javascript
// Project data update event
document.dispatchEvent(new CustomEvent('projectDataUpdated', {
    detail: { projectData: updatedProject }
}));

// Equipment search refresh after cart operations
await refreshEquipmentSearchResults();
```

### Data Synchronization Patterns

#### 1. Cart Persistence Integration

**Purpose**: localStorage synchronization with backend state

**Storage Strategy:**

```javascript
// Cart storage with migration support
class CartStorage {
    constructor(storageKey) {
        this.storageKey = storageKey;
        this.version = '1.0';
    }

    save(cartData) {
        const dataToSave = {
            ...cartData,
            version: this.version,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
    }

    load() {
        const saved = localStorage.getItem(this.storageKey);
        if (!saved) return null;

        const parsed = JSON.parse(saved);

        // Migration logic for version compatibility
        if (parsed.version !== this.version) {
            return this.migrateData(parsed);
        }

        return parsed;
    }
}
```

#### 2. Session Management Integration

**Purpose**: Scanner session integration with cart operations

**Session Flow:**

```javascript
// Session-based cart initialization
function initializeCartWithSession(sessionId) {
    const sessionData = scanStorage.getSession(sessionId);

    if (sessionData && sessionData.items) {
        // Load session items into cart
        sessionData.items.forEach(item => {
            cart.addItem({
                ...item,
                addedBy: 'session',
                sessionId: sessionId
            });
        });
    }
}
```

### Cross-Component State Management

#### 1. Global State Access Patterns

**Purpose**: Shared state across multiple components

**Global Variables:**

```javascript
// Global cart instance
window.universalCart = new UniversalCart(config);

// Global project data
window.projectData = {
    id: projectId,
    name: projectName,
    start_date: startDate,
    end_date: endDate,
    client_id: clientId,
    bookings: []
};
```

#### 2. Component Communication

**Purpose**: State synchronization between components

**Communication Patterns:**

```javascript
// Direct component method calls
if (cart.ui && cart.getItemCount() === 1) {
    cart.ui.show();  // Show cart when first item added
}

// Callback-based updates
refreshProjectData((updatedProject) => {
    window.projectData = updatedProject;

    // Update dependent components
    renderEquipmentSection(updatedProject);
    toggleEquipmentDatesColumn();
});
```

### Error Handling and Recovery

#### 1. Graceful Degradation

**Purpose**: System continues functioning when integrations fail

**Error Recovery Patterns:**

```javascript
// Cart addition with fallback
async function addScannedEquipmentToCart(equipment) {
    try {
        const success = await cart.addItem(itemData);
        if (success) {
            cart.ui.show();
            return true;
        }
    } catch (error) {
        console.error('Cart addition failed:', error);
    }

    // Fallback: show in search results
    return false;
}
```

#### 2. Partial Success Handling

**Purpose**: Handle mixed success/failure scenarios in batch operations

**Batch Error Management:**

```javascript
// Batch processing with error collection
let successCount = 0;
let errorCount = 0;
const errors = [];

for (const item of items) {
    try {
        const result = await addEquipmentToProject(bookingData);
        if (result.success) {
            successCount++;
        } else {
            errorCount++;
            errors.push(`${item.name}: ${result.error}`);
        }
    } catch (error) {
        errorCount++;
        errors.push(`${item.name}: ${error.message}`);
    }
}

return {
    success: successCount > 0,
    successCount,
    errorCount,
    errors: errors.length > 0 ? errors : null
};
```

## Vue3 Integration Strategy

### Component Architecture

#### Main Integration Components

```vue
<!-- CartIntegration.vue -->
<template>
    <div class="cart-integration">
        <!-- Multi-selection controls -->
        <MultiSelectionControls
            :selected-count="selectedEquipmentIds.size"
            @select-all="handleSelectAll"
            @add-to-cart="addSelectedToCart" />

        <!-- Equipment items with checkboxes -->
        <EquipmentItem
            v-for="item in equipmentList"
            :key="item.id"
            :item="item"
            :selected="selectedEquipmentIds.has(item.id)"
            @toggle-selection="toggleSelection" />
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useProjectStore } from '@/stores/project'

// Integration logic
</script>
```

#### Scanner Integration Component

```vue
<!-- ScannerIntegration.vue -->
<template>
    <div class="scanner-integration">
        <button @click="startScanner" class="btn btn-primary">
            <i class="fas fa-camera"></i> Сканировать
        </button>

        <!-- Scanner feedback -->
        <ScanFeedback
            :message="scanMessage"
            :type="scanType"
            v-if="scanMessage" />
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useScanner } from '@/composables/useScanner'

const cartStore = useCartStore()
const { startScanner, onScanResult } = useScanner()

// Handle scan results
onScanResult(async (equipment) => {
    const success = await cartStore.addItem(equipment)
    if (success) {
        showFeedback(`Добавлено: ${equipment.name}`, 'success')
    }
})
</script>
```

### Pinia Store Integration

#### Cart Store with API Integration

```javascript
// stores/cart.js
export const useCartStore = defineStore('cart', {
    state: () => ({
        items: new Map(),
        selectedItems: new Set(),
        scanner: null
    }),

    actions: {
        async addScannedItem(equipment) {
            // Direct cart addition from scanner
            const success = await this.addItem({
                ...equipment,
                addedBy: 'scanner',
                quantity: 1
            })

            if (success && this.items.size === 1) {
                // Show cart UI for first item
                this.showCart()
            }

            return success
        },

        async addSelectedToProject() {
            // Batch processing for selected items
            const results = await cartAPI.addBatchToProject(
                Array.from(this.selectedItems),
                this.projectId
            )

            // Handle partial successes
            this.handleBatchResults(results)
        },

        async checkAvailability(itemId, startDate, endDate) {
            // API integration for availability checking
            return await cartAPI.checkEquipmentAvailability(
                itemId, startDate, endDate
            )
        }
    }
})
```

#### Project Integration Store

```javascript
// stores/project.js
export const useProjectStore = defineStore('project', {
    state: () => ({
        currentProject: null,
        equipment: [],
        bookings: []
    }),

    actions: {
        async refreshAfterCartAddition() {
            // Refresh project data after cart operations
            await this.fetchProjectData()
            await this.fetchEquipmentList()

            // Update search results
            await this.refreshSearchResults()
        },

        async fetchProjectData() {
            const projectData = await projectAPI.getProject(this.projectId)
            this.currentProject = projectData
        }
    }
})
```

### Composable Patterns

#### Cart Integration Composable

```javascript
// composables/useCartIntegration.js
export function useCartIntegration() {
    const cartStore = useCartStore()
    const projectStore = useProjectStore()

    const addSelectedEquipment = async (equipmentList) => {
        const results = []

        for (const equipment of equipmentList) {
            try {
                const success = await cartStore.addItem(equipment)
                results.push({ equipment, success })
            } catch (error) {
                results.push({ equipment, success: false, error })
            }
        }

        return results
    }

    const executeCartAction = async (actionType, options = {}) => {
        switch (actionType) {
            case 'add_to_project':
                return await cartStore.addToProject(projectStore.currentProject.id)
            case 'create_booking':
                return await cartStore.createBooking(options)
            default:
                throw new Error(`Unknown action: ${actionType}`)
        }
    }

    return {
        addSelectedEquipment,
        executeCartAction,
        clearSelection: () => cartStore.clearSelection()
    }
}
```

#### Scanner Integration Composable

```javascript
// composables/useScannerIntegration.js
export function useScannerIntegration() {
    const cartStore = useCartStore()
    const { showToast } = useToast()

    const initializeScanner = () => {
        const scanner = new BarcodeScanner(
            handleScanSuccess,
            handleScanError
        )

        return scanner
    }

    const handleScanSuccess = async (equipment) => {
        const success = await cartStore.addScannedItem(equipment)

        if (success) {
            showToast(`Добавлено в корзину: ${equipment.name}`, 'success')
        } else {
            showToast('Ошибка добавления в корзину', 'error')
        }
    }

    const handleScanError = (error) => {
        showToast(`Ошибка сканирования: ${error.message}`, 'error')
    }

    return {
        initializeScanner,
        startScanning: () => scanner?.start(),
        stopScanning: () => scanner?.stop()
    }
}
```

### Event System Migration

#### Vue3 Event Bus

```javascript
// plugins/eventBus.js
export const cartEvents = createEventBus()

// Usage in components
import { cartEvents } from '@/plugins/eventBus'

export default {
    mounted() {
        cartEvents.on('item-added', this.handleItemAdded)
    },

    beforeUnmount() {
        cartEvents.off('item-added', this.handleItemAdded)
    }
}
```

#### Composition API Events

```javascript
// composables/useCartEvents.js
export function useCartEvents() {
    const cartStore = useCartStore()

    // Reactive event handling
    watch(
        () => cartStore.itemCount,
        (newCount, oldCount) => {
            if (newCount > oldCount) {
                emit('cart:item-added', { count: newCount })
            }
        }
    )

    const emitCartEvent = (event, data) => {
        // Emit to parent component
        context.emit(`cart:${event}`, data)
    }

    return {
        emitCartEvent
    }
}
```

## Integration Testing Strategy

### Unit Tests

- Component integration points
- API call mocking and response handling
- Event emission and reception
- Error handling and recovery

### Integration Tests

- End-to-end cart workflows
- Scanner to cart integration
- Project data synchronization
- Cross-component state updates

### E2E Tests

- Complete user workflows from scanning to project addition
- Multi-device compatibility
- Network failure scenarios
- Data consistency validation

## Migration Challenges

### Technical Complexities

1. **Event System Migration**: Converting DOM events to Vue3 event system
2. **Global State Management**: Migrating window globals to Pinia stores
3. **API Integration**: Maintaining existing API contracts while adding new patterns
4. **Error Handling**: Preserving existing error recovery patterns
5. **Performance**: Maintaining real-time responsiveness during batch operations

### Business Logic Preservation

1. **Date Handling**: Complex date logic for project vs custom dates
2. **Availability Checking**: Real-time conflict detection and resolution
3. **Quantity Management**: Unique vs non-unique equipment handling
4. **Batch Processing**: Partial success handling and error reporting

### Implementation Phases

1. **Phase 1**: Core cart functionality with basic integrations
2. **Phase 2**: Advanced scanner and project integrations
3. **Phase 3**: Batch operations and error handling
4. **Phase 4**: Performance optimization and testing

## Conclusion

The Universal Cart integration system represents a sophisticated example of cross-component communication in a complex frontend application. The current architecture successfully manages multiple integration points including equipment search, barcode scanners, project management, and backend APIs through a combination of event-driven patterns, global state management, and robust error handling.

The Vue3 migration strategy focuses on maintaining these integration patterns while leveraging modern Vue3 features like Composition API, Pinia for state management, and improved component communication patterns. The proposed architecture preserves the existing functionality while providing better maintainability, testability, and performance.
