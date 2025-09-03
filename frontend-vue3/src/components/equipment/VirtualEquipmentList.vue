<template>
  <div class="virtual-equipment-list">
    <!-- Loading State -->
    <div v-if="loading && items.length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SkeletonLoader
        v-for="i in skeletonCount"
        :key="`skeleton-${i}`"
        :height="350"
        variant="equipment-card"
      />
    </div>

    <!-- Virtual Scroller -->
    <div
      v-else-if="items.length > 0"
      ref="parentRef"
      class="virtual-container"
      :style="{ height: `${containerHeight}px` }"
    >
      <div
        :style="{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }"
      >
        <div
          v-for="virtualRow in virtualizer.getVirtualItems()"
          :key="String(virtualRow.key)"
          :style="{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }"
        >
          <!-- Grid Container for Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            <EquipmentCard
              v-for="(item, colIndex) in getRowItems(virtualRow.index)"
              :key="`${item.id}-${colIndex}`"
              :equipment="item"
              @add-to-cart="handleAddToCart"
              class="equipment-card-in-grid"
            />
          </div>
        </div>
      </div>

      <!-- Loading more items indicator -->
      <div v-if="loading" class="flex justify-center p-4">
        <BaseSpinner size="md" />
        <span class="ml-2 text-gray-600">Loading more equipment...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="empty-state">
      <div class="text-center py-16">
        <svg class="mx-auto h-24 w-24 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No equipment found</h3>
        <p class="text-gray-500 max-w-md mx-auto">
          {{ emptyMessage || 'Try adjusting your search criteria or filters to find the equipment you\'re looking for.' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick, shallowRef, getCurrentInstance } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { EquipmentResponse } from '@/types/equipment'
import EquipmentCard from '@/components/equipment/EquipmentCard.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import { performanceMonitor } from '@/utils/performance'
import { useMemoryOptimization, useVirtualScrollingMemoryOptimization } from '@/composables/useMemoryOptimization'

interface Props {
  items: EquipmentResponse[]
  loading?: boolean
  containerHeight?: number
  itemsPerRow?: number
  itemHeight?: number
  emptyMessage?: string
}

interface Emits {
  (e: 'add-to-cart', equipment: EquipmentResponse): void
  (e: 'load-more'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  containerHeight: 800, // Default container height
  itemsPerRow: 3, // Default for lg screens, responsive handled via CSS
  itemHeight: 380, // Optimized height per row (including gaps)
  emptyMessage: ''
})

const emit = defineEmits<Emits>()

// Template refs
const parentRef = ref<HTMLElement>()

// Memory optimization
const memoryOpt = useMemoryOptimization()
const virtualMemoryOpt = useVirtualScrollingMemoryOptimization()

// Performance optimization: cache responsive calculations
const cachedItemsPerRow = shallowRef(3)
const lastWindowWidth = ref(0)

// Memory-efficient data management
const visibleItems = shallowRef<EquipmentResponse[]>([])
const itemCache = memoryOpt.createWeakCache<EquipmentResponse, any>()

// Computed values
const skeletonCount = computed(() => Math.min(12, Math.max(6, Math.ceil(props.containerHeight / 150))))

// Convert flat items array to rows for virtualization with memory optimization
const itemRows = computed(() => {
  const rows: EquipmentResponse[][] = []
  const itemsPerRow = cachedItemsPerRow.value

  // Early return for empty items
  if (props.items.length === 0) return rows

  // Use memory-efficient chunking for large datasets
  if (props.items.length > 500) {
    const chunks = memoryOpt.createMemoryEfficientChunks(
      props.items,
      itemsPerRow * 10, // Larger chunks for better memory efficiency
      50 // 50MB memory limit
    )

    // Flatten chunks into rows
    for (const chunk of chunks) {
      for (let i = 0; i < chunk.length; i += itemsPerRow) {
        rows.push(chunk.slice(i, i + itemsPerRow))
      }
    }
  } else {
    // Standard processing for smaller datasets
    for (let i = 0; i < props.items.length; i += itemsPerRow) {
      rows.push(props.items.slice(i, i + itemsPerRow))
    }
  }

  return rows
})

// Virtual scroller setup with memory-aware optimized configuration
const virtualizer = useVirtualizer(
  computed(() => {
    const rowCount = itemRows.value.length

    // Memory-aware overscan calculation
    const memoryAwareOverscan = virtualMemoryOpt.calculateMemoryAwareOverscan(
      props.containerHeight,
      props.itemHeight,
      Math.min(5, Math.max(2, Math.ceil(props.containerHeight / props.itemHeight)))
    )

    return {
      count: rowCount,
      getScrollElement: () => parentRef.value || null,
      estimateSize: () => props.itemHeight,
      overscan: memoryAwareOverscan, // Memory-aware dynamic overscan
      measureElement: undefined, // Use estimate for better performance
      scrollMargin: props.itemHeight * 0.5, // Preload half item height
    }
  })
)

// Functions with performance optimizations
function updateResponsiveItemsPerRow(): void {
  if (typeof window === 'undefined') {
    cachedItemsPerRow.value = 3
    return
  }

  const width = window.innerWidth

  // Only update if width actually changed significantly
  if (Math.abs(width - lastWindowWidth.value) < 50) return

  lastWindowWidth.value = width

  if (width < 768) {
    cachedItemsPerRow.value = 1  // mobile
  } else if (width < 1024) {
    cachedItemsPerRow.value = 2 // tablet
  } else {
    cachedItemsPerRow.value = 3 // desktop
  }
}

function getResponsiveItemsPerRow(): number {
  return cachedItemsPerRow.value
}

// Memory-optimized row item retrieval with caching
function getRowItems(rowIndex: number): EquipmentResponse[] {
  const row = itemRows.value[rowIndex]
  if (!row) return []

  // Use object pool for item display objects to reduce garbage collection
  return row.map((item, index) => {
    const cacheKey = `${item.id}_${rowIndex}_${index}`

    // Check weak cache first
    let cached = itemCache.get(item)
    if (!cached) {
      cached = memoryOpt.equipmentCardPool.acquire()
      cached.id = item.id
      cached.name = item.name
      cached.category = item.category
      cached.status = item.status
      itemCache.set(item, cached)
    }

    return item // Return original item for component rendering
  })
}

// Cleanup function for released items
function cleanupRowItems(rowIndex: number): void {
  const row = itemRows.value[rowIndex]
  if (!row) return

  row.forEach(item => {
    const cached = itemCache.get(item)
    if (cached) {
      memoryOpt.equipmentCardPool.release(cached)
    }
  })
}

function handleAddToCart(equipment: EquipmentResponse) {
  emit('add-to-cart', equipment)
}

// Optimized responsive handling
let resizeTimeout: number | null = null
let isResizing = false

function handleResize() {
  if (isResizing) return

  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }

  resizeTimeout = setTimeout(() => {
    isResizing = true

    // Update responsive calculation
    updateResponsiveItemsPerRow()

    // Force recalculation of virtualizer when screen size changes
    if ('measure' in virtualizer.value) {
      (virtualizer.value as any).measure()
    }

    isResizing = false
  }, 100) as unknown as number // Reduced debounce time for better responsiveness
}

