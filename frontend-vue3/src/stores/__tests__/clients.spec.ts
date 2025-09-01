import { setActivePinia, createPinia } from 'pinia'
import { useClientsStore } from '../clients'
import { httpClient } from '@/services/api/http-client'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the http client
vi.mock('@/services/api/http-client', () => ({
  httpClient: {
    get: vi.fn(),
  },
}))

describe('Clients Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches clients successfully', async () => {
    const store = useClientsStore()
    const mockClients = { items: [{ id: 1, name: 'Test Client' }], total: 1, pages: 1 }
    httpClient.get.mockResolvedValue(mockClients)

    await store.fetchClients()

    expect(store.clients).toEqual(mockClients.items)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
    expect(httpClient.get).toHaveBeenCalledWith('/clients/paginated?page=1&size=20')
  })

  it('handles errors during fetch', async () => {
    const store = useClientsStore()
    httpClient.get.mockRejectedValue(new Error('Fetch error'))

    await store.fetchClients()

    expect(store.clients).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe('Failed to fetch clients')
  })

  it('sets filters and resets pagination', async () => {
    const store = useClientsStore()
    httpClient.get.mockResolvedValue({ items: [], total: 0, pages: 1 })

    store.setFilters({ query: 'test' })

    expect(store.filters.query).toBe('test')
    expect(store.pagination.page).toBe(1)
    expect(httpClient.get).toHaveBeenCalledWith('/clients/paginated?page=1&size=20&query=test')
  })

  it('sets page', async () => {
    const store = useClientsStore()
    httpClient.get.mockResolvedValue({ items: [], total: 0, pages: 1 })

    store.setPage(2)

    expect(store.pagination.page).toBe(2)
    expect(httpClient.get).toHaveBeenCalledWith('/clients/paginated?page=2&size=20')
  })
})
