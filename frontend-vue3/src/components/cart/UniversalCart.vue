<template>
  <div :class="cartContainerClasses">
    <div v-if="!isEmbedded" class="floating-cart-toggle">
      <BaseButton @click="cartStore.toggleVisibility" icon="shopping-cart">
        <span v-if="cartStore.itemCount > 0" class="badge">{{ cartStore.itemCount }}</span>
      </BaseButton>
    </div>

    <div v-if="cartStore.isVisible || isEmbedded" class="cart-content">
      <div class="cart-header">
        <h3>Universal Cart</h3>
        <BaseButton @click="cartStore.clearCart" variant="danger" size="sm">Clear</BaseButton>
      </div>

      <div class="cart-items">
        <!-- CartItem components will go here -->
        <div v-for="item in cartStore.cartItems" :key="item.equipment.id" class="cart-item">
          {{ item.equipment.name }} - Qty: {{ item.quantity }}
        </div>
        <p v-if="!cartStore.hasItems">Your cart is empty.</p>
      </div>

      <div class="cart-footer">
        <BaseButton @click="executeAction">Execute Action</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cart'
import BaseButton from '@/components/common/BaseButton.vue'
import CartItemsList from './CartItemsList.vue'

interface Props {
  mode?: 'floating' | 'embedded'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'floating',
})

const cartStore = useCartStore()

const isEmbedded = computed(() => props.mode === 'embedded')

const cartContainerClasses = computed(() => ({
  'universal-cart': true,
  'cart--embedded': isEmbedded.value,
  'cart--floating': !isEmbedded.value,
  'cart--visible': cartStore.isVisible,
  'cart--loading': cartStore.loading
}))

// Computed properties for enhanced UI
const itemKeys = computed(() => {
  return Array.from(cartStore.items.keys())
})

const modeDisplayName = computed(() => {
  const modeNames = {
    'equipment_add': 'Add Equipment',
    'equipment_remove': 'Return Equipment',
    'booking_edit': 'Edit Booking'
  }
  return modeNames[cartStore.mode] || 'Cart'
})

// Methods
function getEmptyMessage(): string {
  const messages = {
    'equipment_add': 'Add equipment to your cart to get started.',
    'equipment_remove': 'Select equipment to return.',
    'booking_edit': 'No bookings selected for editing.'
  }
  return messages[cartStore.mode] || 'Your cart is empty.'
}

