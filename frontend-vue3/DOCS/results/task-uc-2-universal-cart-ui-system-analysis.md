# Task UC-2: Universal Cart UI System Analysis

## Overview

The Universal Cart UI System represents one of the most sophisticated frontend components in CINERENTAL, featuring a complex dual-mode rendering architecture that adapts between embedded and floating display modes. This analysis covers the complete UI layer including rendering engines, template system, modal dialogs, event handling, and responsive design patterns.

## Current Implementation Analysis

### Architecture Overview

The Universal Cart UI system consists of five interconnected modules:

1. **CartUI (cart-ui.js)** - Main coordinator with dual-mode detection
2. **CartRenderer (cart-renderer.js)** - Multi-mode rendering engine
3. **CartTemplates (cart-templates.js)** - HTML template generation system
4. **CartDialogs (cart-dialogs.js)** - Modal and notification system
5. **CartEventHandler (cart-event-handler.js)** - Event management and user interactions

### Dual-Mode Rendering System

#### Embedded Mode Detection

```javascript
// Auto-detection logic in CartUI._createUI()
const projectPageContainer = document.getElementById('universalCartContainer');
if (projectPageContainer) {
    this.isEmbedded = true;
    this.container = projectPageContainer;
}
```

**Embedded Mode Features:**

- Integrates seamlessly into existing page layouts
- Uses existing DOM containers (`universalCartContainer`, `cartContent`)
- Maintains page context and navigation
- Shows/hides based on cart content state
- Optimized for project detail pages (`/projects/54`)

**Floating Mode Features:**

- Creates overlay-style interface
- Fixed positioning with z-index management
- Independent of page layout constraints
- Toggle button with animated badge
- Used on equipment catalog and other pages

#### Mode-Specific Rendering Logic

**Embedded Mode Rendering:**

```javascript
_renderEmbedded() {
    const items = this.cart.getItems();
    const itemCount = this.cart.getItemCount();

    // Update badge count
    const badge = document.getElementById('cartItemCount');
    if (badge) {
        badge.textContent = `${itemCount} позиций`;
        badge.classList.add('updated');
        setTimeout(() => badge.classList.remove('updated'), 600);
    }

    // Render items with custom date controls
    if (this.cartContent && itemCount > 0) {
        this.cartContent.innerHTML = this._renderEmbeddedItems(items);
        this._setupEmbeddedEventListeners();
    }
}
```

### Multi-Mode Rendering Engine

#### Render Mode Configuration

```javascript
// Configuration-based rendering mode selection
const defaultConfig = {
    renderMode: 'cards',  // Options: 'cards', 'table', 'compact'
    showCostInfo: true,
    maxItems: 50,
    // ... other settings
};
```

#### Cards Mode (Default)

- Bootstrap card-based layout
- Individual item cards with full details
- Cost information display
- Quantity controls for non-serial items
- Date customization indicators
- Remove buttons with confirmation

#### Table Mode

- Bootstrap table with responsive design
- Inline date editing with daterangepicker
- Compact quantity controls
- Batch operation support
- Sortable columns (future enhancement)

#### Compact Mode

- Minimal space usage
- Essential information only
- Streamlined interactions
- Mobile-optimized display

### Template System Architecture

#### Dynamic Template Processing

```javascript
// Template processing with data substitution
processTemplate(template, data) {
    let processed = template;
    Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processed = processed.replace(regex, data[key]);
    });
    return processed;
}
```

#### Template Types

1. **Container Templates** - Main cart structure
2. **Item Templates** - Individual equipment rendering
3. **Summary Templates** - Cost and statistics display
4. **Action Templates** - Button and control layouts
5. **Dialog Templates** - Modal content structures

### Event Handling System

#### Delegated Event Management

```javascript
// Efficient event delegation for dynamic content
_setupContainerEvents(container) {
    const itemsList = container.querySelector('.cart-items-list');
    if (itemsList) {
        itemsList.addEventListener('click', this._handleItemControlClick);
        itemsList.addEventListener('change', this._handleItemInputChange);
    }
}
```

#### Custom Event System

```javascript
// Cart business logic events
this.cart.on('itemAdded', (data) => {
    this.renderer.trackActivity('add', data.item.name);
    this.cartUI.render();
    this.cartUI._showNotification('Позиция добавлена в корзину', 'success');
    this.cartUI._animateBadge();
});
```

#### Date Management Events

```javascript
// Date range picker integration
container.addEventListener('cartItemDateChanged', (event) => {
    const { itemId, startDate, endDate } = event.detail;
    this.cart.updateItemDates(itemKey, startDate, endDate);
});
```

### Modal and Dialog System

#### Confirmation Dialogs

```javascript
// Configurable confirmation system
showConfirmDialog(options = {}) {
    const config = {
        title: 'Подтверждение',
        message: 'Вы уверены?',
        confirmText: 'Да',
        cancelText: 'Отмена',
        type: 'default', // default, warning, danger, info
        additionalOptions: []
    };
}
```

#### Loading States