// Optimized scroll-based load more
let scrollTimeout: number | null = null
let lastScrollTop = 0

function handleScroll() {
  if (!parentRef.value || props.loading) return

  // Throttle scroll events for better performance
  if (scrollTimeout) return

  scrollTimeout = setTimeout(() => {
    scrollTimeout = null

    const { scrollTop, scrollHeight, clientHeight } = parentRef.value!

    // Only proceed if scrolling down
    if (scrollTop <= lastScrollTop) {
      lastScrollTop = scrollTop
      return
    }
    lastScrollTop = scrollTop

    const scrollPosition = scrollTop + clientHeight
    const loadThreshold = scrollHeight - (props.itemHeight * 1.5) // Load when 1.5 rows from bottom

    if (scrollPosition >= loadThreshold && props.items.length > 0) {
      emit('load-more')
    }
  }, 16) as unknown as number // ~60fps throttling
}

// Lifecycle with optimizations
onMounted(async () => {
  // Start performance measurement
  performanceMonitor.startMeasurement()

  // Initialize responsive calculation
  updateResponsiveItemsPerRow()

  await nextTick()

  // Add event listeners with optimized options
  window.addEventListener('resize', handleResize, { passive: true })

  if (parentRef.value) {
    parentRef.value.addEventListener('scroll', handleScroll, {
      passive: true,
      capture: false
    })
  }

  // End performance measurement after initial render
  await nextTick()
  const metrics = performanceMonitor.endMeasurement(props.items.length, 'virtual')
  performanceMonitor.logPerformanceData()
})

onUnmounted(() => {
  // Comprehensive cleanup
  window.removeEventListener('resize', handleResize)

  if (parentRef.value) {
    parentRef.value.removeEventListener('scroll', handleScroll)
  }

  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
    resizeTimeout = null
  }

  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
    scrollTimeout = null
  }
})

// Optimized watch for items changes
watch(
  () => [props.items.length, cachedItemsPerRow.value],
  async ([newLength, newItemsPerRow], [oldLength, oldItemsPerRow]) => {
    // Only proceed if there's a significant change
    if (newLength === oldLength && newItemsPerRow === oldItemsPerRow) return

    // Start performance measurement for updates
    performanceMonitor.startMeasurement()

    await nextTick()

    // Reset scroll position if items per row changed (responsive change)
    if (newItemsPerRow !== oldItemsPerRow && parentRef.value) {
      parentRef.value.scrollTop = 0
      lastScrollTop = 0
    }

    if ('measure' in virtualizer.value) {
      (virtualizer.value as any).measure()
    }

    // End performance measurement
    await nextTick()
    performanceMonitor.endMeasurement(newLength as number, 'virtual')
  }
)
</script>

<style scoped>
.virtual-equipment-list {
  @apply w-full;
}

.virtual-container {
  @apply w-full overflow-auto;
  /* Smooth scrolling */
  scroll-behavior: smooth;
  /* Hide scrollbar for webkit browsers */
  scrollbar-width: thin;
}

.virtual-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-container::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded;
}

.virtual-container::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded;
}

.virtual-container::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}

.equipment-card-in-grid {
  /* Ensure cards have consistent height within the virtual rows */
  height: calc(400px - 32px); /* Total row height minus padding */
}

.empty-state {
  @apply min-h-96 flex items-center justify-center;
}

/* Responsive breakpoints matching Tailwind */
@media (max-width: 767px) {
  .equipment-card-in-grid {
    height: auto; /* Allow natural height on mobile */
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .equipment-card-in-grid {
    height: calc(400px - 32px);
  }
}

@media (min-width: 1024px) {
  .equipment-card-in-grid {
    height: calc(400px - 32px);
  }
}
</style>
