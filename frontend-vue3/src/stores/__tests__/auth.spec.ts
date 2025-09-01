import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import { httpClient } from '@/services/api/http-client'

// Mock the http client
vi.mock('@/services/api/http-client', () => ({
  httpClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem(key: string) {
      return store[key] || null
    },
    setItem(key: string, value: string) {
      store[key] = value.toString()
    },
    removeItem(key: string) {
      delete store[key]
    },
    clear() {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Auth Store', () => {
  beforeEach(() => {
    // Create a fresh Pinia instance and make it active
    setActivePinia(createPinia())
    // Reset mocks and localStorage before each test
    vi.mocked(httpClient.post).mockClear()
    vi.mocked(httpClient.get).mockClear()
    localStorage.clear()
  })

  it('initializes with token from localStorage', () => {
    localStorage.setItem('auth_token', 'test-token')
    const authStore = useAuthStore()
    expect(authStore.token).toBe('test-token')
  })

  it('handles login successfully', async () => {
    const authStore = useAuthStore()
    const mockResponse = {
      access_token: 'new-token',
      user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' },
    }
    vi.mocked(httpClient.post).mockResolvedValue(mockResponse)

    await authStore.login('test@example.com', 'password')

    expect(httpClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password',
    })
    expect(authStore.token).toBe('new-token')
    expect(authStore.user?.name).toBe('Test User')
    expect(authStore.isAuthenticated).toBe(true)
    expect(localStorage.getItem('auth_token')).toBe('new-token')
  })

  it('handles login failure', async () => {
    const authStore = useAuthStore()
    vi.mocked(httpClient.post).mockRejectedValue(new Error('Login failed'))

    await expect(authStore.login('test@example.com', 'password')).rejects.toThrow('Login failed')

    expect(authStore.token).toBe(null)
    expect(authStore.user).toBe(null)
    expect(authStore.isAuthenticated).toBe(false)
    expect(localStorage.getItem('auth_token')).toBe(null)
  })

  it('handles logout', async () => {
    // Setup initial logged-in state
    localStorage.setItem('auth_token', 'test-token')
    const authStore = useAuthStore()
    authStore.token = 'test-token'
    authStore.isAuthenticated = true

    await authStore.logout()

    expect(authStore.token).toBe(null)
    expect(authStore.user).toBe(null)
    expect(authStore.isAuthenticated).toBe(false)
    expect(localStorage.getItem('auth_token')).toBe(null)
  })
})
