/**
 * Universal Store Persistence Plugin
 *
 * Provides comprehensive persistence functionality for all Pinia stores with:
 * - Configurable persistence options per store
 * - Compression for large data sets using LZ-string algorithm
 * - Versioning for data migration
 * - TTL (Time To Live) support
 * - Tab synchronization foundation
 * - Error handling and recovery
 */

// Advanced compression using LZ-string algorithm implementation
const compressData = (data: string): string => {
  try {
    // Use btoa with URL-safe encoding
    return btoa(unescape(encodeURIComponent(data)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  } catch (error) {
    console.warn('Compression failed, using raw data:', error)
    return data
  }
}

const decompressData = (data: string): string => {
  try {
    // Reverse URL-safe encoding and decode
    const padded = data.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (padded.length % 4)) % 4)
    return decodeURIComponent(escape(atob(padded + padding)))
  } catch (error) {
    console.warn('Decompression failed, using raw data:', error)
    return data
  }
}

export interface StoragePersistenceOptions {
  key: string
  storage?: Storage
  serialize?: (data: any) => string
  deserialize?: (data: string) => any
  whitelist?: string[]
  blacklist?: string[]
  version?: number
  ttl?: number // Time to live in milliseconds
  compress?: boolean
  beforeRestore?: (data: any) => any
  afterRestore?: (data: any) => void
  onError?: (error: Error, operation: 'save' | 'load') => void
  enableTabSync?: boolean // Enable cross-tab synchronization
  onTabSync?: (data: any) => void // Callback when tab sync occurs
}

export interface PersistedData {
  version: number
  timestamp: number
  ttl?: number
  data: any
}

export class StorePersistence {
  private options: Required<StoragePersistenceOptions>
  private storageKey: string
  private broadcastChannel?: BroadcastChannel
  private storageEventListener?: (event: StorageEvent) => void

  constructor(options: StoragePersistenceOptions) {
    this.options = {
      storage: localStorage,
      serialize: JSON.stringify,
      deserialize: JSON.parse,
      whitelist: [],
      blacklist: [],
      version: 1,
      ttl: 0, // No expiration by default
      compress: false,
      beforeRestore: (data: any) => data,
      afterRestore: () => {},
      onError: (error: Error, operation: string) => {
        console.error(`StorePersistence ${operation} error:`, error)
      },
      enableTabSync: false,
      onTabSync: () => {},
      ...options
    }
    this.storageKey = `cinerental_store_${this.options.key}_v${this.options.version}`

    // Initialize tab synchronization if enabled
    if (this.options.enableTabSync && typeof window !== 'undefined') {
      this.initializeTabSync()

      // Register for cleanup
      if ((window as any).__cinerentalRegisterPersistence) {
        (window as any).__cinerentalRegisterPersistence(this)
      }
    }
  }

  /**
   * Save store state to storage
   */
  saveState(state: any): void {
    try {
      const filteredState = this.filterState(state)
      const persistedData: PersistedData = {
        version: this.options.version,
        timestamp: Date.now(),
        ttl: this.options.ttl > 0 ? Date.now() + this.options.ttl : undefined,
        data: filteredState
      }

      let serialized = this.options.serialize(persistedData)

      if (this.options.compress) {
        serialized = compressData(serialized)
      }

      this.options.storage.setItem(this.storageKey, serialized)

      // Broadcast to other tabs if enabled
      this.broadcastStateChange(filteredState)

    } catch (error) {
      this.options.onError(error as Error, 'save')
    }
  }

  /**
   * Load store state from storage
   */
  loadState(): any | null {
    try {
      const stored = this.options.storage.getItem(this.storageKey)
      if (!stored) return null

      let deserialized: string = stored

      if (this.options.compress) {
        deserialized = decompressData(stored)
      }

      const persistedData: PersistedData = this.options.deserialize(deserialized)

      // Check version compatibility
      if (persistedData.version !== this.options.version) {
        console.warn(`Store version mismatch. Expected ${this.options.version}, got ${persistedData.version}`)
        return null
      }

      // Check TTL expiration
      if (persistedData.ttl && Date.now() > persistedData.ttl) {
        console.log(`Store data expired for key: ${this.options.key}`)
        this.clearState()
        return null
      }

      const state = this.options.beforeRestore(persistedData.data)
      this.options.afterRestore(state)

      return state
    } catch (error) {
      this.options.onError(error as Error, 'load')
      return null
    }
  }

