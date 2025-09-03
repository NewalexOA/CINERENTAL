<template>
  <div class="equipment-list-view h-full flex flex-col">
    <!-- Header -->
    <div class="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">Equipment Catalog</h1>
          <p class="mt-1 text-sm text-gray-500">
            {{ equipmentStore.pagination.total }} items total
            <span v-if="equipmentStore.filters.query">
              • Filtered by "{{ equipmentStore.filters.query }}"
            </span>
          </p>
        </div>

        <!-- Search Controls -->
        <div class="flex items-center space-x-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search equipment..."
              class="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @input="handleSearchInput"
            />
            <svg class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          <!-- View Toggle -->
          <div class="flex items-center space-x-2">
            <label class="text-sm text-gray-600">View:</label>
            <select
              v-model="viewMode"
              class="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              @change="handleViewModeChange"
            >
              <option value="virtual">Virtual (Fast)</option>
              <option value="standard">Standard</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="equipmentStore.error" class="flex-1 flex items-center justify-center bg-red-50">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 class="text-lg font-medium text-red-900 mb-2">Error Loading Equipment</h3>
        <p class="text-red-700 mb-4">{{ equipmentStore.error }}</p>
        <BaseButton @click="retryLoad" variant="outline">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Retry
        </BaseButton>
      </div>
    </div>

    <!-- Main Content Area -->
    <div v-else class="flex-1 min-h-0">
      <!-- Virtual Scrolling View -->
      <VirtualEquipmentList
        v-if="viewMode === 'virtual'"
        :items="equipmentStore.items"
        :loading="equipmentStore.loading || equipmentStore.loadingMore"
        :container-height="containerHeight"
        :empty-message="getEmptyMessage()"
        @add-to-cart="addToCart"
        @load-more="loadMore"
        class="h-full"
      />

      <!-- Standard Grid View (Fallback) -->
      <div v-else class="p-6 h-full overflow-auto">
        <div v-if="equipmentStore.loading && equipmentStore.items.length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonLoader
            v-for="i in 12"
            :key="`skeleton-${i}`"
            variant="equipment-card"
          />
        </div>

        <div v-else-if="equipmentStore.items.length > 0" ref="listContainer">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <EquipmentCard
              v-for="(item, index) in (viewMode === 'virtual' ? visibleItems : equipmentStore.items)"
              :key="keys[index] || item.id"
              :equipment="item"
              :data-equipment-id="item.id"
              @add-to-cart="addToCart"
            />
          </div>

          <!-- Standard Pagination -->
          <div class="flex items-center justify-between border-t border-gray-200 pt-4">
            <div class="text-sm text-gray-700">
              Showing {{ ((equipmentStore.pagination.page - 1) * equipmentStore.pagination.size) + 1 }} to
              {{ Math.min(equipmentStore.pagination.page * equipmentStore.pagination.size, equipmentStore.pagination.total) }}
              of {{ equipmentStore.pagination.total }} results
            </div>
            <div class="flex space-x-2">
              <BaseButton
                @click="prevPage"
                :disabled="!equipmentStore.pagination.hasPreviousPage"
                variant="outline"
                size="sm"
              >
                Previous
              </BaseButton>
              <span class="inline-flex items-center px-3 py-1 text-sm text-gray-700">
                Page {{ equipmentStore.pagination.page }} of {{ equipmentStore.pagination.totalPages }}
              </span>
              <BaseButton
                @click="nextPage"
                :disabled="!equipmentStore.pagination.hasNextPage"
                variant="outline"
                size="sm"
              >
                Next
              </BaseButton>
            </div>
          </div>
        </div>

        <div v-else class="flex items-center justify-center h-96">
          <div class="text-center">
            <svg class="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No equipment found</h3>
            <p class="text-gray-500">{{ getEmptyMessage() }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Stats (Development) -->
    <div v-if="showPerformanceStats" class="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-2">
      <div class="flex items-center justify-between text-xs text-gray-500">
        <div class="flex items-center space-x-4">
          <span>Items: {{ equipmentStore.items.length }} • Mode: {{ viewMode }}</span>
          <span>Rendered: {{ renderedItemsCount }} • Memory: ~{{ estimatedMemoryUsage }}MB</span>
        </div>
        <div v-if="performanceData" class="flex items-center space-x-4">
          <span>Render: {{ performanceData.renderTime.toFixed(1) }}ms</span>
          <span v-if="performanceComparison" class="text-green-600">
            ⚡ {{ performanceComparison.improvement.toFixed(1) }}% faster
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useEquipmentStore } from '@/stores/equipment'
import { useCartStore } from '@/stores/cart'
import type { EquipmentResponse } from '@/types/equipment'
import BaseButton from '@/components/common/BaseButton.vue'
import EquipmentCard from '@/components/equipment/EquipmentCard.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { debounce } from 'lodash-es'
import { performanceMonitor } from '@/utils/performance'
import { useAsyncComponents } from '@/composables/useAsyncComponents'
import { useDOMOptimization } from '@/composables/useDOMOptimization'
import { useOptimizedListRendering } from '@/composables/useRenderOptimization'
import { useListTransitions } from '@/composables/useTransitionOptimization'

