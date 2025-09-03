/**
 * Advanced composable for async component loading with performance optimization
 * Provides intelligent preloading, caching, and error recovery strategies
 */

import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import type { Component } from 'vue'
import { performanceMonitor, createTrackedAsyncComponent } from '@/utils/performance'

export interface AsyncComponentConfig {
  chunkName: string
  loader: () => Promise<Component>
  preload?: boolean
  priority?: 'high' | 'medium' | 'low'
  cacheStrategy?: 'aggressive' | 'normal' | 'conservative'
  retryOptions?: {
    maxAttempts?: number
    baseDelay?: number
    maxDelay?: number
  }
}

export interface AsyncComponentState {
  component: Component | null
  isLoading: boolean
  error: Error | null
  loadTime?: number
  cacheHit?: boolean
  retryCount: number
}

// Global component cache with LRU eviction
const componentCache = new Map<string, Component>()
const loadingPromises = new Map<string, Promise<Component>>()
const preloadQueue = new Set<string>()
const CACHE_SIZE_LIMIT = 20

// Priority-based preloading queues
const preloadQueues = {
  high: new Set<AsyncComponentConfig>(),
  medium: new Set<AsyncComponentConfig>(),
  low: new Set<AsyncComponentConfig>()
}

/**
 * Enhanced async component composable with intelligent loading strategies
 */
