<template>
  <div class="clients-view">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Clients</h1>
      <p class="mt-2 text-sm text-gray-600">Manage your rental clients and their information</p>
    </div>

    <!-- Actions and Search -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex-1 max-w-md">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search clients by name, email, phone, or company..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @input="handleSearch"
        />
      </div>
      <div class="flex items-center gap-3">
        <select
          v-model="selectedSortBy"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @change="handleSortChange"
        >
          <option value="name">Sort by Name</option>
          <option value="created_at">Sort by Date Created</option>
          <option value="bookings_count">Sort by Bookings</option>
        </select>
        <button
          @click="toggleSortOrder"
          class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
          :title="`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`"
        >
          <svg class="w-4 h-4" :class="{ 'rotate-180': sortOrder === 'desc' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>
          </svg>
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
    <div v-if="loading && !clients.length" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600">Loading clients...</span>
    </div>

    <!-- Clients Table -->
    <div v-else-if="clients.length" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bookings
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th class="relative px-6 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="client in clients" :key="client.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span class="text-blue-600 font-medium text-sm">
                        {{ client.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ client.name }}</div>
                    <div v-if="client.notes" class="text-sm text-gray-500 truncate max-w-xs">
                      {{ client.notes }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ client.email || '—' }}</div>
                <div class="text-sm text-gray-500">{{ client.phone || '—' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ client.company || '—' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="getStatusClass(client.status)">
                  {{ formatStatus(client.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ client.bookings_count || 0 }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(client.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                  <button
                    @click="viewClient(client)"
                    class="text-blue-600 hover:text-blue-800 p-1 rounded"
                    title="View client details"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
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
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.712-3.714M14 40v-4a9.971 9.971 0 01.712-3.714M14 32a5 5 0 1010 0 5 5 0 00-10 0zM4 32a5 5 0 1010 0 5 5 0 00-10 0z"></path>
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
      <p class="mt-1 text-sm text-gray-500">{{ searchQuery ? 'Try adjusting your search terms.' : 'No clients have been created yet.' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useClientsStore, type ClientData } from '@/stores/clients'
import { storeToRefs } from 'pinia'

// Store
const clientsStore = useClientsStore()
const { clients, loading, error, pagination } = storeToRefs(clientsStore)

// Local state
const searchQuery = ref('')
const selectedSortBy = ref('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

// Search debouncing
let searchTimeout: NodeJS.Timeout

// Methods
const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    clientsStore.setFilters({ query: searchQuery.value })
  }, 300)
}

const handleSortChange = () => {
  clientsStore.setSorting(selectedSortBy.value, sortOrder.value)
}

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  handleSortChange()
}

const setPage = (page: number) => {
  clientsStore.setPage(page)
}

const viewClient = (client: ClientData) => {
  // Navigate to client detail or show modal
  console.log('View client:', client)
}

const clearError = () => {
  clientsStore.clearError()
}

// Utility functions
const getStatusClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-800'
    case 'blocked':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const formatStatus = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Initialize
onMounted(() => {
  clientsStore.fetchClients()
})
</script>

<style scoped>
.client-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}
</style>
