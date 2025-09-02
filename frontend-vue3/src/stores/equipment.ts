import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EquipmentResponse, EquipmentStatus } from '@/types/equipment'
import { httpClient } from '@/services/api/http-client'

export interface EquipmentFilters {
  query?: string
  category_id?: number | null
  status?: EquipmentStatus | null
}

export interface PaginationState {
  page: number
  size: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface EquipmentState {
  items: EquipmentResponse[]
  selectedItem: EquipmentResponse | null
  loading: boolean
  error: string | null
  filters: EquipmentFilters
  pagination: PaginationState
}

export const useEquipmentStore = defineStore('equipment', () => {
  // --- STATE ---
  const items = ref<EquipmentResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<EquipmentFilters>({ query: '', category_id: null, status: null })
  const pagination = ref<PaginationState>({
    page: 1,
    size: 100, // Optimized for virtual scrolling performance
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  })
  const loadingMore = ref(false)
  const hasMore = computed(() => pagination.value.page < pagination.value.totalPages)

  // --- GETTERS ---
  const equipmentById = computed(() => {
    return (id: number) => items.value.find(item => item.id === id)
  })

  // --- ACTIONS ---
  async function fetchEquipment(append = false) {
    // Prevent duplicate requests
    if ((append && loadingMore.value) || (!append && loading.value)) {
      return
    }

    if (append) {
      loadingMore.value = true
    } else {
      loading.value = true
      items.value = [] // Clear items when not appending
    }
    error.value = null

    try {
      const params = new URLSearchParams()
      params.set('page', pagination.value.page.toString())
      params.set('size', pagination.value.size.toString())

      // Add filters only if they have values
      if (filters.value.query?.trim()) {
        params.set('query', filters.value.query.trim())
      }
      if (filters.value.category_id !== null && filters.value.category_id !== undefined) {
        params.set('category_id', filters.value.category_id.toString())
      }
      if (filters.value.status) {
        params.set('status', filters.value.status)
      }

      const response = await httpClient.get(`/equipment/paginated?${params.toString()}`)
      const newItems = response.items || response.results || []

      if (append && newItems.length > 0) {
        // Prevent duplicate items by checking IDs
        const existingIds = new Set(items.value.map(item => item.id))
        const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id))
        items.value = [...items.value, ...uniqueNewItems]
      } else {
        // Replace items for new search/filter
        items.value = newItems
      }

      pagination.value.total = response.total || 0
      pagination.value.totalPages = response.pages || Math.ceil((response.total || 0) / pagination.value.size)
      pagination.value.hasNextPage = pagination.value.page < pagination.value.totalPages
      pagination.value.hasPreviousPage = pagination.value.page > 1

    } catch (e) {
      error.value = 'Failed to fetch equipment'
      console.error('Equipment fetch error:', e)
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  function setFilters(newFilters: Partial<EquipmentFilters>) {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1 // Reset to first page on filter change
    fetchEquipment(false) // Don't append, replace items
  }

  async function loadMore() {
    if (!hasMore.value || loadingMore.value || loading.value) return

    pagination.value.page += 1
    await fetchEquipment(true) // Append items
  }

  function resetPagination() {
    pagination.value.page = 1
    items.value = []
  }

  async function findEquipmentByBarcode(barcode: string): Promise<EquipmentResponse | null> {
    loading.value = true;
    error.value = null;
    try {
      const equipment = await httpClient.get<EquipmentResponse>(`/equipment/barcode/${barcode}`);
      return equipment;
    } catch (e) {
      // If it's a 404, it's not a critical error, just not found.
      if (e.response?.status !== 404) {
        error.value = `Failed to find equipment with barcode ${barcode}`;
        console.error(e);
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  function setPage(page: number) {
    pagination.value.page = page
    fetchEquipment(false)
  }

  return {
    items,
    loading,
    loadingMore,
    error,
    filters,
    pagination,
    hasMore,
    equipmentById,
    fetchEquipment,
    loadMore,
    setFilters,
    setPage,
    resetPagination,
    findEquipmentByBarcode
  }
})