// Use async component for VirtualEquipmentList to improve initial bundle size
const { VirtualEquipmentList } = useAsyncComponents()

// Stores
const equipmentStore = useEquipmentStore()
const cartStore = useCartStore()

// DOM optimization setup
const { scheduleUpdate, updateList, measureDOMOperation } = useDOMOptimization({
  batchSize: 15,
  flushInterval: 8, // Higher frequency for smooth scrolling
  enablePriority: true
})

const { animateListChange } = useListTransitions()

// Optimized list rendering
const { visibleItems, keys, handleScroll, clearKeyCache } = useOptimizedListRendering(
  computed(() => equipmentStore.items),
  {
    keyExtractor: (item: EquipmentResponse) => item.id,
    virtualScrolling: true,
    windowSize: 20,
    itemHeight: 380
  }
)

// Local state
const searchQuery = ref('')
const viewMode = ref<'virtual' | 'standard'>('virtual')
const containerHeight = ref(800)
const showPerformanceStats = ref(process.env.NODE_ENV === 'development')
const performanceData = ref(performanceMonitor.getLatestMetrics())
const listContainer = ref<HTMLElement | null>(null)

// Debounced search handler
const debouncedSearch = debounce((query: string) => {
  equipmentStore.setFilters({ query: query.trim() })
}, 400) // Slightly longer debounce for better performance

// Computed properties
// Optimized computed properties with memoization
const renderedItemsCount = computed(() => {
  if (viewMode.value === 'virtual') {
    return visibleItems.value.length
  }
  return equipmentStore.items.length
})

const estimatedMemoryUsage = computed(() => {
  // More accurate estimation: each rendered item ~1.5KB in memory for virtual scrolling
  const memoryPerItem = viewMode.value === 'virtual' ? 1.5 : 2.5
  return Math.round((renderedItemsCount.value * memoryPerItem) / 1024)
})

const performanceComparison = computed(() => {
  return performanceMonitor.comparePerformance()
})

// Functions
function getEstimatedItemsPerRow(): number {
  if (typeof window === 'undefined') return 3
  const width = window.innerWidth
  if (width < 768) return 1  // mobile
  if (width < 1024) return 2 // tablet
  return 3 // desktop
}

// Optimized search with DOM batching
function handleSearchInput(event: Event) {
  const target = event.target as HTMLInputElement
  const newValue = target.value

  // Batch the state update
  scheduleUpdate('search-input', () => {
    searchQuery.value = newValue
  }, 'high')

  debouncedSearch(newValue)
}

function handleViewModeChange() {
  // Start performance measurement for view mode switch
  performanceMonitor.startMeasurement()

  // Save preference to localStorage
  localStorage.setItem('equipment-list-view-mode', viewMode.value)

  // Update performance data after view switch
  nextTick(() => {
    const metrics = performanceMonitor.endMeasurement(
      equipmentStore.items.length,
      viewMode.value
    )
    performanceData.value = metrics
    performanceMonitor.logPerformanceData()
  })
}

function getEmptyMessage(): string {
  if (equipmentStore.filters.query) {
    return `No equipment found matching "${equipmentStore.filters.query}". Try adjusting your search criteria.`
  }
  return 'No equipment available. Contact your administrator if this seems incorrect.'
}

// Optimized cart operations with visual feedback
function addToCart(item: EquipmentResponse) {
  const cartItem = {
    equipment: item,
    quantity: 1,
    startDate: '', // TODO: Will be set by user in cart
    endDate: '',   // TODO: Will be set by user in cart
    dailyCost: item.daily_cost,
    totalCost: item.daily_cost, // Will be calculated based on dates
  }

  // Batch the cart update with visual feedback
  measureDOMOperation('add-to-cart', async () => {
    await cartStore.addItem(cartItem)

    // Find the equipment card element for visual feedback
    const cardElement = document.querySelector(`[data-equipment-id="${item.id}"]`)
    if (cardElement) {
      // Provide immediate visual feedback
      scheduleUpdate(`cart-feedback-${item.id}`, () => {
        cardElement.classList.add('item-added-feedback')
        setTimeout(() => {
          cardElement.classList.remove('item-added-feedback')
        }, 1000)
      }, 'high')
    }

    console.log(`Added ${item.name} to cart`)
  })
}