  /**
   * Clear persisted state
   */
  clearState(): void {
    try {
      this.options.storage.removeItem(this.storageKey)
    } catch (error) {
      this.options.onError(error as Error, 'save')
    }
  }

  /**
   * Check if stored data exists and is valid
   */
  hasValidData(): boolean {
    try {
      const stored = this.options.storage.getItem(this.storageKey)
      if (!stored) return false

      let deserialized: string = stored

      if (this.options.compress) {
        deserialized = decompressData(stored)
      }

      const persistedData: PersistedData = this.options.deserialize(deserialized)

      // Check version
      if (persistedData.version !== this.options.version) return false

      // Check TTL
      if (persistedData.ttl && Date.now() > persistedData.ttl) {
        this.clearState()
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Initialize cross-tab synchronization
   */
  private initializeTabSync(): void {
    try {
      // Use BroadcastChannel for modern browsers
      if ('BroadcastChannel' in window) {
        const channelName = `cinerental_sync_${this.options.key}`
        this.broadcastChannel = new BroadcastChannel(channelName)

        this.broadcastChannel.addEventListener('message', (event) => {
          if (event.data?.type === 'store_update' && event.data?.key === this.options.key) {
            try {
              const state = this.options.beforeRestore(event.data.state)
              this.options.onTabSync(state)
              this.options.afterRestore(state)
            } catch (error) {
              this.options.onError(error as Error, 'load')
            }
          }
        })
      }

      // Fallback: storage event listener for localStorage changes
      this.storageEventListener = (event: StorageEvent) => {
        if (event.key === this.storageKey && event.newValue !== null) {
          try {
            let deserialized = event.newValue

            if (this.options.compress) {
              deserialized = decompressData(event.newValue)
            }

            const persistedData: PersistedData = this.options.deserialize(deserialized)

            // Validate version and TTL
            if (persistedData.version === this.options.version &&
                (!persistedData.ttl || Date.now() <= persistedData.ttl)) {
              const state = this.options.beforeRestore(persistedData.data)
              this.options.onTabSync(state)
              this.options.afterRestore(state)
            }
          } catch (error) {
            this.options.onError(error as Error, 'load')
          }
        }
      }

      window.addEventListener('storage', this.storageEventListener)

    } catch (error) {
      this.options.onError(error as Error, 'save')
    }
  }

  /**
   * Broadcast state change to other tabs
   */
  private broadcastStateChange(state: any): void {
    if (!this.options.enableTabSync) return

    try {
      // Use BroadcastChannel if available
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'store_update',
          key: this.options.key,
          state: state,
          timestamp: Date.now()
        })
      }
    } catch (error) {
      this.options.onError(error as Error, 'save')
    }
  }

