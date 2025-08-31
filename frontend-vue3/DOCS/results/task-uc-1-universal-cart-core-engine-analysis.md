# Universal Cart Core Engine Analysis

**Task**: Task UC-1: Universal Cart Core Engine Analysis
**Generated**: 2025-08-28
**Status**: Completed

---

## 📋 Overview

The Universal Cart core engine represents a highly sophisticated equipment management system with advanced state management, event-driven architecture, and comprehensive business logic. The system implements a flexible cart pattern that supports multiple operation types (add, return, transfer) with configurable behaviors and seamless integration across the CINERENTAL application.

### Key Features Analyzed

- **Advanced Item Management**: Add, remove, quantity updates with validation
- **Sophisticated Storage System**: localStorage with compression and migration
- **Event-Driven Architecture**: Comprehensive event system with listeners
- **Custom Date Management**: Individual date ranges per equipment item
- **Configuration System**: Context-aware configurations for different page types
- **Action Execution Engine**: Batch booking creation with validation
- **Dual-Mode Architecture**: Embedded vs floating rendering support

---

## 🎯 Core Business Logic Analysis

### Item Management System

#### Add Item Workflow

**File**: `frontend/static/js/universal-cart/core/universal-cart.js`

```javascript
async addItem(item) {
    // 1. Validate item structure
    if (!this._validateItem(item)) {
        throw new Error('Invalid item structure');
    }

    // 2. Check capacity limits
    if (this.items.size >= this.config.maxItems) {
        throw new Error(`Maximum capacity reached (${this.config.maxItems})`);
    }

    // 3. Generate unique key
    const itemKey = this._generateItemKey(item);

    // 4. Handle existing items (quantity aggregation)
    if (this.items.has(itemKey)) {
        const existingItem = this.items.get(itemKey);
        existingItem.quantity = (existingItem.quantity || 1) + (item.quantity || 1);
        this._emit('itemUpdated', { key: itemKey, item: existingItem });
    } else {
        // 5. Process and add new item
        const processedItem = this._processItem(item);
        this.items.set(itemKey, processedItem);
        this._emit('itemAdded', { key: itemKey, item: processedItem });
    }

    // 6. Auto-save and UI updates
    if (this.config.autoSave) {
        await this._saveToStorage();
    }

    return true;
}
```

**Key Business Rules**:

- **Item Validation**: Required fields (id, name) with optional fields
- **Capacity Management**: Configurable max items limit
- **Quantity Aggregation**: Smart merging of duplicate equipment
- **Serial Number Handling**: Unique vs non-unique equipment logic
- **Event Emission**: Comprehensive event system for UI updates

#### Quantity Management Logic

```javascript
async updateQuantity(itemKey, quantity) {
    const item = this.items.get(itemKey);

    if (quantity <= 0) {
        return await this.removeItem(itemKey);
    }

    const previousQuantity = item.quantity;
    item.quantity = quantity;

    this._emit('itemUpdated', { key: itemKey, item, previousQuantity });
    if (this.config.autoSave) {
        await this._saveToStorage();
    }

    return true;
}
```

**Quantity Business Rules**:

- **Zero Quantity Removal**: Automatic item removal when quantity reaches 0
- **Previous Quantity Tracking**: Change history for UI feedback
- **Validation Integration**: Configurable quantity limits per item type
- **Storage Synchronization**: Automatic persistence of changes

### Custom Date Management System

#### Date Customization Architecture

```javascript
async updateItemDates(itemKey, startDate, endDate) {
    const item = this.items.get(itemKey);

    if (startDate && endDate) {
        // Set custom dates
        item.custom_start_date = startDate;
        item.custom_end_date = endDate;
        item.use_project_dates = false;
    } else {
        // Reset to project dates
        item.custom_start_date = null;
        item.custom_end_date = null;
        item.use_project_dates = true;
    }

    this._emit('itemDatesUpdated', {
        key: itemKey,
        item,
        startDate,
        endDate,
        useProjectDates: item.use_project_dates
    });

    if (this.config.autoSave) {
        await this._saveToStorage();
    }

    return true;
}
```

**Date Management Features**:

- **Flexible Date Sources**: Project dates vs custom dates per item
- **Date Validation**: Integration with availability checking
- **Visual Differentiation**: UI indicators for date source types
- **Batch Processing**: Individual date handling in bulk operations

### Action Execution Engine

#### Batch Booking Creation

**File**: `frontend/static/js/universal-cart/core/universal-cart.js`

```javascript
async executeAction(actionConfig = {}) {
    // 1. Configuration validation
    const config = {
        type: actionConfig.type || this.config.type,
        projectId: actionConfig.projectId,
        clientId: actionConfig.clientId,
        startDate: actionConfig.startDate,
        endDate: actionConfig.endDate,
        validateAvailability: actionConfig.validateAvailability !== false,
        showProgress: actionConfig.showProgress !== false
    };

    // 2. Availability validation
    if (config.validateAvailability) {
        const validationResult = await this._validateAvailability(config);
        if (!validationResult.success) {
            return validationResult;
        }
    }

    // 3. Data preparation
    const bookingsData = await this._prepareBookingsData(config);

    // 4. API execution
    const result = await this._executeBookingCreation(bookingsData, config);

    // 5. Success handling
    if (result.success) {
        await this.clear(); // Clear cart on success
        this._emit('actionCompleted', { type: config.type, result });
        return { success: true, ...result };
    }

    return { success: false, error: result.error };
}
```

