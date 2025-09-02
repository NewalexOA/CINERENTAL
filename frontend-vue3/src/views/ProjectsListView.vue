<template>
  <div class="projects-list-view h-full flex flex-col">
    <!-- Header -->
    <div class="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">Projects</h1>
          <p class="mt-1 text-sm text-gray-500">
            {{ projectsStore.pagination.total }} projects total
            <span v-if="projectsStore.filters.query">
              • Filtered by "{{ projectsStore.filters.query }}"
            </span>
          </p>
        </div>

        <!-- Search and View Controls -->
        <div class="flex items-center space-x-4">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search projects..."
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
              <option value="table">Table</option>
            </select>
          </div>
        </div>
      </div>
    </div>


    <!-- Error State -->
    <div v-if="projectsStore.error" class="flex-1 flex items-center justify-center bg-red-50">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 class="text-lg font-medium text-red-900 mb-2">Error Loading Projects</h3>
        <p class="text-red-700 mb-4">{{ projectsStore.error }}</p>
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
      <VirtualProjectsList
        v-if="viewMode === 'virtual'"
        :items="projectsStore.projects"
        :loading="projectsStore.loading || projectsStore.loadingMore"
        :container-height="containerHeight"
        :empty-message="getEmptyMessage()"
        @quick-edit="handleQuickEdit"
        @load-more="loadMore"
        class="h-full"
      />

      <!-- Standard Grid View -->
      <div v-else-if="viewMode === 'standard'" class="p-6 h-full overflow-auto">
        <div v-if="projectsStore.loading && projectsStore.projects.length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonLoader
            v-for="i in 12"
            :key="`skeleton-${i}`"
            :height="280"
            variant="project-card"
          />
        </div>

        <div v-else-if="projectsStore.projects.length > 0">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <ProjectCard
              v-for="item in projectsStore.projects"
              :key="item.id"
              :project="item"
              @quick-edit="handleQuickEdit"
            />
          </div>

          <!-- Standard Pagination -->
          <div class="flex items-center justify-between border-t border-gray-200 pt-4">
            <div class="text-sm text-gray-700">
              Showing {{ ((projectsStore.pagination.page - 1) * projectsStore.pagination.size) + 1 }} to
              {{ Math.min(projectsStore.pagination.page * projectsStore.pagination.size, projectsStore.pagination.total) }}
              of {{ projectsStore.pagination.total }} results
            </div>
            <div class="flex space-x-2">
              <BaseButton
                @click="prevPage"
                :disabled="!projectsStore.pagination.hasPreviousPage"
                variant="outline"
                size="sm"
              >
                Previous
              </BaseButton>
              <span class="inline-flex items-center px-3 py-1 text-sm text-gray-700">
                Page {{ projectsStore.pagination.page }} of {{ projectsStore.pagination.totalPages }}
              </span>
              <BaseButton
                @click="nextPage"
                :disabled="!projectsStore.pagination.hasNextPage"
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p class="text-gray-500">{{ getEmptyMessage() }}</p>
          </div>
        </div>
      </div>

      <!-- Table View -->
      <div v-else-if="viewMode === 'table'" class="p-6 h-full overflow-auto">
        <DataTable
          v-if="projectsStore.projects.length > 0"
          :columns="columns"
          :data="projectsStore.projects"
          :loading="projectsStore.loading"
        >
          <template #cell-actions="{ item }">
            <div class="flex items-center space-x-2">
              <BaseButton
                size="sm"
                variant="outline"
                @click="handleQuickEdit(item)"
                class="text-xs"
              >
                Edit
              </BaseButton>
              <router-link
                :to="{ name: 'project-detail', params: { id: item.id } }"
                class="text-blue-500 hover:underline text-sm"
              >
                View
              </router-link>
            </div>
          </template>
        </DataTable>

        <!-- Table Pagination -->
        <div v-if="projectsStore.projects.length > 0" class="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
          <div class="text-sm text-gray-700">
            Showing {{ ((projectsStore.pagination.page - 1) * projectsStore.pagination.size) + 1 }} to
            {{ Math.min(projectsStore.pagination.page * projectsStore.pagination.size, projectsStore.pagination.total) }}
            of {{ projectsStore.pagination.total }} results
          </div>
          <div class="flex space-x-2">
            <BaseButton
              @click="prevPage"
              :disabled="projectsStore.pagination.page <= 1"
              variant="outline"
              size="sm"
            >
              Previous
            </BaseButton>
            <span class="inline-flex items-center px-3 py-1 text-sm text-gray-700">
              Page {{ projectsStore.pagination.page }} of {{ projectsStore.pagination.totalPages }}
            </span>
            <BaseButton
              @click="nextPage"
              :disabled="projectsStore.pagination.page >= projectsStore.pagination.totalPages"
              variant="outline"
              size="sm"
            >
              Next
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Stats (Development) -->
    <div v-if="showPerformanceStats" class="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-2">
      <div class="flex items-center justify-between text-xs text-gray-500">
        <div class="flex items-center space-x-4">
          <span>Projects: {{ projectsStore.projects.length }} • Mode: {{ viewMode }}</span>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import type { ProjectData } from '@/services/api/projects'