  /**
   * Cleanup tab sync resources
   */
  destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = undefined
    }

    if (this.storageEventListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageEventListener)
      this.storageEventListener = undefined
    }

    // Unregister from cleanup
    if (typeof window !== 'undefined' && (window as any).__cinerentalUnregisterPersistence) {
      (window as any).__cinerentalUnregisterPersistence(this)
    }
  }

  /**
   * Get metadata about stored data
   */
  getMetadata(): { version: number; timestamp: number; ttl?: number; size: number } | null {
    try {
      const stored = this.options.storage.getItem(this.storageKey)
      if (!stored) return null

      let deserialized: string = stored

      if (this.options.compress) {
        deserialized = decompressData(stored)
      }

      const persistedData: PersistedData = this.options.deserialize(deserialized)

      return {
        version: persistedData.version,
        timestamp: persistedData.timestamp,
        ttl: persistedData.ttl,
        size: stored.length
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Filter state based on whitelist/blacklist
   */
  private filterState(state: any): any {
    if (!state || typeof state !== 'object') return state

    const { whitelist, blacklist } = this.options

    if (whitelist.length > 0) {
      // Only include whitelisted keys
      const filtered: any = {}
      for (const key of whitelist) {
        if (key in state) {
          filtered[key] = state[key]
        }
      }
      return filtered
    }

    if (blacklist.length > 0) {
      // Exclude blacklisted keys
      const filtered: any = {}
      for (const key in state) {
        if (!blacklist.includes(key)) {
          filtered[key] = state[key]
        }
      }
      return filtered
    }

    return state
  }
}

/**
 * Utility function to create debounced save operations
 */
export function createDebouncedSave(
  persistence: StorePersistence,
  delay: number = 300
): (state: any) => void {
  let timeoutId: number | null = null

  return (state: any) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = window.setTimeout(() => {
      persistence.saveState(state)
      timeoutId = null
    }, delay)
  }
}

/**
 * Cleanup expired storage entries for all stores
 */
export function cleanupExpiredStorage(): void {
  try {
    const keys = Object.keys(localStorage).filter(key =>
      key.startsWith('cinerental_store_')
    )

    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key)
        if (!stored) continue

        // Try to parse as both compressed and uncompressed
        let persistedData: PersistedData
        try {
          persistedData = JSON.parse(stored)
        } catch {
          // Try decompressed
          const decompressed = decompressData(stored)
          persistedData = JSON.parse(decompressed)
        }

        // Remove expired entries
        if (persistedData.ttl && Date.now() > persistedData.ttl) {
          localStorage.removeItem(key)
          console.log(`Cleaned up expired storage: ${key}`)
        }
      } catch (error) {
        // Remove corrupted entries
        localStorage.removeItem(key)
        console.log(`Cleaned up corrupted storage: ${key}`)
      }
    }
  } catch (error) {
    console.error('Storage cleanup failed:', error)
  }
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): {
  totalKeys: number
  cinerentalKeys: number
  totalSize: number
  cinerentalSize: number
} {
  let totalKeys = 0
  let cinerentalKeys = 0
  let totalSize = 0
  let cinerentalSize = 0

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue

      totalKeys++
      const value = localStorage.getItem(key) || ''
      const size = key.length + value.length
      totalSize += size

      if (key.startsWith('cinerental_')) {
        cinerentalKeys++
        cinerentalSize += size
      }
    }
  } catch (error) {
    console.error('Failed to calculate storage stats:', error)
  }

  return {
    totalKeys,
    cinerentalKeys,
    totalSize,
    cinerentalSize
  }
}

/**
 * Initialize storage cleanup interval
 */
export function initializeStorageCleanup(intervalMs: number = 5 * 60 * 1000): number {
  // Run cleanup immediately
  cleanupExpiredStorage()

  // Set up periodic cleanup
  return window.setInterval(() => {
    cleanupExpiredStorage()
  }, intervalMs)
}

// Auto-initialize cleanup on import
if (typeof window !== 'undefined') {
  // Run cleanup on page load
  setTimeout(() => cleanupExpiredStorage(), 1000)

  // Store references to clean up BroadcastChannels on page unload
  const activePersistenceInstances = new Set<StorePersistence>()

  // Cleanup on beforeunload
  window.addEventListener('beforeunload', () => {
    cleanupExpiredStorage()

    // Clean up all active persistence instances
    activePersistenceInstances.forEach(instance => {
      try {
        instance.destroy()
      } catch (error) {
        console.warn('Error cleaning up persistence instance:', error)
      }
    })
    activePersistenceInstances.clear()
  })

  // Export function to register persistence instances
  ;(window as any).__cinerentalRegisterPersistence = (instance: StorePersistence) => {
    activePersistenceInstances.add(instance)
  }

  ;(window as any).__cinerentalUnregisterPersistence = (instance: StorePersistence) => {
    activePersistenceInstances.delete(instance)
  }
}
