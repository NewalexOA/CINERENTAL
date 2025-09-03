import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { clientsService, type ClientData, type ClientCreateData, type ClientUpdateData, type BookingData } from '@/services/api/clients'
import { StorePersistence, createDebouncedSave } from '@/plugins/store-persistence'

export interface ClientFilters {
  query?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginationState {
  page: number
  size: number
  total: number
  totalPages: number
}

export const useClientsStore = defineStore('clients', () => {
  // --- PERSISTENCE SETUP ---
  const persistence = new StorePersistence({
    key: 'clients',
    version: 1,
    ttl: 60 * 60 * 1000, // 1 hour cache for clients
    compress: true,
    whitelist: ['clients', 'filters', 'pagination', 'lastFetch'],
    beforeRestore: (data: any) => {
      // Validate restored data structure
      return {
        clients: Array.isArray(data.clients) ? data.clients : [],
        filters: data.filters && typeof data.filters === 'object' ? data.filters : {
          query: '',
          sort_by: 'name',
          sort_order: 'asc'
        },
        pagination: data.pagination && typeof data.pagination === 'object' ? data.pagination : {
          page: 1,
          size: 50,
          total: 0,
          totalPages: 1
        },
        lastFetch: data.lastFetch || null
      }
    },
    onError: (error: Error, operation: string) => {
      console.error(`Clients store persistence ${operation} error:`, error)
    }
  })

  // --- STATE ---
  const clients = ref<ClientData[]>([])
  const currentClient = ref<ClientData | null>(null)
  const clientBookings = ref<BookingData[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<ClientFilters>({
    query: '',
    sort_by: 'name',
    sort_order: 'asc'
  })
  const pagination = ref<PaginationState>({
    page: 1,
    size: 50,
    total: 0,
    totalPages: 1
  })
  const lastFetch = ref<number | null>(null)
  const cacheExpiry = 30 * 60 * 1000 // 30 minutes cache for client lists

  // --- PERSISTENCE HELPERS ---
  const debouncedSave = createDebouncedSave(persistence, 500)

  function saveToStorage() {
    const stateToSave = {
      clients: clients.value,
      filters: filters.value,
      pagination: pagination.value,
      lastFetch: lastFetch.value
    }
    debouncedSave(stateToSave)
  }

  function loadFromStorage() {
    const restored = persistence.loadState()
    if (restored) {
      clients.value = restored.clients || []
      filters.value = { ...filters.value, ...restored.filters }
      pagination.value = { ...pagination.value, ...restored.pagination }
      lastFetch.value = restored.lastFetch
      console.log(`👥 Clients store: Restored ${clients.value.length} cached clients`)
    }
  }

  function shouldRefreshCache(): boolean {
    if (!lastFetch.value) return true
    return (Date.now() - lastFetch.value) > cacheExpiry
  }

  // --- COMPUTED ---
  const filteredClients = computed(() => {
    if (!filters.value.query) return clients.value

    const query = filters.value.query.toLowerCase()
    return clients.value.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query) ||
      client.company?.toLowerCase().includes(query)
    )
  })

  const totalClients = computed(() => clients.value.length)

  const isDataStale = computed(() => shouldRefreshCache())

  const cacheInfo = computed(() => {
    const metadata = persistence.getMetadata()
    return {
      hasCache: !!metadata,
      lastUpdate: lastFetch.value ? new Date(lastFetch.value).toLocaleString() : null,
      isStale: isDataStale.value,
      clientCount: clients.value.length,
      ...metadata
    }
  })

  // --- ACTIONS ---
  async function fetchClients(force = false) {
    // Use cached data if available and not stale (unless forced)
    if (!force && !shouldRefreshCache() && clients.value.length > 0) {
      console.log('👥 Clients store: Using cached data')
      return
    }

    loading.value = true
    error.value = null

    try {
      const skip = (pagination.value.page - 1) * pagination.value.size
      const response = await clientsService.getClients({
        skip,
        limit: pagination.value.size,
        query: filters.value.query || undefined,
        sort_by: filters.value.sort_by,
        sort_order: filters.value.sort_order,
      })

      clients.value = response
      pagination.value.total = response.length
      pagination.value.totalPages = Math.ceil(response.length / pagination.value.size)
      lastFetch.value = Date.now()

      // Save to storage after successful fetch
      saveToStorage()
    } catch (err) {
      console.error('Failed to fetch clients:', err)
      error.value = 'Failed to load clients. Please try again.'
    } finally {
      loading.value = false
    }
  }

  async function fetchClient(clientId: number) {
    loading.value = true
    error.value = null

    try {
      currentClient.value = await clientsService.getClient(clientId)
      return currentClient.value
    } catch (err) {
      console.error('Failed to fetch client:', err)
      error.value = 'Failed to load client details. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createClient(clientData: ClientCreateData) {
    loading.value = true
    error.value = null

    try {
      const newClient = await clientsService.createClient(clientData)
      clients.value.unshift(newClient)
      pagination.value.total++
      return newClient
    } catch (err) {
      console.error('Failed to create client:', err)
      error.value = 'Failed to create client. Please check the data and try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateClient(clientId: number, clientData: ClientUpdateData) {
    loading.value = true
    error.value = null

    try {
      const updatedClient = await clientsService.updateClient(clientId, clientData)

      const index = clients.value.findIndex(c => c.id === clientId)
      if (index !== -1) {
        clients.value[index] = updatedClient
      }

      if (currentClient.value?.id === clientId) {
        currentClient.value = updatedClient
      }

      return updatedClient
    } catch (err) {
      console.error('Failed to update client:', err)
      error.value = 'Failed to update client. Please check the data and try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteClient(clientId: number) {
    loading.value = true
    error.value = null

    try {
      await clientsService.deleteClient(clientId)

      clients.value = clients.value.filter(c => c.id !== clientId)
      pagination.value.total--

      if (currentClient.value?.id === clientId) {
        currentClient.value = null
      }
    } catch (err) {
      console.error('Failed to delete client:', err)
      error.value = 'Failed to delete client. This may be because the client has active bookings.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchClientBookings(clientId: number) {
    loading.value = true
    error.value = null

    try {
      clientBookings.value = await clientsService.getClientBookings(clientId, {
        limit: 100 // Get all bookings for now
      })
    } catch (err) {
      console.error('Failed to fetch client bookings:', err)
      error.value = 'Failed to load client bookings. Please try again.'
    } finally {
      loading.value = false
    }
  }

  function setFilters(newFilters: Partial<ClientFilters>) {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1
    fetchClients(true) // Force refresh when filters change
    saveToStorage() // Save filter changes
  }

  function setPage(page: number) {
    pagination.value.page = page
    fetchClients()
    saveToStorage() // Save pagination changes
  }

  function setSorting(field: string, order: 'asc' | 'desc') {
    filters.value.sort_by = field
    filters.value.sort_order = order
    pagination.value.page = 1
    fetchClients(true) // Force refresh when sorting changes
    saveToStorage() // Save sorting changes
  }

  function clearError() {
    error.value = null
  }

  function clearCache() {
    persistence.clearState()
    clients.value = []
    currentClient.value = null
    clientBookings.value = []
    lastFetch.value = null
    console.log('🗑️ Clients store: Cache cleared')
  }

  function refreshData() {
    return fetchClients(true) // Force refresh
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
    clients,
    currentClient,
    clientBookings,
    loading,
    error,
    filters,
    pagination,
    lastFetch,

    // Computed
    filteredClients,
    totalClients,
    isDataStale,
    cacheInfo,

    // Actions
    fetchClients,
    fetchClient,
    createClient,
    updateClient,
    deleteClient,
    fetchClientBookings,
    setFilters,
    setPage,
    setSorting,
    clearError,
    refreshData,
    clearCache
  }
})