import BaseButton from '@/components/common/BaseButton.vue'
import ProjectCard from '@/components/projects/ProjectCard.vue'
import VirtualProjectsList from '@/components/projects/VirtualProjectsList.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import DataTable from '@/components/common/DataTable.vue'
import { debounce } from 'lodash-es'
import { performanceMonitor } from '@/utils/performance'

// Stores
const projectsStore = useProjectsStore()

// Local state
const searchQuery = ref('')
const viewMode = ref<'virtual' | 'standard' | 'table'>('virtual')
const containerHeight = ref(800)
const showPerformanceStats = ref(process.env.NODE_ENV === 'development')
const performanceData = ref(performanceMonitor.getLatestMetrics())

// Debounced search handler
const debouncedSearch = debounce((query: string) => {
  projectsStore.setFilters({ query: query.trim() })
}, 400)

// Table columns configuration
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'client_name', label: 'Client' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'end_date', label: 'End Date' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
]

// Computed properties
const renderedItemsCount = computed(() => {
  if (viewMode.value === 'virtual') {
    // More accurate estimation based on virtual scrolling
    const itemsPerRow = getEstimatedItemsPerRow()
    const itemHeight = 320 // Match VirtualProjectsList itemHeight
    const visibleRows = Math.ceil(containerHeight.value / itemHeight)
    const overscanRows = Math.min(5, Math.max(2, Math.ceil(containerHeight.value / itemHeight)))
    return Math.min((visibleRows + overscanRows) * itemsPerRow, projectsStore.projects.length)
  }
  return projectsStore.projects.length
})

const estimatedMemoryUsage = computed(() => {
  // More accurate estimation: each rendered item ~1.2KB in memory for virtual scrolling
  const memoryPerItem = viewMode.value === 'virtual' ? 1.2 : 2.0
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

function handleSearchInput(event: Event) {
  const target = event.target as HTMLInputElement
  searchQuery.value = target.value
  debouncedSearch(target.value)
}

function handleViewModeChange() {
  // Start performance measurement for view mode switch
  performanceMonitor.startMeasurement()

  // Save preference to localStorage
  localStorage.setItem('projects-list-view-mode', viewMode.value)

  // Update performance data after view switch
  nextTick(() => {
    const metrics = performanceMonitor.endMeasurement(
      projectsStore.projects.length,
      viewMode.value as 'virtual' | 'standard'
    )
    performanceData.value = metrics
    performanceMonitor.logPerformanceData()
  })
}

function getEmptyMessage(): string {
  if (projectsStore.filters.query) {
    return `No projects found matching "${projectsStore.filters.query}". Try adjusting your search criteria.`
  }
  return 'No projects available. Create a new project to get started.'
}

function handleQuickEdit(project: ProjectData) {
  // Emit event or handle quick edit functionality
  console.log('Quick edit project:', project.name)
  // TODO: Implement quick edit modal or navigation
}

function loadMore() {
  if (projectsStore.hasMore && !projectsStore.loadingMore) {
    projectsStore.loadMore()
  }
}

function retryLoad() {
  projectsStore.fetchProjects()
}

function prevPage() {
  projectsStore.setPage(projectsStore.pagination.page - 1)
}

function nextPage() {
  projectsStore.setPage(projectsStore.pagination.page + 1)
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

// Lifecycle
onMounted(async () => {
  // Load saved view preference
  const savedViewMode = localStorage.getItem('projects-list-view-mode') as 'virtual' | 'standard' | 'table' | null
  if (savedViewMode && ['virtual', 'standard', 'table'].includes(savedViewMode)) {
    viewMode.value = savedViewMode
  }

  // Calculate container height
  updateContainerHeight()

  // Add resize listener
  window.addEventListener('resize', updateContainerHeight)

  // Load initial data
  await projectsStore.fetchProjects()

  // Wait for DOM update and update performance data
  await nextTick()
  performanceData.value = performanceMonitor.getLatestMetrics()
})

onUnmounted(() => {
  // Comprehensive cleanup
  window.removeEventListener('resize', updateContainerHeight)
  debouncedSearch.cancel()

  if (heightUpdateTimeout) {
    clearTimeout(heightUpdateTimeout)
  }
})
</script>

<style scoped>
.projects-list-view {
  /* Ensure full height layout */
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Custom scrollbar for webkit browsers */
.projects-list-view ::-webkit-scrollbar {
  width: 8px;
}

.projects-list-view ::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

.projects-list-view ::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded;
}

.projects-list-view ::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}

/* Smooth transitions */
.project-grid {
  transition: opacity 0.2s ease-in-out;
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
  .projects-list-view {
    height: 100vh;
  }

  /* Adjust header padding on mobile */
  .projects-list-view .flex-shrink-0 {
    padding: 1rem;
  }

  /* Stack header content on mobile */
  .projects-list-view .flex.items-center.justify-between {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  /* Full width search on mobile */
  .projects-list-view input[type="text"] {
    width: 100%;
  }
}
</style>
