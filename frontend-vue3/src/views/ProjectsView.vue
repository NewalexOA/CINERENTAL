<template>
  <div class="projects-view">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Projects</h1>
      <p class="mt-2 text-sm text-gray-600">Manage your rental projects and equipment bookings</p>
    </div>

    <!-- Actions and Filters -->
    <div class="mb-6 space-y-4">
      <!-- Search and Actions Row -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex-1 max-w-md">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search projects by name, client, or description..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @input="handleSearch"
          />
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="showCreateModal = true"
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            New Project
          </button>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="flex flex-wrap items-center gap-4">
        <select
          v-model="selectedStatus"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @change="handleFilters"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <input
          v-model="startDate"
          type="date"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @change="handleFilters"
          placeholder="Start date"
        />

        <input
          v-model="endDate"
          type="date"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @change="handleFilters"
          placeholder="End date"
        />

        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm underline"
        >
          Clear Filters
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-red-800">{{ error }}</p>
      <button @click="clearError" class="mt-2 text-red-600 hover:text-red-800 text-sm underline">
        Dismiss
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !projects.length" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">Loading projects...</span>
    </div>

    <!-- Projects List -->
    <div v-else-if="projects.length" class="space-y-4">
      <div
        v-for="project in projects"
        :key="project.id"
        class="bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
      >
        <div class="p-6">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ project.name }}
                </h3>
                <span
                  class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                  :class="getStatusClass(project.status)"
                >
                  {{ formatStatus(project.status) }}
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  <span class="font-medium">{{ project.client_name }}</span>
                </div>

                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span>{{ formatDateRange(project.start_date, project.end_date) }}</span>
                </div>

                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>{{ formatDate(project.created_at) }}</span>
                </div>
              </div>

              <p v-if="project.description" class="mt-3 text-gray-600 text-sm line-clamp-2">
                {{ project.description }}
              </p>
            </div>

            <div class="flex items-center space-x-2 ml-4">
              <button
                @click="viewProject(project)"
                class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                View
              </button>

              <button
                @click="editProject(project)"
                class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Edit
              </button>

              <div class="relative">
                <button
                  @click="toggleDropdown(project.id)"
                  class="inline-flex items-center p-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                  </svg>
                </button>

                <div
                  v-if="openDropdown === project.id"
                  class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                >
                  <div class="py-1">
                    <button
                      @click="duplicateProject(project)"
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                      Duplicate
                    </button>
                    <button
                      @click="printProject(project)"
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                      </svg>
                      Print
                    </button>
                    <hr class="my-1">
                    <button
                      @click="confirmDelete(project)"
                      class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              @click="setPage(pagination.page - 1)"
              :disabled="pagination.page <= 1"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              @click="setPage(pagination.page + 1)"
              :disabled="pagination.page >= pagination.totalPages"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing {{ Math.min((pagination.page - 1) * pagination.size + 1, pagination.total) }} to
                {{ Math.min(pagination.page * pagination.size, pagination.total) }} of
                {{ pagination.total }} results
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  @click="setPage(pagination.page - 1)"
                  :disabled="pagination.page <= 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  {{ pagination.page }} of {{ pagination.totalPages }}
                </span>
                <button
                  @click="setPage(pagination.page + 1)"
                  :disabled="pagination.page >= pagination.totalPages"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5a2 2 0 00-2 2v8a2 2 0 002 2h14m-5-8v2m0 0v8a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-8a2 2 0 00-2 2zm0 6h4"></path>
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No projects found</h3>
      <p class="mt-1 text-sm text-gray-500">{{ searchQuery || hasActiveFilters ? 'Try adjusting your search or filters.' : 'Get started by creating your first project.' }}</p>
      <div class="mt-6">
        <button
          @click="showCreateModal = true"
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          New Project
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showDeleteModal = false"></div>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Delete Project</h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    Are you sure you want to delete <strong>{{ projectToDelete?.name }}</strong>? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="deleteProject"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              :disabled="loading"
            >
              {{ loading ? 'Deleting...' : 'Delete' }}
            </button>
            <button
              @click="showDeleteModal = false"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore, type ProjectData } from '@/stores/projects'
import { storeToRefs } from 'pinia'

// Router
const router = useRouter()

// Store
const projectsStore = useProjectsStore()
const { projects, loading, error, pagination } = storeToRefs(projectsStore)

// Local state
const searchQuery = ref('')
const selectedStatus = ref('')
const startDate = ref('')
const endDate = ref('')
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const projectToDelete = ref<ProjectData | null>(null)
const openDropdown = ref<number | null>(null)

// Search debouncing
let searchTimeout: NodeJS.Timeout

// Computed
const hasActiveFilters = computed(() => {
  return !!(selectedStatus.value || startDate.value || endDate.value)
})

// Methods
const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    projectsStore.setFilters({ query: searchQuery.value })
  }, 300)
}

const handleFilters = () => {
  projectsStore.setFilters({
    query: searchQuery.value,
    status: selectedStatus.value || null,
    start_date: startDate.value || undefined,
    end_date: endDate.value || undefined,
  })
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = ''
  startDate.value = ''
  endDate.value = ''
  projectsStore.setFilters({
    query: '',
    status: null,
    start_date: undefined,
    end_date: undefined,
  })
}

const setPage = (page: number) => {
  projectsStore.setPage(page)
}

const viewProject = (project: ProjectData) => {
  router.push(`/projects/${project.id}`)
}

const editProject = (project: ProjectData) => {
  // Navigate to edit page or open edit modal
  router.push(`/projects/${project.id}/edit`)
}

const duplicateProject = (project: ProjectData) => {
  // Implement project duplication
  console.log('Duplicate project:', project)
  closeDropdown()
}

const printProject = async (project: ProjectData) => {
  try {
    await projectsStore.fetchProjectPrintData(project.id)
    // Handle print data or open print modal
    console.log('Print project:', project)
  } catch (err) {
    console.error('Failed to get print data:', err)
  }
  closeDropdown()
}

const confirmDelete = (project: ProjectData) => {
  projectToDelete.value = project
  showDeleteModal.value = true
  closeDropdown()
}

const deleteProject = async () => {
  if (!projectToDelete.value) return

  try {
    await projectsStore.deleteProject(projectToDelete.value.id)
    showDeleteModal.value = false
    projectToDelete.value = null
  } catch (err) {
    // Error handled by store
  }
}

const toggleDropdown = (projectId: number) => {
  openDropdown.value = openDropdown.value === projectId ? null : projectId
}

const closeDropdown = () => {
  openDropdown.value = null
}

const clearError = () => {
  projectsStore.clearError()
}

// Utility functions
const getStatusClass = (status: string) => {
  switch (status.toUpperCase()) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800'
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800'
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800'
    case 'COMPLETED':
      return 'bg-green-100 text-green-800'
    case 'CANCELLED':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const formatStatus = (status: string) => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return `${start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })} - ${end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}`
}

// Event handlers
const handleClickOutside = (event: Event) => {
  if (openDropdown.value !== null) {
    const target = event.target as Element
    if (!target.closest('[data-dropdown]')) {
      closeDropdown()
    }
  }
}

// Lifecycle
onMounted(() => {
  projectsStore.fetchProjects()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
