import { defineStore } from 'pinia'
import { ref, computed, shallowRef, watch } from 'vue'
import type { EquipmentResponse, EquipmentStatus } from '@/types/equipment'
import { httpClient } from '@/services/api/http-client'
import { useMemoryOptimization } from '@/composables/useMemoryOptimization'
import { StorePersistence, createDebouncedSave } from '@/plugins/store-persistence'

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
  optimisticUpdates: Map<number, EquipmentResponse> // Track optimistic updates
  rollbackStack: Array<{ id: number; original: EquipmentResponse }> // Rollback capability
}

export const useEquipmentStore = defineStore('equipment', () => {
  // Memory optimization instance
  const memoryOpt = useMemoryOptimization()

  // --- PERSISTENCE SETUP ---
  const persistence = new StorePersistence({
    key: 'equipment',
    version: 1,
    ttl: 24 * 60 * 60 * 1000, // 24 hours cache
    compress: true, // Compress large equipment datasets
    whitelist: ['items', 'filters', 'pagination', 'lastFetch'],
    beforeRestore: (data: any) => {
      // Validate restored data structure
      return {
        items: Array.isArray(data.items) ? data.items : [],
        filters: data.filters && typeof data.filters === 'object' ? data.filters : { query: '', category_id: null, status: null },
        pagination: data.pagination && typeof data.pagination === 'object' ? data.pagination : {
          page: 1,
          size: 100,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        },
        lastFetch: data.lastFetch || null
      }
    },
    onError: (error: Error, operation: string) => {
      console.error(`Equipment store persistence ${operation} error:`, error)
    }
  })

  // --- STATE --- (Using memory-aware refs for better memory management)
  const items = memoryOpt.createMemoryAwareRef<EquipmentResponse[]>(
    [],
    80, // 80MB memory limit
    (items) => {
      // Cleanup callback when memory pressure is high
      if (items.length > 1000) {
        console.log('🧠 Equipment store: Reducing dataset due to memory pressure')
        return items.slice(-500) // Keep only most recent 500 items
      }
      return items
    }
  )
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

  // Merge optimistic updates with actual items
  const itemsWithOptimistic = computed(() => {
    const merged = [...items.value]

    // Apply optimistic updates
    optimisticUpdates.value.forEach((optimisticItem, id) => {
      const index = merged.findIndex(item => item.id === id)
      if (index !== -1) {
        merged[index] = optimisticItem
      }
    })

    return merged
  })
  const lastFetch = ref<number | null>(null)
  const cacheExpiry = 10 * 60 * 1000 // 10 minutes cache for equipment data

  // Optimistic updates tracking
  const optimisticUpdates = ref(new Map<number, EquipmentResponse>())
  const rollbackStack = ref<Array<{ id: number; original: EquipmentResponse }>>([])

  // --- PERSISTENCE HELPERS ---
  const debouncedSave = createDebouncedSave(persistence, 500)

  function saveToStorage() {
    const stateToSave = {
      items: items.value,
      filters: filters.value,
      pagination: pagination.value,
      lastFetch: lastFetch.value
    }
    debouncedSave(stateToSave)
  }

  function loadFromStorage() {
    const restored = persistence.loadState()
    if (restored) {
      items.value = restored.items || []
      filters.value = { ...filters.value, ...restored.filters }
      pagination.value = { ...pagination.value, ...restored.pagination }
      lastFetch.value = restored.lastFetch
      console.log(`🗄️ Equipment store: Restored ${items.value.length} cached items`)
    }
  }

  function shouldRefreshCache(): boolean {
    if (!lastFetch.value) return true
    return (Date.now() - lastFetch.value) > cacheExpiry
  }

  // --- GETTERS ---
  const equipmentById = computed(() => {
    return (id: number) => items.value.find(item => item.id === id)
  })

  const isDataStale = computed(() => shouldRefreshCache())

  const cacheInfo = computed(() => {
    const metadata = persistence.getMetadata()
    return {
      hasCache: !!metadata,
      lastUpdate: lastFetch.value ? new Date(lastFetch.value).toLocaleString() : null,
      isStale: isDataStale.value,
      itemCount: items.value.length,
      ...metadata
    }
  })

  // --- ACTIONS ---
  async function fetchEquipment(append = false, force = false) {
    // Prevent duplicate requests
    if ((append && loadingMore.value) || (!append && loading.value)) {
      return
    }

    // Use cached data if available and not stale (unless forced)
    if (!force && !append && !shouldRefreshCache() && items.value.length > 0) {
      console.log('🗄️ Equipment store: Using cached data')
      return
    }

    if (append) {
      loadingMore.value = true
    } else {
      loading.value = true
      if (!append) items.value = [] // Clear items when not appending
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
      lastFetch.value = Date.now()

      // Save to storage after successful fetch
      saveToStorage()

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
    fetchEquipment(false, true) // Don't append, replace items, force refresh
    saveToStorage() // Save filter changes
  }

  async function loadMore() {
    if (!hasMore.value || loadingMore.value || loading.value) return

    pagination.value.page += 1
    await fetchEquipment(true) // Append items
  }

  function resetPagination() {
    pagination.value.page = 1
    items.value = []
    saveToStorage() // Save reset state
  }

  function clearCache() {
    persistence.clearState()
    items.value = []
    lastFetch.value = null
    console.log('🗑️ Equipment store: Cache cleared')
  }

  function refreshData() {
    return fetchEquipment(false, true) // Force refresh
  }

  // --- OPTIMISTIC UPDATES ---

  /**
   * Apply optimistic update to an equipment item
   */
  function applyOptimisticUpdate(id: number, updates: Partial<EquipmentResponse>): void {
    const currentItem = items.value.find(item => item.id === id)
    if (!currentItem) {
      console.warn(`Equipment item ${id} not found for optimistic update`)
      return
    }

    // Store original state for rollback
    if (!rollbackStack.value.some(entry => entry.id === id)) {
      rollbackStack.value.push({
        id,
        original: { ...currentItem }
      })
    }

    // Apply optimistic update
    const optimisticItem = { ...currentItem, ...updates }
    optimisticUpdates.value.set(id, optimisticItem)

    if (import.meta.env.DEV) {
      console.log('⚡ Applied optimistic update to equipment:', id, updates)
    }
  }

  /**
   * Rollback optimistic update
   */
  function rollbackOptimisticUpdate(id: number): void {
    const rollbackEntry = rollbackStack.value.find(entry => entry.id === id)
    if (rollbackEntry) {
      // Remove optimistic update
      optimisticUpdates.value.delete(id)

      // Remove from rollback stack
      const index = rollbackStack.value.findIndex(entry => entry.id === id)
      if (index !== -1) {
        rollbackStack.value.splice(index, 1)
      }

      if (import.meta.env.DEV) {
        console.log('🔄 Rolled back optimistic update for equipment:', id)
      }
    }
  }

  /**
   * Confirm optimistic update (remove from tracking)
   */
  function confirmOptimisticUpdate(id: number, confirmedData?: EquipmentResponse): void {
    if (confirmedData) {
      // Update the actual item in the store
      const index = items.value.findIndex(item => item.id === id)
      if (index !== -1) {
        items.value[index] = confirmedData
      }
    }

    // Remove from optimistic tracking
    optimisticUpdates.value.delete(id)

    // Remove from rollback stack
    const rollbackIndex = rollbackStack.value.findIndex(entry => entry.id === id)
    if (rollbackIndex !== -1) {
      rollbackStack.value.splice(rollbackIndex, 1)
    }

    if (import.meta.env.DEV) {
      console.log('✅ Confirmed optimistic update for equipment:', id)
    }
  }

  /**
   * Clear all optimistic updates
   */
  function clearOptimisticUpdates(): void {
    optimisticUpdates.value.clear()
    rollbackStack.value = []

    if (import.meta.env.DEV) {
      console.log('🧹 Cleared all optimistic updates')
    }
  }

  /**
   * Update equipment status with optimistic UI
   */
  async function updateEquipmentStatus(
    id: number,
    status: EquipmentStatus,
    options: { optimistic?: boolean } = { optimistic: true }
  ): Promise<boolean> {
    try {
      // Apply optimistic update if enabled
      if (options.optimistic) {
        applyOptimisticUpdate(id, { status })
      }

      // Make API call
      const updatedEquipment = await httpClient.patch<EquipmentResponse>(
        `/equipment/${id}/status`,
        { status }
      )

      // Confirm optimistic update with real data
      if (options.optimistic) {
        confirmOptimisticUpdate(id, updatedEquipment)
      } else {
        // Update item directly if not using optimistic updates
        const index = items.value.findIndex(item => item.id === id)
        if (index !== -1) {
          items.value[index] = updatedEquipment
        }
      }

      return true

    } catch (error) {
      // Rollback optimistic update on failure
      if (options.optimistic) {
        rollbackOptimisticUpdate(id)
      }

      console.error('Failed to update equipment status:', error)
      error.value = 'Failed to update equipment status'

      return false
    }
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
    saveToStorage() // Save pagination changes
  }

  // --- INITIALIZATION ---
  // Load persisted state on store creation
  loadFromStorage()

  // Watch for state changes to save automatically
  watch(
    [filters, pagination],
    () => {
      saveToStorage()
    },
    { deep: true }
  )

  return {
    // State
    items: itemsWithOptimistic, // Return merged items with optimistic updates
    loading,
    loadingMore,
    error,
    filters,
    pagination,
    hasMore,
    lastFetch,

    // Optimistic updates state
    optimisticUpdates,
    rollbackStack,

    // Getters
    equipmentById,
    isDataStale,
    cacheInfo,

    // Actions
    fetchEquipment,
    loadMore,
    setFilters,
    setPage,
    resetPagination,
    findEquipmentByBarcode,
    refreshData,
    clearCache,

    // Optimistic update actions
    applyOptimisticUpdate,
    rollbackOptimisticUpdate,
    confirmOptimisticUpdate,
    clearOptimisticUpdates,
    updateEquipmentStatus
  }
})
