<template>
  <div class="virtual-projects-list">
    <!-- Loading State -->
    <div v-if="loading && items.length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SkeletonLoader
        v-for="i in skeletonCount"
        :key="`skeleton-${i}`"
        :height="280"
        variant="project-card"
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
            <ProjectCard
              v-for="(item, colIndex) in getRowItems(virtualRow.index)"
              :key="`${item.id}-${colIndex}`"
              :project="item"
              @quick-edit="handleQuickEdit"
              class="project-card-in-grid"
            />
          </div>
        </div>
      </div>

      <!-- Loading more items indicator -->
      <div v-if="loading" class="flex justify-center p-4">
        <BaseSpinner size="md" />
        <span class="ml-2 text-gray-600">Loading more projects...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="empty-state">
      <div class="text-center py-16">
        <svg class="mx-auto h-24 w-24 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
        </svg>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">No projects found</h3>
        <p class="text-gray-500 max-w-md mx-auto">
          {{ emptyMessage || 'Try adjusting your search criteria or filters to find the projects you\'re looking for.' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick, shallowRef } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { ProjectData } from '@/services/api/projects'
import ProjectCard from '@/components/projects/ProjectCard.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import { performanceMonitor } from '@/utils/performance'

interface Props {
  items: ProjectData[]
  loading?: boolean
  containerHeight?: number
  itemsPerRow?: number
  itemHeight?: number
  emptyMessage?: string
}

interface Emits {
  (e: 'quick-edit', project: ProjectData): void
  (e: 'load-more'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  containerHeight: 800, // Default container height
  itemsPerRow: 3, // Default for lg screens, responsive handled via CSS
  itemHeight: 320, // Optimized height per row for project cards (including gaps)
  emptyMessage: ''
})

const emit = defineEmits<Emits>()

// Template refs
const parentRef = ref<HTMLElement>()

// Performance optimization: cache responsive calculations
const cachedItemsPerRow = shallowRef(3)
const lastWindowWidth = ref(0)

// Computed values
const skeletonCount = computed(() => Math.min(12, Math.max(6, Math.ceil(props.containerHeight / 150))))

// Convert flat items array to rows for virtualization with memoization
const itemRows = computed(() => {
  const rows: ProjectData[][] = []
  const itemsPerRow = cachedItemsPerRow.value

  // Early return for empty items
  if (props.items.length === 0) return rows

  // Batch process items into rows for better performance
  for (let i = 0; i < props.items.length; i += itemsPerRow) {
    rows.push(props.items.slice(i, i + itemsPerRow))
  }

  return rows
})

// Virtual scroller setup with optimized configuration
const virtualizer = useVirtualizer(
  computed(() => {
    const rowCount = itemRows.value.length
    const dynamicOverscan = Math.min(5, Math.max(2, Math.ceil(props.containerHeight / props.itemHeight)))

    return {
      count: rowCount,
      getScrollElement: () => parentRef.value || null,
      estimateSize: () => props.itemHeight,
      overscan: dynamicOverscan, // Dynamic overscan based on viewport
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

function getRowItems(rowIndex: number): ProjectData[] {
  return itemRows.value[rowIndex] || []
}

function handleQuickEdit(project: ProjectData) {
  emit('quick-edit', project)
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
.virtual-projects-list {
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

.project-card-in-grid {
  /* Ensure cards have consistent height within the virtual rows */
  height: calc(320px - 32px); /* Total row height minus padding */
}

.empty-state {
  @apply min-h-96 flex items-center justify-center;
}

/* Responsive breakpoints matching Tailwind */
@media (max-width: 767px) {
  .project-card-in-grid {
    height: auto; /* Allow natural height on mobile */
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .project-card-in-grid {
    height: calc(320px - 32px);
  }
}

@media (min-width: 1024px) {
  .project-card-in-grid {
    height: calc(320px - 32px);
  }
}
</style>