function getActionButtonText(): string {
  const buttonTexts = {
    'equipment_add': 'Create Bookings',
    'equipment_remove': 'Process Returns',
    'booking_edit': 'Update Bookings'
  }
  return buttonTexts[cartStore.mode] || 'Execute Action'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Event handlers
function handleItemRemoved(itemKey: string): void {
  console.log('Item removed:', itemKey)
}

function handleItemUpdated(itemKey: string): void {
  console.log('Item updated:', itemKey)
}

function handleItemError(error: string): void {
  console.error('Item error:', error)
}

function handleRetry(): void {
  // Retry failed operations
  console.log('Retrying operation...')
}

async function executeAction(): Promise<void> {
  try {
    await cartStore.executeActions()
    console.log('Cart action executed successfully')
  } catch (error) {
    console.error('Failed to execute cart action:', error)
  }
}

// Lifecycle
onMounted(() => {
  // Initialize cart based on mode
  cartStore.setEmbeddedMode(isEmbedded.value)

  // Set up event listeners for cart events
  cartStore.addEventListener('actionCompleted', (data) => {
    console.log('Cart action completed:', data)
  })

  cartStore.addEventListener('actionFailed', (data) => {
    console.error('Cart action failed:', data)
  })
})

</script>

<style scoped>
/* Container Styles */
.universal-cart {
  @apply relative;
}

.cart--floating {
  @apply fixed bottom-5 right-5 z-50;
}

.cart--embedded {
  @apply relative w-full;
}

/* Floating Toggle Button */
.floating-cart-toggle {
  @apply relative;
}

.floating-toggle {
  @apply relative p-3 bg-blue-600 text-white rounded-full shadow-lg;
  @apply hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
  @apply transition-all duration-200 transform hover:scale-105;
}

.floating-toggle--active {
  @apply bg-blue-700 scale-105;
}

.floating-toggle--has-items {
  @apply animate-pulse;
}

.cart-badge {
  @apply absolute -top-2 -right-2 bg-red-500 text-white;
  @apply rounded-full px-2 py-1 text-xs font-bold;
  @apply min-w-[1.25rem] h-5 flex items-center justify-center;
}

/* Cart Content */
.cart-content {
  @apply bg-white rounded-lg shadow-xl border border-gray-200;
  @apply flex flex-col max-h-screen;
}

.cart-content--floating {
  @apply w-96 max-w-[calc(100vw-2rem)];
  @apply max-h-[calc(100vh-6rem)];
}

.cart-content--embedded {
  @apply w-full h-full;
}

/* Header */
.cart-header {
  @apply flex justify-between items-start p-4 border-b border-gray-200;
  @apply bg-gray-50 rounded-t-lg;
}

.header-title {
  @apply flex-1;
}

.cart-title {
  @apply text-lg font-semibold text-gray-900 mb-1;
}

.item-count {
  @apply text-sm font-normal text-gray-500;
}

.cart-mode-indicator {
  @apply text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full inline-block;
}

.header-title {
  @apply flex-1;
}

.cart-title {
  @apply text-lg font-semibold text-gray-900 mb-1;
}

.item-count {
  @apply text-sm font-normal text-gray-500;
}

.cart-mode-indicator {
  @apply text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full inline-block;
}

.header-actions {
  @apply flex gap-2 ml-4;
}

/* Error Display */
.cart-errors {
  @apply p-3 bg-red-50 border-b border-red-200;
}

.error-item {
  @apply flex items-start gap-2 mb-2 last:mb-0;
}

.error-icon {
  @apply text-red-500 flex-shrink-0;
}

.error-message {
  @apply text-sm text-red-700 flex-1;
}

.clear-errors-btn {
  @apply text-red-600 hover:text-red-700;
}

/* Body */
.cart-body {
  @apply flex-1 overflow-hidden p-4;
}

/* Footer */
.cart-footer {
  @apply p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg;
}

/* Progress Tracking */
.progress-container {
  @apply px-4 py-3 border-b border-gray-200 bg-blue-50;
}

.progress-bar {
  @apply w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2;
}

.progress-fill {
  @apply h-full bg-blue-500 transition-all duration-300 ease-out;
}

.progress-status {
  @apply flex justify-between items-center text-sm text-blue-700;
}

.progress-percent {
  @apply font-semibold;
}

/* Enhanced Error Display */
.cart-errors {
  @apply p-3 bg-red-50 border-b border-red-200;
}

.error-item {
  @apply flex items-start gap-2 mb-2 last:mb-0;
}

.error-icon {
  @apply text-red-500 flex-shrink-0;
}

.error-message {
  @apply text-sm text-red-700 flex-1;
}

.clear-errors-btn {
  @apply text-red-600 hover:text-red-700;
}

.footer-summary {
  @apply mb-3;
}

.summary-line {
  @apply flex justify-between items-center text-sm;
}

.total-cost {
  @apply font-semibold text-lg text-gray-900;
}

.footer-actions {
  @apply flex gap-2 justify-end;
}

.summary-line {
  @apply flex justify-between items-center text-sm;
}

.total-cost {
  @apply font-semibold text-lg text-gray-900;
}

.footer-actions {
  @apply flex gap-2 justify-end;
}

/* Backdrop */
.cart-backdrop {
  @apply fixed inset-0 bg-black bg-opacity-50 z-40;
}

/* Transitions */
.cart-floating-enter-active,
.cart-floating-leave-active {
  @apply transition-all duration-300 ease-out;
}

.cart-floating-enter-from {
  @apply transform translate-y-4 scale-95 opacity-0;
}

.cart-floating-leave-to {
  @apply transform translate-y-4 scale-95 opacity-0;
}

.cart-embedded-enter-active,
.cart-embedded-leave-active {
  @apply transition-all duration-200 ease-out;
}

.cart-embedded-enter-from,
.cart-embedded-leave-to {
  @apply opacity-0 transform scale-98;
}

.backdrop-enter-active,
.backdrop-leave-active {
  @apply transition-opacity duration-200;
}

.backdrop-enter-from,
.backdrop-leave-to {
  @apply opacity-0;
}

/* Loading States */
.cart--loading {
  @apply pointer-events-none;
}

.cart--loading .cart-content {
  @apply opacity-75;
}

/* Body */
.cart-body {
  @apply flex-1 overflow-hidden p-4;
}

/* Responsive Design */
@media (max-width: 640px) {
  .cart--floating {
    @apply bottom-4 right-4;
  }

  .cart-content--floating {
    @apply w-[calc(100vw-2rem)] max-w-none;
  }

  .cart-header {
    @apply px-3 py-3;
  }

  .cart-body {
    @apply px-3;
  }

  .cart-footer {
    @apply px-3 py-3;
  }

  .footer-actions {
    @apply flex-col gap-2;
  }
}

/* Accessibility Improvements */
@media (prefers-reduced-motion: reduce) {
  .floating-toggle {
    @apply transition-none transform-none;
  }

  .floating-toggle--has-items {
    @apply animate-none;
  }

  .cart-floating-enter-active,
  .cart-floating-leave-active,
  .cart-embedded-enter-active,
  .cart-embedded-leave-active,
  .backdrop-enter-active,
  .backdrop-leave-active {
    @apply transition-none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .cart-content {
    @apply border-2 border-black;
  }

  .floating-toggle {
    @apply border-2 border-white;
  }
}

/* Focus management */
.cart-content:focus-within {
  @apply ring-2 ring-blue-500 ring-offset-2;
}

.floating-toggle:focus {
  @apply outline-none;
}
</style>