**Execution Engine Features**:

- **Configurable Actions**: Different operation types (add, return, transfer)
- **Progress Tracking**: UI feedback during batch operations
- **Availability Validation**: Pre-flight checks before execution
- **Error Handling**: Comprehensive error management with rollback
- **Event Integration**: Action lifecycle event emission

---

## 📊 Data Structure and State Management

### Item Data Structure

#### Core Item Schema

```typescript
interface CartItem {
    // Core identification
    id: string | number;
    name: string;
    serial_number?: string | null;
    is_unique?: boolean;

    // Equipment metadata
    category?: string;
    subcategory?: string;
    barcode?: string;

    // Cart-specific data
    quantity: number;
    added_at: string; // ISO timestamp

    // Date management
    custom_start_date?: string | null; // ISO format
    custom_end_date?: string | null;   // ISO format
    use_project_dates: boolean;

    // Business data
    daily_rate?: number;
    replacement_cost?: number;

    // Additional metadata
    [key: string]: any;
}
```

#### Item Key Generation Logic

```javascript
_generateItemKey(item) {
    if (item.is_unique && item.serial_number) {
        // Unique items use serial number for key
        return `${item.id}_${item.serial_number}`;
    }
    // Non-unique items use only ID
    return `${item.id}`;
}
```

**Key Generation Rules**:

- **Unique Equipment**: ID + Serial Number combination
- **Standard Equipment**: ID only (allows quantity aggregation)
- **Consistency**: Deterministic key generation for state management

### Storage Architecture

#### localStorage Management

**File**: `frontend/static/js/universal-cart/core/cart-storage.js`

```javascript
class CartStorage {
    constructor(config = {}) {
        this.config = config;
        this.storageKey = this._generateStorageKey();
        this.enableCompression = config.enableCompression || false;
        this.maxStorageSize = config.maxStorageSize || 5 * 1024 * 1024;
        this.isAvailable = this._checkStorageAvailability();
    }

    _generateStorageKey() {
        const cartType = this.config.type || 'default';
        const projectId = this._getCurrentProjectId();
        return `act_rental_cart_${cartType}_${projectId}`;
    }
}
```

**Storage Features**:

- **Context-Aware Keys**: Different keys for different cart types and projects
- **Size Management**: 5MB limit with compression support
- **Version Control**: Data versioning for migration support
- **Quota Handling**: Automatic cleanup when storage is full
- **Compression**: Optional data compression for large datasets

#### Data Persistence Structure

```typescript
interface StorageData {
    version: string;        // '1.0'
    timestamp: string;      // ISO timestamp
    config: CartConfig;     // Cart configuration
    data: {
        items: Record<string, CartItem>; // Map serialized as object
        savedAt: string;     // Save timestamp
    };
}
```

### Configuration System

#### Context-Aware Configurations

**File**: `frontend/static/js/universal-cart/config/cart-configs.js`

```javascript
const PROJECT_VIEW_CONFIG = {
    type: 'project_view',
    name: 'Добавить в проект',
    maxItems: 50,
    maxQuantityPerItem: 10,

    // UI settings
    renderMode: 'table',
    embedded: true,
    containerId: 'universalCartContainer',

    // Feature flags
    features: {
        barcode: true,
        scanner: true,
        search: true,
        bulk: true
    },

    // Validation rules
    validation: {
        required: ['id', 'name'],
        unique: 'id',
        maxQuantity: 10
    }
};
```

**Configuration Features**:

- **Type-Specific Settings**: Different behaviors for different use cases
- **Feature Flags**: Enable/disable functionality per context
- **UI Customization**: Text, styling, and behavior overrides
- **Validation Rules**: Configurable validation per cart type
- **Embedded vs Floating**: Dual-mode rendering configuration

---

## 🔄 Event System Architecture

### Event Emission System

#### Core Event Types

```typescript
interface CartEvents {
    // Item management events
    'itemAdded': { key: string; item: CartItem };
    'itemRemoved': { key: string; item: CartItem };
    'itemUpdated': { key: string; item: CartItem; previousQuantity?: number };
    'itemDatesUpdated': {
        key: string;
        item: CartItem;
        startDate?: string;
        endDate?: string;
        useProjectDates: boolean;
    };

    // Cart lifecycle events
    'initialized': { config: CartConfig };
    'loaded': { itemCount: number };
    'cleared': { previousItemCount: number };

    // Action events
    'actionCompleted': { type: string; result: any };
    'actionFailed': { type: string; error: string };

    // Error events
    'error': { operation: string; error: Error; [key: string]: any };
}
```

#### Event Subscription System

```javascript
// Event subscription
cart.on('itemAdded', (data) => {
    console.log('Item added:', data.item.name);
    updateUI(data);
});

// Event unsubscription
cart.off('itemAdded', callback);

// Event emission
this._emit('itemAdded', { key: itemKey, item: processedItem });
```