```javascript
// Non-blocking loading indicators
showLoadingDialog(message) {
    // Returns controller for dynamic updates
    return {
        close: () => this._closeDialog(dialog),
        updateMessage: (newMessage) => { /* update */ }
    };
}
```

#### Toast Notifications

```javascript
// Bootstrap toast-based notifications
showNotification(message, type = 'info', duration = 3000) {
    // Auto-dismiss with configurable timing
    // Positioned for accessibility
}
```

### Responsive Design Patterns

#### Mobile Optimizations

- Compact mode activation on small screens
- Touch-friendly button sizes
- Swipe gestures for item removal
- Collapsible sections for detailed information

#### Breakpoint-Specific Behaviors

```css
/* Example responsive behavior */
@media (max-width: 768px) {
    .universal-cart-container {
        width: 95vw;
        max-height: 70vh;
    }

    .cart-item-embedded {
        padding: 0.5rem;
    }
}
```

#### Adaptive Layout System

- Dynamic column sizing based on content
- Flexible grid systems for different item counts
- Content prioritization for limited screen space

### Accessibility Considerations

#### Keyboard Navigation

```javascript
// Full keyboard support
_setupDocumentEvents() {
    document.addEventListener('keydown', this._handleKeyDown);
}

// Focus management
const firstFocusable = this.container.querySelector('button, input, [tabindex]');
if (firstFocusable) {
    setTimeout(() => firstFocusable.focus(), 100);
}
```

#### Screen Reader Support

- ARIA labels and descriptions
- Semantic HTML structure
- Status announcements for dynamic changes
- High contrast mode compatibility

#### Focus Management

- Logical tab order
- Focus trapping in modals
- Visual focus indicators
- Screen reader announcements

## UX Interaction Patterns

### User Workflow Analysis

#### Equipment Addition Flow

1. **Discovery** - User browses equipment catalog
2. **Selection** - Clicks add button or scans barcode
3. **Configuration** - Sets quantity and custom dates if needed
4. **Confirmation** - Visual feedback and badge update
5. **Persistence** - Automatic localStorage save

#### Date Customization Workflow

1. **Trigger** - Click on date display area
2. **Interface** - Date range picker opens
3. **Selection** - Choose start/end dates with time
4. **Validation** - Conflict checking with existing bookings
5. **Application** - Update cart item and visual indicators

#### Bulk Operations Workflow

1. **Selection** - Multiple items selection (future feature)
2. **Action Choice** - Clear, save, or batch booking
3. **Confirmation** - Modal with operation details
4. **Processing** - Loading states and progress feedback
5. **Completion** - Success/error notifications

### Visual Feedback Mechanisms

#### Loading States

- Skeleton screens for content loading
- Spinner animations for processing
- Progress bars for multi-step operations
- Disabled states during async operations

#### Success/Error Indicators

- Toast notifications with appropriate colors
- Badge animations for cart updates
- Inline validation messages
- Status icon changes

#### Interactive States

- Hover effects on buttons and controls
- Active states for pressed elements
- Focus rings for keyboard navigation
- Transition animations between states

## Business Logic Requirements

### Cart State Management

- **Item Addition** - Validation, quantity limits, duplicate handling
- **Item Modification** - Quantity changes, date updates, property modifications
- **Item Removal** - Individual and bulk deletion with confirmation
- **Cart Persistence** - localStorage with migration and conflict resolution

### Date Management Logic

- **Project Dates** - Automatic inheritance from project timeline
- **Custom Dates** - User override with validation
- **Date Conflicts** - Real-time availability checking
- **Time Zone Handling** - Consistent date/time display

### Quantity Management

- **Serial Items** - Single quantity, unique identification
- **Bulk Items** - Quantity controls with min/max limits
- **Availability Checking** - Real-time stock validation
- **Quantity Validation** - Business rule enforcement

## Vue3 Implementation Specification

### Component Architecture

#### Main Components

```vue
<!-- UniversalCart.vue -->
<template>
    <Teleport v-if="isFloating" to="body">
        <div class="universal-cart-container"
             :class="{ 'show': isVisible, 'embedded': isEmbedded }">
            <!-- Cart content -->
        </div>
    </Teleport>
    <div v-else class="universal-cart-embedded">
        <!-- Embedded content -->
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useUIStore } from '@/stores/ui'

// Component logic
</script>
```

#### Specialized Components

```vue
<!-- CartItem.vue -->
<template>
    <div class="cart-item" :data-item-key="itemKey">
        <div class="item-header">
            <h6>{{ item.name }}</h6>
            <button @click="removeItem" class="btn-close"></button>
        </div>

        <CartItemDates
            :item="item"
            :dates="datesInfo"
            @date-changed="handleDateChange" />

        <CartItemQuantity
            v-if="!item.serial_number"
            :quantity="item.quantity"
            @update="updateQuantity" />
    </div>
</template>
```

### Pinia Store Architecture

#### Cart Store Design