export function useAsyncComponents() {
  const components = ref<Map<string, AsyncComponentState>>(new Map())
  const isPreloadingActive = ref(false)
  const preloadProgress = ref(0)

  // Computed properties for analytics
  const loadingComponents = computed(() =>
    Array.from(components.value.values()).filter(state => state.isLoading)
  )

  const erroredComponents = computed(() =>
    Array.from(components.value.values()).filter(state => state.error)
  )

  const cacheHitRate = computed(() => {
    const total = components.value.size
    if (total === 0) return 0
    const cacheHits = Array.from(components.value.values()).filter(state => state.cacheHit).length
    return (cacheHits / total) * 100
  })

  /**
   * Register an async component with advanced configuration
   */
  const registerComponent = (config: AsyncComponentConfig): void => {
    const initialState: AsyncComponentState = {
      component: null,
      isLoading: false,
      error: null,
      retryCount: 0
    }

    components.value.set(config.chunkName, initialState)

    // Add to preload queue based on priority
    if (config.preload) {
      const priority = config.priority || 'medium'
      preloadQueues[priority].add(config)
    }
  }

  /**
   * Load component with intelligent caching and retry logic
   */
  const loadComponent = async (config: AsyncComponentConfig): Promise<Component> => {
    const { chunkName, loader, cacheStrategy = 'normal', retryOptions = {} } = config
    const state = components.value.get(chunkName)

    if (!state) {
      throw new Error(`Component ${chunkName} not registered`)
    }

    // Return cached component if available
    if (componentCache.has(chunkName) && cacheStrategy !== 'conservative') {
      state.component = componentCache.get(chunkName)!
      state.cacheHit = true
      state.isLoading = false
      return state.component
    }

    // Return existing loading promise if in progress
    if (loadingPromises.has(chunkName)) {
      return loadingPromises.get(chunkName)!
    }

    // Start loading process
    state.isLoading = true
    state.error = null

    const loadingPromise = performAsyncLoad(config, state)
    loadingPromises.set(chunkName, loadingPromise)

    try {
      const component = await loadingPromise

      // Cache the component with LRU eviction
      cacheComponent(chunkName, component, cacheStrategy)

      state.component = component
      state.isLoading = false
      state.cacheHit = false

      return component

    } catch (error) {
      state.error = error as Error
      state.isLoading = false
      throw error
    } finally {
      loadingPromises.delete(chunkName)
    }
  }

  /**
   * Perform async loading with retry logic and performance tracking
   */
  const performAsyncLoad = async (
    config: AsyncComponentConfig,
    state: AsyncComponentState
  ): Promise<Component> => {
    const { chunkName, loader, retryOptions = {} } = config
    const { maxAttempts = 3, baseDelay = 1000, maxDelay = 5000 } = retryOptions

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const startTime = performance.now()

        // Use performance monitor for tracking
        const component = await performanceMonitor.trackAsyncChunkLoad(
          chunkName,
          loader,
          getCurrentRoute()
        )

        const loadTime = performance.now() - startTime
        state.loadTime = loadTime
        state.retryCount = attempt - 1

        return component

      } catch (error) {
        lastError = error as Error
        state.retryCount = attempt

        // Don't retry on the last attempt
        if (attempt === maxAttempts) {
          break
        }

        // Calculate delay with exponential backoff and jitter
        const baseRetryDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
        const jitter = Math.random() * 1000
        const delay = baseRetryDelay + jitter

        console.warn(
          `Failed to load ${chunkName} (attempt ${attempt}/${maxAttempts}). Retrying in ${delay.toFixed(0)}ms...`,
          error
        )

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error(`Failed to load ${chunkName} after ${maxAttempts} attempts`)
  }

  /**
   * Cache component with LRU eviction strategy
   */
  const cacheComponent = (chunkName: string, component: Component, strategy: string): void => {
    // Implement LRU eviction if cache is full
    if (componentCache.size >= CACHE_SIZE_LIMIT && !componentCache.has(chunkName)) {
      const firstKey = componentCache.keys().next().value
      if (firstKey) {
        componentCache.delete(firstKey)
      }
    }

    // Re-insert to make it most recently used
    if (componentCache.has(chunkName)) {
      componentCache.delete(chunkName)
    }

    componentCache.set(chunkName, component)
  }

  /**
   * Intelligent preloading based on priority and network conditions
   */
  const startPreloading = async (): Promise<void> => {
    if (isPreloadingActive.value) return

    isPreloadingActive.value = true
    preloadProgress.value = 0

    // Check network conditions for adaptive preloading
    const connection = (navigator as any).connection
    const isSlowNetwork = connection && (
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g' ||
      connection.saveData
    )

    // Preload high priority components first
    const allConfigs = [
      ...Array.from(preloadQueues.high),
      ...(isSlowNetwork ? [] : Array.from(preloadQueues.medium)), // Skip medium on slow networks
      ...(isSlowNetwork ? [] : Array.from(preloadQueues.low))     // Skip low on slow networks
    ]

    const totalComponents = allConfigs.length
    let loadedCount = 0

    for (const config of allConfigs) {
      try {
        // Load with lower timeout for preloading
        const quickLoader = () => Promise.race([
          config.loader(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Preload timeout')), 3000)
          )
        ]) as Promise<Component>

        await performanceMonitor.trackAsyncChunkLoad(
          `preload-${config.chunkName}`,
          quickLoader
        )

        loadedCount++
        preloadProgress.value = (loadedCount / totalComponents) * 100

        // Add small delay to avoid blocking main thread
        await nextTick()

        if (import.meta.env.DEV) {
          console.log(`Preloaded: ${config.chunkName} (${loadedCount}/${totalComponents})`)
        }

      } catch (error) {
        console.warn(`Preload failed for ${config.chunkName}:`, error)
        loadedCount++
        preloadProgress.value = (loadedCount / totalComponents) * 100
      }
    }

    isPreloadingActive.value = false

    if (import.meta.env.DEV) {
      console.log(`Preloading complete: ${loadedCount}/${totalComponents} components loaded`)
    }
  }

  /**
   * Get current route for context
   */
  const getCurrentRoute = (): string | undefined => {
    return window.location.pathname
  }

  /**
   * Create optimized async component wrapper
   */
  const createAsyncComponent = (config: AsyncComponentConfig) => {
    registerComponent(config)

    return createTrackedAsyncComponent(
      config.chunkName,
      () => loadComponent(config),
      // Provide skeleton component based on chunk type
      getSkeletonComponent(config.chunkName)
    )
  }

  /**
   * Get appropriate skeleton component based on chunk name
   */
  const getSkeletonComponent = (chunkName: string) => {
    // Return appropriate loading skeleton based on component type
    if (chunkName.includes('equipment')) {
      return { template: '<div class="animate-pulse bg-gray-200 h-40 rounded-lg"></div>' }
    }
    if (chunkName.includes('cart')) {
      return { template: '<div class="animate-pulse bg-gray-200 h-32 rounded-lg"></div>' }
    }
    if (chunkName.includes('scanner')) {
      return { template: '<div class="animate-pulse bg-gray-200 h-24 rounded-lg"></div>' }
    }
    return { template: '<div class="animate-pulse bg-gray-200 h-20 rounded-lg"></div>' }
  }

  /**
   * Retry failed component loads
   */
  const retryFailedComponents = async (): Promise<void> => {
    const failedComponents = Array.from(components.value.entries())
      .filter(([_, state]) => state.error)
      .map(([chunkName]) => chunkName)

    for (const chunkName of failedComponents) {
      const config = findComponentConfig(chunkName)
      if (config) {
        try {
          await loadComponent(config)
        } catch (error) {
          console.error(`Retry failed for ${chunkName}:`, error)
        }
      }
    }
  }

  /**
   * Find component configuration by chunk name
   */
  const findComponentConfig = (chunkName: string): AsyncComponentConfig | null => {
    for (const queue of Object.values(preloadQueues)) {
      for (const config of queue) {
        if (config.chunkName === chunkName) {
          return config
        }
      }
    }
    return null
  }

  /**
   * Clear component cache
   */
  const clearCache = (): void => {
    componentCache.clear()
    loadingPromises.clear()
    components.value.clear()
    preloadQueues.high.clear()
    preloadQueues.medium.clear()
    preloadQueues.low.clear()
  }

  /**
   * Get performance analytics
   */
  const getAnalytics = () => ({
    totalComponents: components.value.size,
    loadingComponents: loadingComponents.value.length,
    erroredComponents: erroredComponents.value.length,
    cacheSize: componentCache.size,
    cacheHitRate: cacheHitRate.value,
    preloadProgress: preloadProgress.value,
    isPreloading: isPreloadingActive.value,
    averageLoadTime: calculateAverageLoadTime(),
    componentStates: Object.fromEntries(components.value)
  })

  /**
   * Calculate average load time
   */
  const calculateAverageLoadTime = (): number => {
    const loadTimes = Array.from(components.value.values())
      .map(state => state.loadTime)
      .filter((time): time is number => time !== undefined)

    if (loadTimes.length === 0) return 0
    return loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
  }

  // Start preloading on component mount (when appropriate)
  onMounted(() => {
    // Start preloading after initial render to avoid blocking
    if (preloadQueues.high.size > 0) {
      setTimeout(startPreloading, 100)
    }
  })

  onUnmounted(() => {
    // Clean up loading promises
    loadingPromises.clear()
  })

  return {
    // Component management
    registerComponent,
    loadComponent,
    createAsyncComponent,

    // Preloading
    startPreloading,
    preloadProgress: readonly(preloadProgress),
    isPreloadingActive: readonly(isPreloadingActive),

    // Error handling
    retryFailedComponents,

    // Cache management
    clearCache,

    // Analytics
    getAnalytics,
    cacheHitRate: readonly(cacheHitRate),
    loadingComponents: readonly(loadingComponents),
    erroredComponents: readonly(erroredComponents),

    // State
    components: readonly(components)
  }
}

