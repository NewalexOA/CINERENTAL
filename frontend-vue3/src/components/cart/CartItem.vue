<template>
  <div
    :class="itemClasses"
    :data-testid="`cart-item-${item.equipment.id}`"
    role="listitem"
    :aria-label="`Cart item: ${item.equipment.name}, quantity: ${item.quantity}`"
  >
    <!-- Equipment Info -->
    <div class="cart-item__info">
      <div class="cart-item__image">
        <img
          v-if="item.equipment.image_url"
          :src="item.equipment.image_url"
          :alt="item.equipment.name"
          class="equipment-image"
          loading="lazy"
        >
        <div v-else class="equipment-image-placeholder">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>

      <div class="cart-item__details">
        <h4 class="equipment-name">{{ item.equipment.name }}</h4>
        <p v-if="item.equipment.description" class="equipment-description">
          {{ item.equipment.description }}
        </p>
        <div class="equipment-meta">
          <span class="barcode">{{ item.equipment.barcode }}</span>
          <span v-if="item.equipment.category_name" class="category">
            {{ item.equipment.category_name }}
          </span>
        </div>
      </div>
    </div>

    <!-- Quantity Controls -->
    <div class="cart-item__quantity">
      <label :for="`quantity-${itemKey}`" class="sr-only">
        Quantity for {{ item.equipment.name }}
      </label>
      <div class="quantity-controls">
        <BaseButton
          :id="`qty-decrease-${itemKey}`"
          size="sm"
          variant="outline"
          @click="decreaseQuantity"
          :disabled="item.quantity <= 1 || loading"
          :aria-label="`Decrease quantity for ${item.equipment.name}`"
          data-testid="quantity-decrease"
        >
          -
        </BaseButton>

        <input
          :id="`quantity-${itemKey}`"
          v-model.number="localQuantity"
          type="number"
          min="1"
          :max="maxQuantity"
          class="quantity-input"
          :disabled="loading"
          @blur="updateQuantity"
          @keyup.enter="updateQuantity"
          :data-testid="`quantity-input-${item.equipment.id}`"
        >

        <BaseButton
          :id="`qty-increase-${itemKey}`"
          size="sm"
          variant="outline"
          @click="increaseQuantity"
          :disabled="localQuantity >= maxQuantity || loading"
          :aria-label="`Increase quantity for ${item.equipment.name}`"
          data-testid="quantity-increase"
        >
          +
        </BaseButton>
      </div>
    </div>

    <!-- Date Range (if editable) -->
    <div v-if="allowDateEdit" class="cart-item__dates">
      <div class="date-inputs">
        <div class="date-field">
          <label :for="`start-date-${itemKey}`" class="date-label">Start</label>
          <input
            :id="`start-date-${itemKey}`"
            v-model="localStartDate"
            type="date"
            class="date-input"
            :disabled="loading"
            @change="updateDates"
            :data-testid="`start-date-${item.equipment.id}`"
          >
        </div>
        <div class="date-field">
          <label :for="`end-date-${itemKey}`" class="date-label">End</label>
          <input
            :id="`end-date-${itemKey}`"
            v-model="localEndDate"
            type="date"
            class="date-input"
            :disabled="loading"
            @change="updateDates"
            :data-testid="`end-date-${item.equipment.id}`"
          >
        </div>
      </div>
      <div class="duration-info">
        {{ rentalDuration }} day{{ rentalDuration !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Cost Display -->
    <div class="cart-item__cost">
      <div class="cost-breakdown">
        <div class="daily-cost">{{ formatCurrency(item.dailyCost) }}/day</div>
        <div class="total-cost">{{ formatCurrency(item.totalCost) }}</div>
      </div>
    </div>

    <!-- Actions -->
    <div class="cart-item__actions">
      <BaseButton
        size="sm"
        variant="danger"
        @click="confirmRemove"
        :disabled="loading"
        :aria-label="`Remove ${item.equipment.name} from cart`"
        data-testid="remove-item"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 8a1 1 0 012 0v3a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v3a1 1 0 11-2 0V8z" clip-rule="evenodd" />
        </svg>
      </BaseButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="cart-item__loading">
      <div class="loading-spinner" aria-hidden="true"></div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="cart-item__error" role="alert">
      <span class="error-icon" aria-hidden="true">⚠</span>
      <span class="error-message">{{ error }}</span>
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCartStore } from '@/stores/cart'
import BaseButton from '@/components/common/BaseButton.vue'
import type { CartItem } from '@/types/cart'

interface Props {
  item: CartItem
  itemKey: string
  allowDateEdit?: boolean
  maxQuantity?: number
  showCostBreakdown?: boolean
}

interface Emits {
  (event: 'removed', itemKey: string): void
  (event: 'updated', itemKey: string): void
  (event: 'error', error: string): void
}

const props = withDefaults(defineProps<Props>(), {
  allowDateEdit: true,
  maxQuantity: 999,
  showCostBreakdown: true
})

const emit = defineEmits<Emits>()
const cartStore = useCartStore()

// Local state for optimistic updates
const localQuantity = ref(props.item.quantity)
const localStartDate = ref(props.item.startDate)
const localEndDate = ref(props.item.endDate)
const loading = ref(false)
const error = ref<string | null>(null)

// Computed properties
const itemClasses = computed(() => ({
  'cart-item': true,
  'cart-item--loading': loading.value,
  'cart-item--error': !!error.value,
  'cart-item--compact': !props.showCostBreakdown
}))

const rentalDuration = computed(() => {
  const start = new Date(localStartDate.value)
  const end = new Date(localEndDate.value)
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
})

// Watch for external updates to the item
watch(() => props.item, (newItem) => {
  localQuantity.value = newItem.quantity
  localStartDate.value = newItem.startDate
  localEndDate.value = newItem.endDate
}, { deep: true })

// Methods
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

async function updateQuantity(): Promise<void> {
  if (localQuantity.value === props.item.quantity) return

  loading.value = true
  error.value = null

  try {
    const result = await cartStore.updateQuantity(props.itemKey, localQuantity.value)
    if (result.success) {
      emit('updated', props.itemKey)
    } else {
      error.value = result.message
      // Revert to original value on error
      localQuantity.value = props.item.quantity
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update quantity'
    localQuantity.value = props.item.quantity
    emit('error', error.value)
  } finally {
    loading.value = false
  }
}

async function increaseQuantity(): Promise<void> {
  if (localQuantity.value < props.maxQuantity) {
    localQuantity.value++
    await updateQuantity()
  }
}

async function decreaseQuantity(): Promise<void> {
  if (localQuantity.value > 1) {
    localQuantity.value--
    await updateQuantity()
  }
}

async function updateDates(): Promise<void> {
  if (localStartDate.value === props.item.startDate && localEndDate.value === props.item.endDate) {
    return
  }

  loading.value = true
  error.value = null

  try {
    const result = await cartStore.setCustomDates(props.itemKey, {
      startDate: localStartDate.value,
      endDate: localEndDate.value
    })

    if (result.success) {
      emit('updated', props.itemKey)
    } else {
      error.value = result.message
      // Revert dates on error
      localStartDate.value = props.item.startDate
      localEndDate.value = props.item.endDate
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update dates'
    localStartDate.value = props.item.startDate
    localEndDate.value = props.item.endDate
    emit('error', error.value)
  } finally {
    loading.value = false
  }
}

function confirmRemove(): void {
  // Simple confirmation for now - could be enhanced with a modal
  if (window.confirm(`Remove ${props.item.equipment.name} from cart?`)) {
    removeItem()
  }
}

function removeItem(): void {
  loading.value = true
  error.value = null

  const result = cartStore.removeItem(props.itemKey)
  if (result.success) {
    emit('removed', props.itemKey)
  } else {
    error.value = result.message
    emit('error', result.message)
  }
  loading.value = false
}

function clearError(): void {
  error.value = null
}
</script>

<style scoped>
.cart-item {
  @apply relative bg-white border border-gray-200 rounded-lg p-4 mb-3;
  @apply transition-all duration-200 hover:shadow-sm;
}

.cart-item--loading {
  @apply opacity-75 pointer-events-none;
}

.cart-item--error {
  @apply border-red-300 bg-red-50;
}

.cart-item--compact .cart-item__cost {
  @apply text-sm;
}

.cart-item__info {
  @apply flex items-start gap-3 mb-3;
}

.cart-item__image {
  @apply flex-shrink-0;
}

.equipment-image {
  @apply w-12 h-12 rounded object-cover;
}

.equipment-image-placeholder {
  @apply w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400;
}

.cart-item__details {
  @apply flex-1 min-w-0;
}

.equipment-name {
  @apply font-medium text-gray-900 text-sm truncate;
}

.equipment-description {
  @apply text-xs text-gray-600 mt-1 line-clamp-2;
}

.equipment-meta {
  @apply flex gap-2 mt-1 text-xs text-gray-500;
}

.barcode {
  @apply font-mono;
}

.category {
  @apply px-2 py-1 bg-gray-100 rounded-full;
}

.cart-item__quantity {
  @apply mb-3;
}

.quantity-controls {
  @apply flex items-center gap-1;
}

.quantity-input {
  @apply w-16 px-2 py-1 text-center border border-gray-300 rounded;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.cart-item__dates {
  @apply mb-3;
}

.date-inputs {
  @apply flex gap-2;
}

.date-field {
  @apply flex-1;
}

.date-label {
  @apply block text-xs font-medium text-gray-700 mb-1;
}

.date-input {
  @apply w-full px-2 py-1 text-sm border border-gray-300 rounded;
  @apply focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.duration-info {
  @apply text-xs text-gray-600 mt-1;
}

.cart-item__cost {
  @apply mb-3;
}

.cost-breakdown {
  @apply text-right;
}

.daily-cost {
  @apply text-xs text-gray-600;
}

.total-cost {
  @apply font-semibold text-gray-900;
}

.cart-item__actions {
  @apply flex justify-end;
}

.cart-item__loading {
  @apply absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center;
}

.loading-spinner {
  @apply w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin;
}

.cart-item__error {
  @apply mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-start gap-2;
}

.error-icon {
  @apply text-red-500 flex-shrink-0;
}

.error-message {
  @apply text-sm text-red-700 flex-1;
}

.sr-only {
  @apply sr-only;
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .cart-item {
    @apply transition-none;
  }

  .loading-spinner {
    @apply animate-none;
  }
}
</style>
