import { defineStore } from 'pinia'
import { watch } from 'vue'
import { httpClient } from '@/services/api/http-client'
import { StorePersistence, createDebouncedSave } from '@/plugins/store-persistence'

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

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  dashboard: {
    defaultView: string
    refreshInterval: number
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState & { preferences: UserPreferences; lastActivity: number | null } => {
    // --- PERSISTENCE SETUP ---
    const persistence = new StorePersistence({
      key: 'auth',
      version: 2, // Incremented for new preferences feature
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days for auth data
      compress: false, // Don't compress auth data for security
      whitelist: ['token', 'user', 'isAuthenticated', 'preferences', 'lastActivity'],
      beforeRestore: (data: any) => {
        // Validate and sanitize restored auth data
        return {
          token: typeof data.token === 'string' ? data.token : null,
          user: data.user && typeof data.user === 'object' ? {
            id: data.user.id || 0,
            email: data.user.email || '',
            name: data.user.name || '',
            role: data.user.role || 'user'
          } : null,
          isAuthenticated: Boolean(data.isAuthenticated && data.token),
          preferences: data.preferences && typeof data.preferences === 'object' ? {
            theme: ['light', 'dark', 'auto'].includes(data.preferences.theme) ? data.preferences.theme : 'auto',
            language: data.preferences.language || 'en',
            timezone: data.preferences.timezone || 'UTC',
            notifications: {
              email: Boolean(data.preferences.notifications?.email),
              push: Boolean(data.preferences.notifications?.push),
              sms: Boolean(data.preferences.notifications?.sms)
            },
            dashboard: {
              defaultView: data.preferences.dashboard?.defaultView || 'overview',
              refreshInterval: Number(data.preferences.dashboard?.refreshInterval) || 30000
            }
          } : {
            theme: 'auto',
            language: 'en',
            timezone: 'UTC',
            notifications: { email: true, push: true, sms: false },
            dashboard: { defaultView: 'overview', refreshInterval: 30000 }
          },
          lastActivity: data.lastActivity || null
        }
      },
      onError: (error: Error, operation: string) => {
        console.error(`Auth store persistence ${operation} error:`, error)
      }
    })

    // Load persisted state
    const restored = persistence.loadState()

    return {
      user: restored?.user || null,
      token: restored?.token || null,
      isAuthenticated: Boolean(restored?.isAuthenticated && restored?.token),
      loading: false,
      preferences: restored?.preferences || {
        theme: 'auto',
        language: 'en',
        timezone: 'UTC',
        notifications: { email: true, push: true, sms: false },
        dashboard: { defaultView: 'overview', refreshInterval: 30000 }
      },
      lastActivity: restored?.lastActivity || null,
      _persistence: persistence
    }
  },

  getters: {
    /**
     * Checks if the user is currently authenticated.
     */
    isLoggedIn: (state) => state.isAuthenticated && !!state.token,
    /**
     * Gets the role of the current user.
     */
    userRole: (state) => state.user?.role,
    /**
     * Checks if the user session is still valid (within activity timeout)
     */
    isSessionValid: (state) => {
      if (!state.lastActivity) return true // No timeout if no activity recorded
      const sessionTimeout = 24 * 60 * 60 * 1000 // 24 hours
      return (Date.now() - state.lastActivity) < sessionTimeout
    },
    /**
     * Gets user preferences
     */
    userPreferences: (state) => state.preferences,
    /**
     * Gets cache information
     */
    cacheInfo: (state) => {
      const metadata = state._persistence?.getMetadata()
      return {
        hasCache: !!metadata,
        lastActivity: state.lastActivity ? new Date(state.lastActivity).toLocaleString() : null,
        isSessionValid: state.isAuthenticated && state.token ? true : false,
        ...metadata
      }
    }
  },

  actions: {
    /**
     * Saves current state to persistent storage
     */
    _saveState() {
      const stateToSave = {
        token: this.token,
        user: this.user,
        isAuthenticated: this.isAuthenticated,
        preferences: this.preferences,
        lastActivity: this.lastActivity
      }
      this._persistence.saveState(stateToSave)
    },

    /**
     * Updates user activity timestamp
     */
    updateActivity() {
      this.lastActivity = Date.now()
      this._saveState()
    },

    /**
     * Logs the user in with the provided credentials.
     */
    async login(email: string, password: string) {
      this.loading = true

      try {
        const response = await httpClient.post('/auth/login', { email, password })

        this.token = response.access_token
        this.user = response.user
        this.isAuthenticated = true
        this.updateActivity()

        // Load user preferences from server if available
        if (response.preferences) {
          this.preferences = { ...this.preferences, ...response.preferences }
        }

        this._saveState()
        console.log('🔐 Auth store: User logged in successfully')

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
      this.lastActivity = null

      // Keep preferences but clear sensitive data
      this._persistence.clearState()
      console.log('🔐 Auth store: User logged out')
    },

    /**
     * Checks if the current authentication token is valid.
     */
    async checkAuth() {
      if (!this.token || !this.isSessionValid) {
        this.logout()
        return false
      }

      try {
        const user = await httpClient.get('/auth/me')
        this.user = user
        this.isAuthenticated = true
        this.updateActivity()
        return true
      } catch (error) {
        this.logout()
        return false
      }
    },

    /**
     * Updates user preferences
     */
    async updatePreferences(newPreferences: Partial<UserPreferences>) {
      this.preferences = { ...this.preferences, ...newPreferences }
      this._saveState()

      // Optionally sync with server
      try {
        await httpClient.put('/auth/preferences', this.preferences)
      } catch (error) {
        console.warn('Failed to sync preferences with server:', error)
      }
    },

    /**
     * Clears all cached data
     */
    clearCache() {
      this._persistence.clearState()
      this.user = null
      this.token = null
      this.isAuthenticated = false
      this.lastActivity = null
      // Reset preferences to defaults
      this.preferences = {
        theme: 'auto',
        language: 'en',
        timezone: 'UTC',
        notifications: { email: true, push: true, sms: false },
        dashboard: { defaultView: 'overview', refreshInterval: 30000 }
      }
      console.log('🗑️ Auth store: Cache cleared')
    }
  },
})