**Event System Features**:

- **Type-Safe Events**: Structured event data with TypeScript interfaces
- **Multiple Subscribers**: Support for multiple listeners per event
- **Error Isolation**: Individual callback errors don't affect others
- **Lifecycle Management**: Proper cleanup and memory management

---

## 🛠️ Vue3 Implementation Specification

### Component Architecture

#### UniversalCart.vue - Main Container Component

```vue
<template>
  <div class="universal-cart" :class="{ 'embedded': isEmbedded, 'floating': !isEmbedded }">
    <!-- Cart Header -->
    <CartHeader
      :config="config"
      :itemCount="itemCount"
      :isVisible="isVisible"
      @toggle="toggleVisibility"
      @clear="clearCart"
    />

    <!-- Cart Content -->
    <CartContent
      v-if="isVisible || isEmbedded"
      :items="cartItems"
      :config="config"
      @update-quantity="updateQuantity"
      @remove-item="removeItem"
      @update-dates="updateItemDates"
    />

    <!-- Cart Actions -->
    <CartActions
      v-if="isVisible || isEmbedded"
      :config="config"
      :hasItems="hasItems"
      @execute-action="executeAction"
    />
  </div>
</template>
```

#### CartItem.vue - Individual Item Component

```vue
<template>
  <div class="cart-item" :data-item-key="itemKey">
    <!-- Item Information -->
    <div class="item-info">
      <h6 class="item-name">{{ item.name }}</h6>
      <div class="item-details">
        <span class="badge bg-secondary">{{ item.category }}</span>
        <span v-if="item.serial_number" class="text-muted">S/N: {{ item.serial_number }}</span>
      </div>
    </div>

    <!-- Date Management -->
    <DateSelector
      :item="item"
      :project-dates="projectDates"
      @update-dates="handleDateUpdate"
    />

    <!-- Quantity Controls -->
    <QuantityControls
      v-if="config.showQuantityControls"
      :quantity="item.quantity"
      :max-quantity="config.maxQuantityPerItem"
      @update="handleQuantityUpdate"
    />

    <!-- Actions -->
    <div class="item-actions">
      <button
        v-if="config.showRemoveButtons"
        class="btn btn-sm btn-outline-danger"
        @click="handleRemove"
      >
        <i class="fas fa-trash"></i>
      </button>
    </div>
  </div>
</template>
```

### Pinia Store Architecture

#### Universal Cart Store