function loadMore() {
  if (equipmentStore.hasMore && !equipmentStore.loadingMore) {
    equipmentStore.loadMore()
  }
}

function retryLoad() {
  equipmentStore.fetchEquipment(false)
}

function prevPage() {
  equipmentStore.setPage(equipmentStore.pagination.page - 1)
}

function nextPage() {
  equipmentStore.setPage(equipmentStore.pagination.page + 1)
}

let heightUpdateTimeout: number | null = null

function updateContainerHeight() {
  if (typeof window !== 'undefined') {
    // Debounce height updates for better performance
    if (heightUpdateTimeout) {
      clearTimeout(heightUpdateTimeout)
    }

    heightUpdateTimeout = setTimeout(() => {
      // Calculate available height (viewport - header - footer - padding)
      const headerHeight = 120 // Approximate header height
      const footerHeight = showPerformanceStats.value ? 40 : 0
      const padding = 24

      const newHeight = window.innerHeight - headerHeight - footerHeight - padding
      const optimizedHeight = Math.max(400, Math.min(newHeight, 1200)) // Cap max height

      // Only update if significantly different to prevent unnecessary re-renders
      if (Math.abs(containerHeight.value - optimizedHeight) > 50) {
        containerHeight.value = optimizedHeight
      }
    }, 100) as unknown as number
  }
}

// Optimized lifecycle with DOM measurements
onMounted(async () => {
  await measureDOMOperation('component-mount', async () => {
    // Load saved view preference
    const savedViewMode = localStorage.getItem('equipment-list-view-mode') as 'virtual' | 'standard' | null
    if (savedViewMode && ['virtual', 'standard'].includes(savedViewMode)) {
      viewMode.value = savedViewMode
    }

    // Calculate container height
    updateContainerHeight()

    // Add resize listener
    window.addEventListener('resize', updateContainerHeight)

    // Load initial data with performance tracking
    await equipmentStore.fetchEquipment(false)

    // Wait for DOM update and update performance data
    await nextTick()
    performanceData.value = performanceMonitor.getLatestMetrics()
  })
})

// Watch for equipment items changes and animate transitions
watch(
  () => equipmentStore.items.length,
  (newCount, oldCount) => {
    if (listContainer.value && oldCount > 0) {
      // Animate list changes when items are added/removed
      const addedCount = Math.max(0, newCount - oldCount)
      const removedCount = Math.max(0, oldCount - newCount)

      if (addedCount > 0 || removedCount > 0) {
        scheduleUpdate('list-change-animation', () => {
          // Simple fade-in for new items
          const newItems = listContainer.value?.querySelectorAll('.equipment-card:nth-last-child(-n+' + addedCount + ')')
          newItems?.forEach((item, index) => {
            const element = item as HTMLElement
            element.style.opacity = '0'
            element.style.transform = 'translateY(20px)'

            setTimeout(() => {
              element.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out'
              element.style.opacity = '1'
              element.style.transform = 'translateY(0)'
            }, index * 50)
          })
        }, 'medium')
      }
    }
  }
)

onUnmounted(() => {
  // Comprehensive cleanup
  window.removeEventListener('resize', updateContainerHeight)
  debouncedSearch.cancel()
  clearKeyCache()

  if (heightUpdateTimeout) {
    clearTimeout(heightUpdateTimeout)
  }
})
</script>

<style scoped>
.equipment-list-view {
  /* Ensure full height layout */
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Custom scrollbar for webkit browsers */
.equipment-list-view ::-webkit-scrollbar {
  width: 8px;
}

.equipment-list-view ::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

.equipment-list-view ::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded;
}

.equipment-list-view ::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}

/* Performance optimizations */
.equipment-list-view {
  /* Enable GPU acceleration for smooth scrolling */
  transform: translateZ(0);
  -webkit-overflow-scrolling: touch;
}

/* Cart feedback animation */
@keyframes item-added-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.item-added-feedback {
  animation: item-added-pulse 0.6s ease-out;
  background-color: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

/* GPU-accelerated transitions */
.equipment-grid {
  transition: opacity 0.2s ease-in-out;
  transform: translateZ(0); /* Force GPU layer */
}

/* Optimize list rendering performance */
.equipment-list-view .grid {
  contain: layout style; /* CSS containment for better performance */
}

/* Focus states for accessibility */
input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Loading states */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* Mobile optimizations */
@media (max-width: 767px) {
  .equipment-list-view {
    height: 100vh;
  }

  /* Adjust header padding on mobile */
  .equipment-list-view .flex-shrink-0 {
    padding: 1rem;
  }

  /* Stack header content on mobile */
  .equipment-list-view .flex.items-center.justify-between {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  /* Full width search on mobile */
  .equipment-list-view input[type="text"] {
    width: 100%;
  }
}
</style>
