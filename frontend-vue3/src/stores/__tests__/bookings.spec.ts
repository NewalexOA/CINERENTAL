import { setActivePinia, createPinia } from 'pinia'
import { useBookingsStore } from '../bookings'
import { httpClient } from '@/services/api/http-client'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the http client
vi.mock('@/services/api/http-client', () => ({
  httpClient: {
    get: vi.fn(),
  },
}))

describe('Bookings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches bookings successfully', async () => {
    const store = useBookingsStore()
    const mockBookings = { items: [{ id: 1, name: 'Test Booking' }], total: 1, pages: 1 }
    httpClient.get.mockResolvedValue(mockBookings)

    await store.fetchBookings()

    expect(store.bookings).toEqual(mockBookings.items)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
    expect(httpClient.get).toHaveBeenCalledWith('/bookings/paginated?page=1&size=20')
  })

  it('handles errors during fetch', async () => {
    const store = useBookingsStore()
    httpClient.get.mockRejectedValue(new Error('Fetch error'))

    await store.fetchBookings()

    expect(store.bookings).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe('Failed to fetch bookings')
  })

  it('sets filters and resets pagination', async () => {
    const store = useBookingsStore()
    httpClient.get.mockResolvedValue({ items: [], total: 0, pages: 1 })

    store.setFilters({ query: 'test' })

    expect(store.filters.query).toBe('test')
    expect(store.pagination.page).toBe(1)
    expect(httpClient.get).toHaveBeenCalledWith('/bookings/paginated?page=1&size=20&query=test')
  })

  it('sets page', async () => {
    const store = useBookingsStore()
    httpClient.get.mockResolvedValue({ items: [], total: 0, pages: 1 })

    store.setPage(2)

    expect(store.pagination.page).toBe(2)
    expect(httpClient.get).toHaveBeenCalledWith('/bookings/paginated?page=2&size=20')
  })
})
