import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { clientsService, type ClientData, type ClientCreateData, type ClientUpdateData, type BookingData } from '@/services/api/clients'

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

  // --- ACTIONS ---
  async function fetchClients() {
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
    fetchClients()
  }

  function setPage(page: number) {
    pagination.value.page = page
    fetchClients()
  }

  function setSorting(field: string, order: 'asc' | 'desc') {
    filters.value.sort_by = field
    filters.value.sort_order = order
    pagination.value.page = 1
    fetchClients()
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    clients,
    currentClient,
    clientBookings,
    loading,
    error,
    filters,
    pagination,

    // Computed
    filteredClients,
    totalClients,

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
  }
})