```typescript
// stores/universalCart.ts
export const useUniversalCartStore = defineStore('universalCart', {
  state: () => ({
    // Core state
    items: new Map<string, CartItem>(),
    config: {} as CartConfig,
    isInitialized: false,
    isVisible: false,

    // UI state
    isEmbedded: false,
    currentView: 'table' as 'table' | 'cards',

    // Action state
    isExecutingAction: false,
    actionProgress: 0,
    lastActionResult: null as ActionResult | null
  }),

  getters: {
    cartItems: (state) => Array.from(state.items.values()),

    itemCount: (state) => state.items.size,

    totalQuantity: (state) => {
      return Array.from(state.items.values())
        .reduce((total, item) => total + (item.quantity || 1), 0);
    },

    hasItems: (state) => state.items.size > 0,

    // Filter items by date source
    itemsWithCustomDates: (state) => {
      return Array.from(state.items.values())
        .filter(item => !item.use_project_dates && item.custom_start_date);
    },

    itemsWithProjectDates: (state) => {
      return Array.from(state.items.values())
        .filter(item => item.use_project_dates);
    },

    // Group items by category for UI organization
    itemsByCategory: (state) => {
      const grouped = new Map<string, CartItem[]>();
      state.items.forEach(item => {
        const category = item.category || 'Uncategorized';
        if (!grouped.has(category)) {
          grouped.set(category, []);
        }
        grouped.get(category)!.push(item);
      });
      return grouped;
    }
  },

  actions: {
    // Item management actions
    async addItem(item: Partial<CartItem>) {
      try {
        const processedItem = this._processItem(item);
        const itemKey = this._generateItemKey(processedItem);

        if (this.items.has(itemKey)) {
          // Update quantity for existing item
          const existingItem = this.items.get(itemKey)!;
          const newQuantity = (existingItem.quantity || 1) + (processedItem.quantity || 1);

          if (newQuantity > this.config.maxQuantityPerItem) {
            throw new Error(`Maximum quantity exceeded for ${existingItem.name}`);
          }

          existingItem.quantity = newQuantity;
        } else {
          // Add new item
          if (this.items.size >= this.config.maxItems) {
            throw new Error(`Maximum cart capacity reached (${this.config.maxItems})`);
          }

          this.items.set(itemKey, processedItem);
        }

        await this._saveToStorage();
        this._showAutoVisibility();

      } catch (error) {
        console.error('[CartStore] Add item failed:', error);
        throw error;
      }
    },

    async removeItem(itemKey: string) {
      if (!this.items.has(itemKey)) {
        return false;
      }

      const item = this.items.get(itemKey)!;
      this.items.delete(itemKey);

      await this._saveToStorage();

      // Auto-hide if empty and configured
      if (!this.hasItems && this.config.hideOnEmpty) {
        this.isVisible = false;
      }

      return true;
    },

    async updateQuantity(itemKey: string, quantity: number) {
      if (!this.items.has(itemKey)) {
        throw new Error('Item not found');
      }

      const item = this.items.get(itemKey)!;

      if (quantity <= 0) {
        return this.removeItem(itemKey);
      }

      if (quantity > this.config.maxQuantityPerItem) {
        throw new Error(`Quantity exceeds maximum (${this.config.maxQuantityPerItem})`);
      }

      item.quantity = quantity;
      await this._saveToStorage();

      return true;
    },

    async updateItemDates(itemKey: string, startDate?: string, endDate?: string) {
      if (!this.items.has(itemKey)) {
        throw new Error('Item not found');
      }

      const item = this.items.get(itemKey)!;

      if (startDate && endDate) {
        item.custom_start_date = startDate;
        item.custom_end_date = endDate;
        item.use_project_dates = false;
      } else {
        item.custom_start_date = null;
        item.custom_end_date = null;
        item.use_project_dates = true;
      }

      await this._saveToStorage();
      return true;
    },

    // Cart management actions
    async clearCart() {
      const itemCount = this.items.size;
      this.items.clear();

      await this._saveToStorage();

      if (this.config.hideOnEmpty) {
        this.isVisible = false;
      }

      return itemCount;
    },

    // Action execution
    async executeAction(actionConfig: ActionConfig) {
      this.isExecutingAction = true;
      this.actionProgress = 0;

      try {
        // Validate configuration
        this._validateActionConfig(actionConfig);

        // Update progress
        this.actionProgress = 25;

        // Validate availability if required
        if (actionConfig.validateAvailability !== false) {
          const availabilityResult = await this._validateAvailability(actionConfig);
          if (!availabilityResult.success) {
            throw new Error(availabilityResult.error);
          }
        }

        this.actionProgress = 50;

        // Prepare booking data
        const bookingsData = this._prepareBookingsData(actionConfig);

        this.actionProgress = 75;

        // Execute booking creation
        const result = await bookingApi.createBatchBookings(bookingsData);

        this.actionProgress = 100;

        // Handle success
        if (result.success) {
          await this.clearCart();
          this.lastActionResult = result;

          // Show success notification
          notificationStore.addNotification({
            type: 'success',
            title: 'Бронирования созданы',
            message: `Успешно создано ${result.created_count} бронирований`
          });

          return result;
        } else {
          throw new Error(result.error || 'Failed to create bookings');
        }

      } catch (error) {
        console.error('[CartStore] Action execution failed:', error);

        this.lastActionResult = { success: false, error: error.message };

        notificationStore.addNotification({
          type: 'error',
          title: 'Ошибка выполнения',
          message: error.message
        });

        throw error;
      } finally {
        this.isExecutingAction = false;
        this.actionProgress = 0;
      }
    },

    // Storage management
    async initialize(config: CartConfig) {
      this.config = { ...this.config, ...config };
      this.isEmbedded = this._detectEmbeddedMode();

      // Load from storage
      await this._loadFromStorage();

      this.isInitialized = true;

      // Auto-show if configured and has items
      if (this.config.autoShowOnAdd && this.hasItems) {
        this.isVisible = true;
      }
    },

    // Private methods
    _processItem(rawItem: Partial<CartItem>): CartItem {
      return {
        id: rawItem.id!,
        name: rawItem.name!,
        serial_number: rawItem.serial_number || null,
        category: rawItem.category || null,
        subcategory: rawItem.subcategory || null,
        quantity: rawItem.quantity || 1,
        is_unique: rawItem.is_unique || false,
        added_at: new Date().toISOString(),
        custom_start_date: rawItem.custom_start_date || null,
        custom_end_date: rawItem.custom_end_date || null,
        use_project_dates: rawItem.use_project_dates !== false,
        ...rawItem
      };
    },

    _generateItemKey(item: CartItem): string {
      if (item.is_unique && item.serial_number) {
        return `${item.id}_${item.serial_number}`;
      }
      return `${item.id}`;
    },

    _detectEmbeddedMode(): boolean {
      return !!document.getElementById('universalCartContainer');
    },

    _showAutoVisibility() {
      if (this.config.autoShowOnAdd && !this.isVisible) {
        this.isVisible = true;
      }
    },

    async _saveToStorage() {
      if (!this.config.enableStorage) return;

      try {
        const storageData = {
          items: Object.fromEntries(this.items),
          config: this.config,
          savedAt: new Date().toISOString()
        };

        const key = `act_rental_cart_${this.config.type}_${this._getProjectId()}`;
        localStorage.setItem(key, JSON.stringify(storageData));

      } catch (error) {
        console.error('[CartStore] Storage save failed:', error);
      }
    },

    async _loadFromStorage() {
      if (!this.config.enableStorage) return;

      try {
        const key = `act_rental_cart_${this.config.type}_${this._getProjectId()}`;
        const rawData = localStorage.getItem(key);

        if (rawData) {
          const parsedData = JSON.parse(rawData);
          this.items = new Map(Object.entries(parsedData.items || {}));
        }

      } catch (error) {
        console.error('[CartStore] Storage load failed:', error);
      }
    },

    _getProjectId(): string {
      const pathMatch = window.location.pathname.match(/\/projects\/(\d+)/);
      return pathMatch ? pathMatch[1] : 'global';
    },

    _validateActionConfig(config: ActionConfig) {
      if (!config.clientId) {
        throw new Error('Client ID is required');
      }
      if (!config.startDate || !config.endDate) {
        throw new Error('Start and end dates are required');
      }
    },

    async _validateAvailability(config: ActionConfig) {
      // Simplified availability validation
      // In real implementation, this would call the availability API
      return { success: true };
    },

    _prepareBookingsData(config: ActionConfig) {
      return this.cartItems.map(item => {
        // Determine dates to use
        let startDate = config.startDate!;
        let endDate = config.endDate!;

        if (!item.use_project_dates && item.custom_start_date && item.custom_end_date) {
          startDate = item.custom_start_date;
          endDate = item.custom_end_date;
        }

        // Calculate rental duration
        const duration = this._calculateRentalDays(startDate, endDate);
        const totalAmount = (item.daily_rate || 0) * item.quantity * duration;

        return {
          client_id: config.clientId,
          equipment_id: item.id,
          start_date: startDate,
          end_date: endDate,
          quantity: item.quantity,
          total_amount: Math.round(totalAmount * 100) / 100
        };
      });
    },

    _calculateRentalDays(startDate: string, endDate: string): number {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      // For rentals less than 24 hours, calculate as fraction of day
      if (diffDays < 1) {
        return Math.round(diffDays * 100) / 100;
      }

      // For multi-day rentals, round up to next day if there's any partial day
      return Math.ceil(diffDays);
    }
  }
});
```

