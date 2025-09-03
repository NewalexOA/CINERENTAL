<template>
  <div
    v-memo="memoArray"
    :class="cardClasses"
    ref="cardElement"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg overflow-hidden mb-4">
      <img
        v-if="equipment.image_url"
        :src="equipment.image_url"
        :alt="equipment.name"
        class="w-full h-full object-cover transition-transform duration-200"
        :class="{ 'scale-105': isHovered }"
        loading="lazy"
      />
      <div v-else class="flex items-center justify-center bg-gray-100">
        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
      </div>

      <!-- Status Badge -->
      <div class="absolute top-2 left-2">
        <StatusBadge :status="equipment.status" />
      </div>

      <!-- Barcode Badge -->
      <div v-if="equipment.barcode" class="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-mono">
        {{ equipment.barcode }}
      </div>
    </div>

    <div class="equipment-info">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-lg font-semibold text-gray-900 truncate pr-2">{{ equipment.name }}</h3>
        <div class="text-right flex-shrink-0">
          <div class="text-lg font-bold text-blue-600">
            {{ equipment.daily_cost > 0 ? `$${formatPrice(equipment.daily_cost)}` : 'Contact for pricing' }}
          </div>
          <div class="text-xs text-gray-500">{{ equipment.daily_cost > 0 ? 'per day' : '' }}</div>
        </div>
      </div>

      <div class="mb-3">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {{ equipment.category_name }}
        </span>
      </div>

      <p v-if="equipment.description" class="text-sm text-gray-600 mb-4 line-clamp-2">
        {{ equipment.description }}
      </p>

      <!-- Equipment Details -->
      <div class="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-500">
        <div v-if="equipment.serial_number">
          <span class="font-medium">S/N:</span> {{ equipment.serial_number }}
        </div>
        <div v-if="equipment.replacement_cost">
          <span class="font-medium">Value:</span> ${{ formatPrice(equipment.replacement_cost) }}
        </div>
        <div v-if="equipment.purchase_date">
          <span class="font-medium">Purchased:</span> {{ formatDate(equipment.purchase_date) }}
        </div>
        <div v-if="equipment.quantity && equipment.quantity > 1">
          <span class="font-medium">Qty:</span> {{ equipment.quantity }}
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-2">
        <BaseButton
          @click="handleAddToCart"
          :disabled="!canAddToCart"
          :variant="canAddToCart ? 'primary' : 'secondary'"
          class="flex-1"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6 0a2 2 0 100 4 2 2 0 000-4zm-6 0a2 2 0 100 4 2 2 0 000-4z"></path>
          </svg>
          {{ canAddToCart ? 'Add to Cart' : 'Unavailable' }}
        </BaseButton>

        <BaseButton @click="handleViewDetails" variant="outline" size="sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import type { EquipmentResponse } from '@/types/equipment'
import BaseButton from '@/components/common/BaseButton.vue'
import StatusBadge from '@/components/equipment/StatusBadge.vue'
import { useComponentMemoization } from '@/composables/useRenderOptimization'
import { useTransitionOptimization } from '@/composables/useTransitionOptimization'

interface Props {
  equipment: EquipmentResponse
}

interface Emits {
  (e: 'add-to-cart', equipment: EquipmentResponse): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

// DOM optimization
const cardElement = ref<HTMLElement | null>(null)
const isHovered = ref(false)
const { fadeTransition } = useTransitionOptimization()

// Component memoization for performance
const { memoArray, shouldRender } = useComponentMemoization(props, {
  keys: ['equipment.id', 'equipment.status', 'equipment.name', 'equipment.daily_cost'],
  updateThreshold: 16 // 60fps threshold
})

// Optimized computed properties with shallow comparison
const canAddToCart = computed(() => {
  return props.equipment.status === 'AVAILABLE'
})

const cardClasses = computed(() => ({
  'equipment-card': true,
  'group': true,
  'equipment-card--available': canAddToCart.value,
  'equipment-card--hovered': isHovered.value
}))

// Optimized event handlers with debouncing
let addToCartTimeout: number | null = null
function handleAddToCart() {
  if (!canAddToCart.value) return

  // Debounce rapid clicks
  if (addToCartTimeout) return

  addToCartTimeout = window.setTimeout(() => {
    emit('add-to-cart', props.equipment)
    addToCartTimeout = null
  }, 100)
}

function handleViewDetails() {
  router.push(`/equipment/${props.equipment.id}`)
}

// GPU-accelerated hover effects
function handleMouseEnter() {
  isHovered.value = true
  if (cardElement.value) {
    cardElement.value.style.willChange = 'transform, box-shadow'
  }
}

function handleMouseLeave() {
  isHovered.value = false
  if (cardElement.value) {
    cardElement.value.style.willChange = 'auto'
  }
}

// Cleanup
onBeforeUnmount(() => {
  if (addToCartTimeout) {
    clearTimeout(addToCartTimeout)
  }
})

// Memoized formatters for better performance
const priceFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
})

function formatPrice(price: number): string {
  return priceFormatter.format(price)
}

function formatDate(dateString: string): string {
  return dateFormatter.format(new Date(dateString))
}
</script>

<style scoped>
.equipment-card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-4;
  transition: transform 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out;
  transform: translateZ(0); /* Force GPU layer */
}

.equipment-card--hovered {
  @apply shadow-lg border-gray-300;
  transform: translateY(-1px) translateZ(0);
}

.equipment-card--available {
  @apply cursor-pointer;
}

/* GPU-optimized transitions */
.equipment-card img {
  transition: transform 200ms ease-out;
  transform: translateZ(0);
}

/* Reduce layout shift during loading */
.equipment-card img[loading="lazy"] {
  min-height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading-shimmer 1.5s infinite;
}

@keyframes loading-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.aspect-w-16 {
  position: relative;
  width: 100%;
}

.aspect-w-16::before {
  content: '';
  display: block;
  padding-top: 56.25%; /* 16:9 aspect ratio */
}

.aspect-h-9 > * {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  height: 100%;
  width: 100%;
}

.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
