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
  const pagination = ref<PaginationState>({ page: 1, size: 20, total: 0, totalPages: 1 })

  // --- GETTERS ---
  const equipmentById = computed(() => {
    return (id: number) => items.value.find(item => item.id === id)
  })

  // --- ACTIONS ---
  async function fetchEquipment() {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({
        page: pagination.value.page.toString(),
        size: pagination.value.size.toString(),
        ...filters.value
      })
      // Remove null or empty filters
      for(let [key, value] of Array.from(params.entries())) {
        if (!value) {
          params.delete(key);
        }
      }

      const response = await httpClient.get(`/equipment/paginated?${params.toString()}`)
      items.value = response.items
      pagination.value.total = response.total
      pagination.value.totalPages = response.pages

    } catch (e) {
      error.value = 'Failed to fetch equipment'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  function setFilters(newFilters: Partial<EquipmentFilters>) {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1 // Reset to first page on filter change
    fetchEquipment()
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
    fetchEquipment()
  }

  return {
    items,
    loading,
    error,
    filters,
    pagination,
    equipmentById,
    fetchEquipment,
    setFilters,
    setPage,
  }
})