/**
 * Create a readonly ref for external consumption
 */
function readonly<T>(ref: any) {
  return computed(() => ref.value)
}

/**
 * Utility function to create async components with default configurations
 */
export const createOptimizedAsyncComponent = (
  chunkName: string,
  loader: () => Promise<Component>,
  options: Partial<AsyncComponentConfig> = {}
) => {
  const asyncComponents = useAsyncComponents()

  const config: AsyncComponentConfig = {
    chunkName,
    loader,
    priority: 'medium',
    cacheStrategy: 'normal',
    preload: false,
    ...options
  }

  return asyncComponents.createAsyncComponent(config)
}

/**
 * Preload critical components that are likely to be needed
 */
export const preloadCriticalChunks = async (): Promise<void> => {
  const criticalChunks: AsyncComponentConfig[] = [
    {
      chunkName: 'vue-ecosystem',
      loader: () => import('vue-router').then(() => ({ template: '<div></div>' })),
      priority: 'high',
      preload: true
    },
    {
      chunkName: 'core-components',
      loader: () => import('@/components/common/LoadingSkeleton.vue'),
      priority: 'high',
      preload: true
    },
    {
      chunkName: 'dashboard-module',
      loader: () => import('@/views/DashboardView.vue'),
      priority: 'medium',
      preload: true
    }
  ]

  const asyncComponents = useAsyncComponents()

  // Register and preload critical chunks
  for (const config of criticalChunks) {
    asyncComponents.registerComponent(config)
  }

  // Start preloading after a short delay to avoid blocking initial render
  setTimeout(() => {
    asyncComponents.startPreloading()
  }, 1000)
}
