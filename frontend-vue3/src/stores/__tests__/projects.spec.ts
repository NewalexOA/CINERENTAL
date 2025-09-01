import { setActivePinia, createPinia } from 'pinia'
import { useProjectsStore } from '../projects'
import { httpClient } from '@/services/api/http-client'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the http client
vi.mock('@/services/api/http-client', () => ({
  httpClient: {
    get: vi.fn(),
  },
}))

describe('Projects Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches projects successfully', async () => {
    const store = useProjectsStore()
    const mockProjects = { items: [{ id: 1, name: 'Test Project' }], total: 1, pages: 1 }
    httpClient.get.mockResolvedValue(mockProjects)

    await store.fetchProjects()

    expect(store.projects).toEqual(mockProjects.items)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
    expect(httpClient.get).toHaveBeenCalledWith('/projects/paginated?page=1&size=20')
  })

  it('handles errors during fetch', async () => {
    const store = useProjectsStore()
    httpClient.get.mockRejectedValue(new Error('Fetch error'))

    await store.fetchProjects()

    expect(store.projects).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBe('Failed to fetch projects')
  })

  it('sets filters and resets pagination', async () => {
    const store = useProjectsStore()
    httpClient.get.mockResolvedValue({ items: [], total: 0, pages: 1 })

    store.setFilters({ query: 'test' })

    expect(store.filters.query).toBe('test')
    expect(store.pagination.page).toBe(1)
        expect(httpClient.get).toHaveBeenCalledWith('/projects/paginated?page=1&size=20&query=test')
  })

  it('sets page', async () => {
    const store = useProjectsStore()
    httpClient.get.mockResolvedValue({ items: [], total: 0, pages: 1 })

    store.setPage(2)

    expect(store.pagination.page).toBe(2)
    expect(httpClient.get).toHaveBeenCalledWith('/projects/paginated?page=2&size=20')
  })
})