```javascript
// stores/cart.js
export const useCartStore = defineStore('cart', {
    state: () => ({
        items: new Map(),
        config: {},
        isInitialized: false
    }),

    getters: {
        itemCount: (state) => state.items.size,
        totalQuantity: (state) => { /* calculation */ },
        isEmpty: (state) => state.items.size === 0
    },

    actions: {
        async addItem(item, options = {}) {
            // Business logic
            this.items.set(itemKey, item);
            await this.saveToStorage();
        },

        async updateItemDates(itemKey, startDate, endDate) {
            // Date validation and update
        },

        async removeItem(itemKey) {
            // Removal logic
        }
    }
})
```

#### UI State Management

```javascript
// stores/ui.js
export const useUIStore = defineStore('ui', {
    state: () => ({
        isCartVisible: false,
        isEmbedded: false,
        renderMode: 'cards',
        notifications: []
    }),

    actions: {
        showNotification(message, type = 'info') {
            // Notification management
        },

        toggleCart() {
            this.isCartVisible = !this.isCartVisible;
        }
    }
})
```

### Composables Design

#### Cart Logic Composable

```javascript
// composables/useCart.js
export function useCart() {
    const cartStore = useCartStore()
    const uiStore = useUIStore()

    const addToCart = async (equipment, options = {}) => {
        try {
            await cartStore.addItem(equipment, options)
            uiStore.showNotification('Добавлено в корзину', 'success')
        } catch (error) {
            uiStore.showNotification(error.message, 'error')
        }
    }

    const updateQuantity = async (itemKey, quantity) => {
        // Quantity update logic with validation
    }

    return {
        addToCart,
        updateQuantity,
        removeFromCart,
        // ... other methods
    }
}
```

#### Date Management Composable

```javascript
// composables/useCartDates.js
export function useCartDates() {
    const cartStore = useCartStore()

    const updateItemDates = async (itemKey, startDate, endDate) => {
        // Date validation
        const conflicts = await checkAvailability(itemKey, startDate, endDate)
        if (conflicts.length > 0) {
            throw new Error('Обнаружены конфликты с существующими бронированиями')
        }

        await cartStore.updateItemDates(itemKey, startDate, endDate)
    }

    return {
        updateItemDates,
        validateDateRange,
        checkAvailability
    }
}
```

### Component Communication

#### Event System

```javascript
// Event bus for cross-component communication
export const cartEvents = createEventBus()

// Usage in components
cartEvents.on('item-added', handleItemAdded)
cartEvents.emit('item-added', { item, quantity })
```

#### Provide/Inject Pattern

```javascript
// Parent component
provide('cartContext', {
    addToCart: useCart().addToCart,
    updateQuantity: useCart().updateQuantity
})

// Child component
const { addToCart } = inject('cartContext')
```

## Integration Requirements

### API Integration Points

- Equipment data fetching
- Availability checking
- Booking creation
- Cart persistence
- Conflict resolution

### Third-Party Libraries

- **Date Range Picker** - Custom Vue3 component or PrimeVue Calendar
- **Toast Notifications** - Vue Toastification or PrimeVue Toast
- **Modal System** - Vue3 built-in Teleport or PrimeVue Dialog
- **Loading States** - Custom loading component or PrimeVue ProgressSpinner

### Performance Optimizations

- Virtual scrolling for large item lists
- Lazy loading of component templates
- Debounced search and filtering
- Memory-efficient event handling

## Testing Scenarios

### Unit Tests

- Component rendering in different modes
- Event handling and user interactions
- Date validation and conflict detection
- State management and persistence

### Integration Tests

- Cart functionality across different pages
- Modal and dialog interactions
- API integration and error handling
- Cross-browser compatibility

### E2E Tests

- Complete user workflows
- Mobile responsiveness
- Accessibility compliance
- Performance under load

## Migration Notes

### Technical Challenges

1. **Dual-mode complexity** - Maintaining consistent behavior across modes
2. **Event delegation** - Converting to Vue3 event system
3. **Template processing** - Moving from string templates to SFC
4. **State synchronization** - Pinia store integration
5. **Performance optimization** - Handling large item sets

### Implementation Strategy

1. **Phase 1**: Core cart functionality with single mode
2. **Phase 2**: Dual-mode support and advanced features
3. **Phase 3**: Performance optimizations and testing
4. **Phase 4**: Accessibility enhancements and polish

### Risk Mitigation

- **Incremental migration** - Feature flags for gradual rollout
- **Backward compatibility** - Maintain existing API during transition
- **User testing** - Extensive QA on cart functionality
- **Performance monitoring** - Real-time performance tracking

## Conclusion

The Universal Cart UI System represents a sophisticated, production-ready component with advanced features like dual-mode rendering, multi-format display options, comprehensive event handling, and accessibility support. The Vue3 migration requires careful consideration of the complex state management, event delegation, and template systems while maintaining the existing user experience and functionality.

The proposed architecture leverages Vue3's Composition API, Pinia for state management, and modern component patterns to create a maintainable and extensible system that can grow with future requirements.
