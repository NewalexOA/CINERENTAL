<template>
  <div
    class="cart-items-list"
    :data-testid="testId"
    role="list"
    :aria-label="`Cart items list with ${items.length} items`"
  >
    <!-- Empty State -->
    <div v-if="items.length === 0" class="empty-state">
      <div class="empty-icon" aria-hidden="true">
        <svg class="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zM8 6V5a2 2 0 114 0v1H8zm0 2.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z" clip-rule="evenodd" />
        </svg>
      </div>
      <h3 class="empty-title">Your cart is empty</h3>
      <p class="empty-description">{{ emptyMessage }}</p>
    </div>

    <!-- Items with Virtual Scrolling (for large lists) -->
    <div
      v-else-if="useVirtualScrolling && items.length > virtualThreshold"
      ref="virtualContainer"
      class="virtual-list-container"
      :style="{ height: `${maxHeight}px` }"
      @scroll="handleScroll"
    >
      <div class="virtual-list-spacer" :style="{ height: `${virtualState.totalHeight}px` }">
        <div
          class="virtual-list-items"
          :style="{ transform: `translateY(${virtualState.visibleStart * estimatedItemHeight}px)` }"
        >
          <CartItem
            v-for="({ key, item }, index) in visibleItems"
            :key="key"
            :item="item"
            :item-key="key"
            :allow-date-edit="allowDateEdit"
            :max-quantity="maxQuantity"
            :show-cost-breakdown="showCostBreakdown"
            :style="{ height: `${estimatedItemHeight}px` }"
            @removed="handleItemRemoved"
            @updated="handleItemUpdated"
            @error="handleItemError"
          />
        </div>
      </div>
    </div>

    <!-- Regular List (for smaller lists) -->
    <div v-else class="regular-list">
      <CartItem
        v-for="({ key, item }) in itemsWithKeys"
        :key="key"
        :item="item"
        :item-key="key"
        :allow-date-edit="allowDateEdit"
        :max-quantity="maxQuantity"
        :show-cost-breakdown="showCostBreakdown"
        @removed="handleItemRemoved"
        @updated="handleItemUpdated"
        @error="handleItemError"
      />
    </div>

    <!-- Summary Section -->
    <div v-if="showSummary && items.length > 0" class="cart-summary">
      <div class="summary-row">
        <span class="summary-label">Total Items:</span>
        <span class="summary-value">{{ totalQuantity }}</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Equipment Count:</span>
        <span class="summary-value">{{ items.length }}</span>
      </div>
      <div class="summary-row summary-total">
        <span class="summary-label">Total Cost:</span>
        <span class="summary-value">{{ formatCurrency(totalCost) }}</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p class="loading-text">{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-banner" role="alert">
      <div class="error-content">
        <span class="error-icon" aria-hidden="true">⚠</span>
        <div class="error-details">
          <p class="error-message">{{ error }}</p>
          <BaseButton
            v-if="showRetry"
            size="sm"
            variant="outline"
            @click="$emit('retry')"
            class="mt-2"
          >
            Try Again
          </BaseButton>
        </div>
        <BaseButton
          size="sm"
          variant="text"
          @click="clearError"
          aria-label="Dismiss error"
        >
          ×
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import CartItem from './CartItem.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import type { CartItem as CartItemType } from '@/types/cart'

// Virtual scrolling implementation
interface VirtualScrollState {
  scrollTop: number
  containerHeight: number
  totalHeight: number
  visibleStart: number
  visibleEnd: number
}

interface Props {
  items: CartItemType[]
  itemKeys: string[]
  loading?: boolean
  error?: string
  emptyMessage?: string
  loadingMessage?: string
  allowDateEdit?: boolean
  maxQuantity?: number
  showCostBreakdown?: boolean
  showSummary?: boolean
  showRetry?: boolean
  useVirtualScrolling?: boolean
  virtualThreshold?: number
  maxHeight?: number
  estimatedItemHeight?: number
  testId: string
}

interface Emits {
  (event: 'item-removed', itemKey: string): void
  (event: 'item-updated', itemKey: string): void
  (event: 'item-error', error: string): void
  (event: 'retry'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  emptyMessage: 'Add equipment to your cart to get started.',
  loadingMessage: 'Loading cart items...',
  allowDateEdit: true,
  maxQuantity: 999,
  showCostBreakdown: true,
  showSummary: true,
  showRetry: true,
  useVirtualScrolling: true,
  virtualThreshold: 20,
  maxHeight: 400,
  estimatedItemHeight: 160,
  testId: 'cart-items-list'
})

const emit = defineEmits<Emits>()

// Virtual scrolling state
const virtualContainer = ref<HTMLElement>()
const virtualState = ref<VirtualScrollState>({
  scrollTop: 0,
  containerHeight: 0,
  totalHeight: 0,
  visibleStart: 0,
  visibleEnd: 0
})

// Combine items with their keys for rendering
const itemsWithKeys = computed(() => {
  return props.items.map((item, index) => ({
    key: props.itemKeys[index],
    item
  }))
})

// Virtual scrolling computed properties
const visibleItems = computed(() => {
  if (!props.useVirtualScrolling || props.items.length <= props.virtualThreshold) {
    return itemsWithKeys.value
  }

  return itemsWithKeys.value.slice(virtualState.value.visibleStart, virtualState.value.visibleEnd)
})

// Initialize virtual scrolling
const initializeVirtualScrolling = async () => {
  if (!props.useVirtualScrolling || !virtualContainer.value) return

  await nextTick()

  const containerHeight = virtualContainer.value.clientHeight
  const totalItems = props.items.length
  const totalHeight = totalItems * props.estimatedItemHeight

  const visibleCount = Math.ceil(containerHeight / props.estimatedItemHeight) + 2 // Buffer
  const visibleStart = 0
  const visibleEnd = Math.min(visibleCount, totalItems)

  virtualState.value = {
    scrollTop: 0,
    containerHeight,
    totalHeight,
    visibleStart,
    visibleEnd
  }
}

// Handle virtual scroll events
const handleScroll = (event: Event) => {
  if (!props.useVirtualScrolling) return

  const target = event.target as HTMLElement
  const scrollTop = target.scrollTop
  const containerHeight = target.clientHeight

  const visibleStart = Math.floor(scrollTop / props.estimatedItemHeight)
  const visibleCount = Math.ceil(containerHeight / props.estimatedItemHeight) + 2 // Buffer
  const visibleEnd = Math.min(visibleStart + visibleCount, props.items.length)

  virtualState.value = {
    scrollTop,
    containerHeight,
    totalHeight: props.items.length * props.estimatedItemHeight,
    visibleStart: Math.max(0, visibleStart),
    visibleEnd
  }
}

// Summary calculations
const totalQuantity = computed(() => {
  return props.items.reduce((total, item) => total + item.quantity, 0)
})

const totalCost = computed(() => {
  return props.items.reduce((total, item) => total + item.totalCost, 0)
})

// Methods
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

function handleItemRemoved(itemKey: string): void {
  emit('item-removed', itemKey)
}

function handleItemUpdated(itemKey: string): void {
  emit('item-updated', itemKey)
}

function handleItemError(error: string): void {
  emit('item-error', error)
}

function clearError(): void {
  emit('item-error', '')
}

// Initialize virtual scrolling when items change
watch(() => props.items.length, () => {
  if (props.useVirtualScrolling && props.items.length > props.virtualThreshold) {
    nextTick(() => initializeVirtualScrolling())
  }
}, { immediate: true })
</script>

<style scoped>
.cart-items-list {
  @apply relative;
}

/* Empty State */
.empty-state {
  @apply flex flex-col items-center justify-center py-12 px-4 text-center;
}

.empty-icon {
  @apply mb-4;
}

.empty-title {
  @apply text-lg font-medium text-gray-900 mb-2;
}

.empty-description {
  @apply text-gray-500 max-w-sm;
}

/* Virtual List Container */
.virtual-list-container {
  @apply relative overflow-auto rounded-lg border border-gray-200;
}

.virtual-list-spacer {
  @apply relative;
}

.virtual-list-items {
  @apply absolute top-0 left-0 right-0;
}

/* Regular List */
.regular-list {
  @apply space-y-0;
}

/* Summary Section */
.cart-summary {
  @apply mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200;
}

.summary-row {
  @apply flex justify-between items-center py-1;
}

.summary-total {
  @apply font-semibold text-lg pt-2 mt-2 border-t border-gray-300;
}

.summary-label {
  @apply text-gray-600;
}

.summary-value {
  @apply text-gray-900;
}

/* Loading State */
.loading-overlay {
  @apply absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10;
}

.loading-content {
  @apply text-center;
}

.loading-spinner {
  @apply w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2;
}

.loading-text {
  @apply text-gray-600;
}

/* Error Banner */
.error-banner {
  @apply mt-4 p-4 bg-red-50 border border-red-200 rounded-lg;
}

.error-content {
  @apply flex items-start gap-3;
}

.error-icon {
  @apply text-red-500 flex-shrink-0 text-lg;
}

.error-details {
  @apply flex-1;
}

.error-message {
  @apply text-red-700 font-medium;
}

/* Responsive Design */
@media (max-width: 640px) {
  .cart-summary {
    @apply text-sm;
  }

  .summary-total {
    @apply text-base;
  }

  .empty-state {
    @apply py-8;
  }

  .virtual-list-container,
  .regular-list {
    @apply mx-2;
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    @apply animate-none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .cart-summary {
    @apply border-2 border-black;
  }

  .error-banner {
    @apply border-2 border-red-600;
  }
}

/* Focus management for accessibility */
.cart-items-list:focus-within .virtual-list-container,
.cart-items-list:focus-within .regular-list {
  @apply ring-2 ring-blue-500 ring-offset-2 rounded-lg;
}
</style>