### Composable Design

#### useUniversalCart Composable

```typescript
// composables/useUniversalCart.ts
export function useUniversalCart(config?: Partial<CartConfig>) {
  const cartStore = useUniversalCartStore();
  const route = useRoute();

  // Initialize cart with configuration
  const initializeCart = async () => {
    const cartType = config?.type || 'equipment_add';
    const cartConfig = createCartConfig(cartType, config);

    await cartStore.initialize(cartConfig);
  };

  // Reactive state
  const items = computed(() => cartStore.cartItems);
  const itemCount = computed(() => cartStore.itemCount);
  const totalQuantity = computed(() => cartStore.totalQuantity);
  const hasItems = computed(() => cartStore.hasItems);
  const isVisible = computed(() => cartStore.isVisible);

  // Actions
  const addItem = async (item: Partial<CartItem>) => {
    try {
      await cartStore.addItem(item);
      return true;
    } catch (error) {
      console.error('Failed to add item:', error);
      throw error;
    }
  };

  const removeItem = async (itemKey: string) => {
    return cartStore.removeItem(itemKey);
  };

  const updateQuantity = async (itemKey: string, quantity: number) => {
    return cartStore.updateQuantity(itemKey, quantity);
  };

  const updateItemDates = async (itemKey: string, startDate?: string, endDate?: string) => {
    return cartStore.updateItemDates(itemKey, startDate, endDate);
  };

  const clearCart = async () => {
    return cartStore.clearCart();
  };

  const executeAction = async (actionConfig: ActionConfig) => {
    return cartStore.executeAction(actionConfig);
  };

  // Lifecycle
  onMounted(async () => {
    await initializeCart();
  });

  // Watch for route changes to reinitialize if needed
  watch(() => route.path, async () => {
    await initializeCart();
  });

  return {
    // State
    items: readonly(items),
    itemCount: readonly(itemCount),
    totalQuantity: readonly(totalQuantity),
    hasItems: readonly(hasItems),
    isVisible: readonly(isVisible),

    // Actions
    addItem,
    removeItem,
    updateQuantity,
    updateItemDates,
    clearCart,
    executeAction,

    // Store access for advanced usage
    store: cartStore
  };
}
```

#### DateSelector Component

