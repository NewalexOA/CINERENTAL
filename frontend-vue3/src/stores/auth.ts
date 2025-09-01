import { defineStore } from 'pinia'
import { httpClient } from '@/services/api/http-client'

interface User {
  id: number
  email: string
  name: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
}

// Helper function to safely access localStorage
function getInitialToken(): string | null {
  try {
    return localStorage.getItem('auth_token')
  } catch (e) {
    console.error('Failed to access localStorage:', e)
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: getInitialToken(),
    isAuthenticated: false,
    loading: false,
  }),

  getters: {
    /**
     * Checks if the user is currently authenticated.
     * @param {AuthState} state The auth store state.
     * @returns {boolean} True if the user is authenticated, false otherwise.
     */
    isLoggedIn: (state) => state.isAuthenticated && !!state.token,
    /**
     * Gets the role of the current user.
     * @param {AuthState} state The auth store state.
     * @returns {string | undefined} The user's role, or undefined if not logged in.
     */
    userRole: (state) => state.user?.role,
  },

  actions: {
    /**
     * Logs the user in with the provided credentials.
     * @param {string} email The user's email.
     * @param {string} password The user's password.
     * @returns {Promise<any>} The response from the login API call.
     */
    async login(email: string, password: string) {
      this.loading = true

      try {
        const response = await httpClient.post('/auth/login', { email, password })

        this.token = response.access_token
        this.user = response.user
        this.isAuthenticated = true

        try {
          localStorage.setItem('auth_token', this.token)
        } catch (e) {
          console.error('Failed to access localStorage:', e)
        }

        return response
      } catch (error) {
        this.logout()
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Logs the current user out.
     */
    async logout() {
      this.user = null
      this.token = null
      this.isAuthenticated = false

      try {
        localStorage.removeItem('auth_token')
      } catch (e) {
        console.error('Failed to access localStorage:', e)
      }
    },

    /**
     * Checks if the current authentication token is valid.
     * @returns {Promise<boolean>} True if authentication is valid, false otherwise.
     */
    async checkAuth() {
      if (!this.token) {
        return false
      }

      try {
        const user = await httpClient.get('/auth/me')
        this.user = user
        this.isAuthenticated = true
        return true
      } catch (error) {
        this.logout()
        return false
      }
    },
  },
})