```vue
<!-- components/DateSelector.vue -->
<template>
  <div class="date-selector">
    <div
      class="date-display"
      :class="dateDisplayClass"
      @click="showDateModal = true"
    >
      <i class="fas fa-calendar-alt me-1"></i>
      <span class="dates-text">
        {{ formattedDates }}
      </span>
      <i class="fas fa-edit edit-icon ms-1"></i>
    </div>

    <!-- Date Selection Modal -->
    <Teleport to="body">
      <div v-if="showDateModal" class="modal-overlay" @click="showDateModal = false">
        <div class="modal-content date-modal" @click.stop>
          <div class="modal-header">
            <h5>Настройка дат для {{ item.name }}</h5>
            <button type="button" class="btn-close" @click="showDateModal = false"></button>
          </div>

          <div class="modal-body">
            <div class="date-options">
              <!-- Project Dates Option -->
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="radio"
                  :id="`project-dates-${item.id}`"
                  v-model="dateSource"
                  value="project"
                >
                <label class="form-check-label" :for="`project-dates-${item.id}`">
                  <strong>Даты проекта</strong><br>
                  <small class="text-muted">
                    {{ formatDateRange(projectDates.start, projectDates.end) }}
                  </small>
                </label>
              </div>

              <!-- Custom Dates Option -->
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="radio"
                  :id="`custom-dates-${item.id}`"
                  v-model="dateSource"
                  value="custom"
                >
                <label class="form-check-label" :for="`custom-dates-${item.id}`">
                  <strong>Индивидуальные даты</strong>
                </label>
              </div>

              <!-- Custom Date Inputs -->
              <div v-if="dateSource === 'custom'" class="custom-dates-section mt-3">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Дата начала</label>
                    <input
                      type="text"
                      class="form-control"
                      v-model="customStartDate"
                      readonly
                      @click="showStartDatePicker = true"
                    >
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Дата окончания</label>
                    <input
                      type="text"
                      class="form-control"
                      v-model="customEndDate"
                      readonly
                      @click="showEndDatePicker = true"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDateModal = false">
              Отмена
            </button>
            <button type="button" class="btn btn-primary" @click="saveDates">
              Сохранить
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

### Equipment Search Integration

#### Search Result Integration

```typescript
// Integration with equipment search results
const handleSearchResultSelection = async (equipment: Equipment) => {
  const cartItem = {
    id: equipment.id,
    name: equipment.name,
    serial_number: equipment.serial_number,
    category: equipment.category,
    subcategory: equipment.subcategory,
    quantity: 1,
    is_unique: !!equipment.serial_number,
    daily_rate: equipment.daily_rate
  };

  await cartStore.addItem(cartItem);

  // Show success feedback
  notificationStore.addNotification({
    type: 'success',
    message: `${equipment.name} добавлен в корзину`
  });
};
```

### Scanner Integration

#### Barcode Processing Integration

```typescript
// Integration with barcode scanner
const handleBarcodeScanned = async (barcode: string) => {
  try {
    // Lookup equipment by barcode
    const equipment = await equipmentApi.getByBarcode(barcode);

    if (equipment) {
      await cartStore.addItem({
        ...equipment,
        quantity: 1,
        is_unique: !!equipment.serial_number
      });

      notificationStore.addNotification({
        type: 'success',
        message: `${equipment.name} добавлен через сканер`
      });
    } else {
      notificationStore.addNotification({
        type: 'warning',
        message: 'Оборудование с таким штрих-кодом не найдено'
      });
    }
  } catch (error) {
    console.error('Barcode processing failed:', error);
    notificationStore.addNotification({
      type: 'error',
      message: 'Ошибка обработки штрих-кода'
    });
  }
};
```

### Project Management Integration

#### Embedded Cart Integration

```typescript
// Project page embedded cart integration
const initializeProjectCart = async (projectId: string) => {
  const project = await projectApi.getProject(projectId);

  const cartConfig = createCartConfig('project_view', {
    embedded: true,
    containerId: 'universalCartContainer',
    projectId: projectId,
    startDate: project.start_date,
    endDate: project.end_date
  });

  await cartStore.initialize(cartConfig);
};
```

---

## 🧪 Testing Scenarios

### Unit Testing Requirements

#### Cart Store Tests

```typescript
describe('useUniversalCartStore', () => {
  let store: ReturnType<typeof useUniversalCartStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useUniversalCartStore();
  });

  describe('Item Management', () => {
    it('should add new item to cart', async () => {
      const item = { id: 1, name: 'Camera', quantity: 1 };
      await store.addItem(item);

      expect(store.itemCount).toBe(1);
      expect(store.cartItems[0]).toMatchObject(item);
    });

    it('should aggregate quantity for duplicate items', async () => {
      const item1 = { id: 1, name: 'Camera', quantity: 1 };
      const item2 = { id: 1, name: 'Camera', quantity: 2 };

      await store.addItem(item1);
      await store.addItem(item2);

      expect(store.itemCount).toBe(1);
      expect(store.cartItems[0].quantity).toBe(3);
    });

    it('should handle unique items with serial numbers', async () => {
      const item1 = { id: 1, name: 'Camera', serial_number: 'SN001', quantity: 1 };
      const item2 = { id: 1, name: 'Camera', serial_number: 'SN002', quantity: 1 };

      await store.addItem(item1);
      await store.addItem(item2);

      expect(store.itemCount).toBe(2); // Different serial numbers = different items
    });
  });

  describe('Date Management', () => {
    it('should update item dates', async () => {
      const item = { id: 1, name: 'Camera', quantity: 1 };
      await store.addItem(item);

      const itemKey = '1';
      await store.updateItemDates(itemKey, '2024-01-15', '2024-01-20');

      const updatedItem = store.items.get(itemKey);
      expect(updatedItem?.custom_start_date).toBe('2024-01-15');
      expect(updatedItem?.custom_end_date).toBe('2024-01-20');
      expect(updatedItem?.use_project_dates).toBe(false);
    });

    it('should reset to project dates', async () => {
      const item = { id: 1, name: 'Camera', quantity: 1 };
      await store.addItem(item);

      const itemKey = '1';
      await store.updateItemDates(itemKey, null, null);

      const updatedItem = store.items.get(itemKey);
      expect(updatedItem?.custom_start_date).toBeNull();
      expect(updatedItem?.custom_end_date).toBeNull();
      expect(updatedItem?.use_project_dates).toBe(true);
    });
  });

  describe('Action Execution', () => {
    it('should execute booking action successfully', async () => {
      // Setup mock data
      const mockBookingApi = {
        createBatchBookings: vi.fn().mockResolvedValue({
          success: true,
          created_count: 2,
          created_bookings: []
        })
      };

      // Add items to cart
      await store.addItem({ id: 1, name: 'Camera', quantity: 1 });
      await store.addItem({ id: 2, name: 'Light', quantity: 1 });

      // Execute action
      const result = await store.executeAction({
        type: 'equipment_add',
        clientId: 'client-1',
        projectId: 'project-1',
        startDate: '2024-01-15',
        endDate: '2024-01-20'
      });

      expect(result.success).toBe(true);
      expect(result.created_count).toBe(2);
      expect(store.itemCount).toBe(0); // Cart should be cleared
    });
  });
});
```

#### Component Testing

```typescript
describe('UniversalCart.vue', () => {
  it('should render cart items in table mode', async () => {
    const mockStore = {
      cartItems: [
        { id: 1, name: 'Camera', quantity: 1, category: 'Photo' },
        { id: 2, name: 'Light', quantity: 2, category: 'Lighting' }
      ],
      config: { renderMode: 'table' },
      isVisible: true
    };

    const wrapper = mount(UniversalCart, {
      global: {
        plugins: [createTestingPinia({ initialState: { universalCart: mockStore } })]
      }
    });

    const table = wrapper.find('table');
    expect(table.exists()).toBe(true);

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
  });

  it('should handle item quantity update', async () => {
    const mockStore = {
      cartItems: [{ id: 1, name: 'Camera', quantity: 1 }],
      config: { showQuantityControls: true },
      updateQuantity: vi.fn()
    };

    const wrapper = mount(UniversalCart, {
      global: {
        plugins: [createTestingPinia({ initialState: { universalCart: mockStore } })]
      }
    });

    const quantityInput = wrapper.find('.quantity-input');
    await quantityInput.setValue('3');
    await quantityInput.trigger('change');

    expect(mockStore.updateQuantity).toHaveBeenCalledWith('1', 3);
  });
});
```

### E2E Testing Scenarios

#### Complete Cart Workflow

```typescript
test('complete equipment cart workflow', async ({ page }) => {
  // Navigate to project page
  await page.goto('/projects/1');

  // Add equipment via search
  await page.click('[data-test="equipment-search"]');
  await page.fill('[data-test="equipment-search-input"]', 'camera');
  await page.click('[data-test="search-result"]:first-child');
  await page.click('[data-test="add-to-cart"]');

  // Verify cart is visible and has item
  await expect(page.locator('[data-test="cart-container"]')).toBeVisible();
  await expect(page.locator('[data-test="cart-item"]')).toHaveCount(1);

  // Update quantity
  await page.fill('[data-test="quantity-input"]', '2');
  await expect(page.locator('[data-test="cart-total"]')).toContainText('2');

  // Set custom dates
  await page.click('[data-test="date-selector"]');
  await page.click('[data-test="custom-dates-radio"]');
  await page.click('[data-test="start-date-input"]');
  await page.click('[data-test="date-2024-01-15"]');
  await page.click('[data-test="end-date-input"]');
  await page.click('[data-test="date-2024-01-20"]');
  await page.click('[data-test="save-dates"]');

  // Execute booking action
  await page.click('[data-test="execute-action"]');

  // Verify success and cart clearing
  await expect(page.locator('.toast-success')).toBeVisible();
  await expect(page.locator('[data-test="cart-item"]')).toHaveCount(0);
});
```

#### Date Management Testing

```typescript
test('custom date management', async ({ page }) => {
  // Add item to cart
  await page.goto('/projects/1');
  await page.click('[data-test="add-equipment"]');
  await page.click('[data-test="equipment-item"]:first-child');

  // Verify default project dates
  await expect(page.locator('[data-test="date-display"]')).toHaveClass('project-dates');

  // Switch to custom dates
  await page.click('[data-test="date-display"]');
  await page.click('[data-test="custom-dates-radio"]');

  // Set custom date range
  await page.click('[data-test="start-date-picker"]');
  await page.click('[data-test="date-2024-02-01"]');
  await page.click('[data-test="end-date-picker"]');
  await page.click('[data-test="date-2024-02-05"]');
  await page.click('[data-test="save-dates"]');

  // Verify custom dates are displayed
  await expect(page.locator('[data-test="date-display"]')).toHaveClass('custom-dates');
  await expect(page.locator('[data-test="date-display"]')).toContainText('01.02.2024 - 05.02.2024');

  // Reset to project dates
  await page.click('[data-test="date-display"]');
  await page.click('[data-test="project-dates-radio"]');
  await page.click('[data-test="save-dates"]');

  // Verify project dates are restored
  await expect(page.locator('[data-test="date-display"]')).toHaveClass('project-dates');
});
```

---

## 📋 Migration Notes

### Key Challenges Identified

#### Complex State Management

**Current Issues**:

- **Map-based item storage** with complex key generation logic
- **Event-driven architecture** with multiple subscribers
- **Configuration inheritance** and validation
- **Storage serialization/deserialization** with versioning

**Vue3 Solutions**:

- **Pinia Map state** with reactive updates
- **Composable event system** with proper cleanup
- **TypeScript interfaces** for configuration validation
- **Plugin-based storage** with migration support

#### Date Management Complexity

**Current Issues**:

- **Dual date sources** (project vs custom) per item
- **Date validation** and availability checking
- **Timezone handling** for accurate storage
- **UI differentiation** between date types

**Vue3 Solutions**:

- **Reactive date state** with computed properties
- **Date validation composables** with error handling
- **Timezone utilities** with dayjs integration
- **Visual date indicators** with CSS classes

#### Action Execution Engine

**Current Issues**:

- **Batch processing** with progress tracking
- **Availability validation** before execution
- **Error handling** with partial success scenarios
- **Rollback mechanisms** for failed operations

**Vue3 Solutions**:

- **Async action handling** with loading states
- **Progress tracking** with reactive updates
- **Error boundaries** with user-friendly messages
- **Optimistic updates** for better UX

### Implementation Priorities

#### Phase 1: Core Functionality (High Priority)

1. **Item Management**: Add, remove, quantity updates
2. **Basic Storage**: localStorage persistence
3. **Event System**: Event emission and subscription
4. **Configuration System**: Context-aware configurations

#### Phase 2: Advanced Features (Medium Priority)

1. **Date Management**: Custom dates per item
2. **Availability Checking**: Real-time validation
3. **Action Execution**: Batch booking creation
4. **Progress Tracking**: UI feedback during operations

#### Phase 3: Performance & Polish (Low Priority)

1. **Virtual Scrolling**: For large cart sizes
2. **Storage Compression**: For large datasets
3. **Offline Support**: Service worker integration
4. **Advanced Caching**: API response optimization

### API Considerations

#### Backend Compatibility

**Existing Endpoints**:

- `POST /api/v1/bookings/batch` - Batch booking creation
- `GET /api/v1/equipment/{id}/availability` - Availability checking
- `PATCH /api/v1/bookings/{id}` - Booking updates

**Additional Requirements**:

- **Bulk Availability**: Check multiple items at once
- **Date Validation**: Validate date ranges against business rules
- **Conflict Resolution**: Suggest alternative dates/quantities
- **Progress Tracking**: Real-time progress for batch operations

#### Data Transformation

**Item Processing**:

```typescript
interface CartItem {
  // Core fields
  id: string | number;
  name: string;
  serial_number?: string;
  quantity: number;

  // Date fields
  custom_start_date?: string;
  custom_end_date?: string;
  use_project_dates: boolean;

  // Business fields
  daily_rate?: number;
  category?: string;

  // Metadata
  added_at: string;
  is_unique: boolean;
}
```

### Error Handling Strategy

#### User-Friendly Error Messages

```typescript
const cartErrorMessages = {
  'MAX_CAPACITY_REACHED': 'Корзина заполнена. Максимальное количество позиций: {maxItems}',
  'MAX_QUANTITY_EXCEEDED': 'Превышено максимальное количество для {itemName}: {maxQuantity}',
  'AVAILABILITY_CONFLICT': 'Оборудование недоступно в выбранные даты',
  'DATE_VALIDATION_FAILED': 'Некорректный диапазон дат',
  'STORAGE_QUOTA_EXCEEDED': 'Недостаточно места в хранилище. Попробуйте очистить корзину.',
  'NETWORK_ERROR': 'Ошибка сети. Проверьте подключение к интернету.',
  'VALIDATION_ERROR': 'Ошибка валидации данных'
};
```

#### Graceful Degradation

- **Offline Mode**: Cache cart data locally with sync on reconnect
- **Storage Fallback**: Graceful handling of localStorage unavailability
- **Partial Success**: Handle scenarios where some items succeed and others fail
- **Recovery Mechanisms**: Automatic retry for failed operations

---

## ✅ Summary

The Universal Cart core engine represents one of the most sophisticated components in the CINERENTAL system, featuring advanced state management, event-driven architecture, and comprehensive business logic. The system successfully implements:

- **Advanced Item Management**: Smart quantity aggregation, unique item handling, and capacity management
- **Sophisticated Storage System**: Context-aware localStorage with compression and migration support
- **Event-Driven Architecture**: Comprehensive event system with multiple subscribers and error isolation
- **Custom Date Management**: Individual date ranges per item with project date fallback
- **Action Execution Engine**: Batch booking creation with availability validation and progress tracking
- **Configuration System**: Context-aware configurations for different page types and use cases

**Key Migration Benefits**:

- **Reactive State Management**: Pinia provides better data flow and debugging capabilities
- **Type Safety**: TypeScript prevents runtime errors in complex cart operations
- **Component Reusability**: Modular design enables consistent cart behavior across the application
- **Performance Optimization**: Reactive updates and computed properties for efficient rendering
- **Developer Experience**: Clear separation of concerns and composable architecture

The Vue3 migration will significantly enhance the system's maintainability while preserving the sophisticated cart functionality that users depend on for efficient equipment management across different contexts in the cinema rental workflow.
