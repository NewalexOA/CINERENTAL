/**
 * Advanced Async Component Management with Performance Optimization
 * Provides intelligent preloading, caching, and error recovery for async components
 */
import { ref, computed, onMounted, onUnmounted, type Component } from 'vue'
import { performanceMonitor } from '@/utils/performance'
import AsyncWrapper from '@/components/async/AsyncWrapper.vue'

interface AsyncComponentConfig {
  chunkName: string
  loader: () => Promise<Component>
  priority: 'critical' | 'high' | 'medium' | 'low'
  preload?: boolean
  cache?: boolean
  dependencies?: string[]
  skeletonVariant?: 'virtual-equipment-list' | 'universal-cart' | 'virtual-projects-list' | 'scanner' | 'generic'
  skeletonProps?: Record<string, any>
  retryConfig?: {
    maxRetries: number
    retryDelay: number
    timeout: number
  }
}

interface ComponentCache {
  component: Component
  loadTime: number
  size?: number
  timestamp: number
  hitCount: number
}

class AsyncComponentManager {
  private static instance: AsyncComponentManager
  private componentCache = new Map<string, ComponentCache>()
  private loadingQueue = new Map<string, Promise<Component>>()
  private preloadScheduler: NodeJS.Timeout | null = null
  private performanceMetrics = new Map<string, any>()

  static getInstance(): AsyncComponentManager {
    if (!AsyncComponentManager.instance) {
      AsyncComponentManager.instance = new AsyncComponentManager()
    }
    return AsyncComponentManager.instance
  }

  constructor() {
    this.initializePreloadScheduler()
    this.setupPerformanceTracking()
  }

  /**
   * Create an optimized async component with intelligent caching and preloading
   */
  createAsyncComponent(config: AsyncComponentConfig) {
    const {
      chunkName,
      loader,
      priority,
      preload = false,
      cache = true,
      dependencies = [],
      skeletonVariant = 'generic',
      skeletonProps = {},
      retryConfig = {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 10000
      }
    } = config

    // Enhanced loader with caching and dependency management
    const enhancedLoader = async (): Promise<Component> => {
      // Check cache first
      if (cache && this.componentCache.has(chunkName)) {
        const cached = this.componentCache.get(chunkName)!
        cached.hitCount++

        if (import.meta.env.DEV) {
          console.log(`📦 Cache hit for ${chunkName} (${cached.hitCount} hits)`)
        }

        return cached.component
      }

      // Check if already loading
      if (this.loadingQueue.has(chunkName)) {
        return this.loadingQueue.get(chunkName)!
      }

      // Load dependencies first if specified
      await this.loadDependencies(dependencies)

      const loadPromise = this.loadWithMetrics(chunkName, loader, priority)
      this.loadingQueue.set(chunkName, loadPromise)

      try {
        const component = await loadPromise
        this.loadingQueue.delete(chunkName)
        return component
      } catch (error) {
        this.loadingQueue.delete(chunkName)
        throw error
      }
    }

    // Return wrapped component with AsyncWrapper
    return {
      components: { AsyncWrapper },
      template: `
        <AsyncWrapper
          :chunk-name="'${chunkName}'"
          :loader="enhancedLoader"
          skeleton-variant="${skeletonVariant}"
          :skeleton-props="skeletonProps"
          :max-retries="${retryConfig.maxRetries}"
          :retry-delay="${retryConfig.retryDelay}"
          :timeout="${retryConfig.timeout}"
          :preload="${preload}"
          :show-performance-info="isDev"
          v-bind="$attrs"
          @loaded="onComponentLoaded"
          @error="onComponentError"
        />
      `,
      setup(_, { emit }) {
        const isDev = import.meta.env.DEV

        const onComponentLoaded = (component: Component, metrics: any) => {
          emit('loaded', component, metrics)
        }

        const onComponentError = (error: Error, retryCount: number) => {
          emit('error', error, retryCount)
        }

        return {
          enhancedLoader,
          skeletonProps,
          isDev,
          onComponentLoaded,
          onComponentError
        }
      },
      emits: ['loaded', 'error']
    }
  }

  /**
   * Load component with performance metrics and caching
   */
  private async loadWithMetrics(
    chunkName: string,
    loader: () => Promise<Component>,
    priority: string
  ): Promise<Component> {
    const startTime = performance.now()

    try {
      const component = await performanceMonitor.trackAsyncChunkLoad(chunkName, loader)
      const loadTime = performance.now() - startTime

      // Estimate size from performance entries
      const size = this.estimateComponentSize(chunkName)

      // Cache the component
      this.componentCache.set(chunkName, {
        component,
        loadTime,
        size,
        timestamp: Date.now(),
        hitCount: 0
      })

      // Store performance metrics
      this.performanceMetrics.set(chunkName, {
        loadTime,
        size,
        priority,
        timestamp: Date.now()
      })

      if (import.meta.env.DEV) {
        console.log(`📦 Loaded ${chunkName}: ${loadTime.toFixed(2)}ms${size ? ` (${size}KB)` : ''} [${priority}]`)
      }

      return component

    } catch (error) {
      console.error(`Failed to load ${chunkName}:`, error)
      throw error
    }
  }

  /**
   * Load dependencies in optimal order
   */
  private async loadDependencies(dependencies: string[]): Promise<void> {
    if (dependencies.length === 0) return

    const dependencyPromises = dependencies.map(dep => {
      if (this.componentCache.has(dep)) {
        return Promise.resolve()
      }
      return this.loadingQueue.get(dep) || Promise.resolve()
    })

    await Promise.all(dependencyPromises)
  }

  /**
   * Preload components based on priority and usage patterns
   */
  async preloadComponents(components: string[]): Promise<void> {
    if (!('requestIdleCallback' in window)) {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => this.doPreload(components), 2000)
      return
    }

    return new Promise((resolve) => {
      requestIdleCallback(() => {
        this.doPreload(components).then(resolve)
      })
    })
  }

  private async doPreload(components: string[]): Promise<void> {
    const preloadPromises = components.map(async (chunkName) => {
      if (this.componentCache.has(chunkName)) {
        return // Already cached
      }

      try {
        // Import the component (this will create the chunk)
        await import(/* @vite-ignore */ `../components/${chunkName}.vue`)

        if (import.meta.env.DEV) {
          console.log(`⚡ Preloaded ${chunkName}`)
        }
      } catch (error) {
        console.warn(`Failed to preload ${chunkName}:`, error)
      }
    })

    await Promise.allSettled(preloadPromises)
  }

  /**
   * Initialize intelligent preload scheduler
   */
  private initializePreloadScheduler(): void {
    // Schedule preloading based on user interaction patterns
    const schedulePreload = () => {
      if (this.preloadScheduler) {
        clearTimeout(this.preloadScheduler)
      }

      this.preloadScheduler = setTimeout(() => {
        this.preloadCriticalComponents()
      }, 3000) // Wait 3 seconds after last interaction
    }

    // Listen for user interactions
    const events = ['click', 'scroll', 'keydown']
    events.forEach(event => {
      document.addEventListener(event, schedulePreload, { passive: true })
    })
  }

  /**
   * Preload critical components based on usage patterns
   */
  private async preloadCriticalComponents(): Promise<void> {
    const criticalComponents = [
      'equipment/VirtualEquipmentList',
      'cart/UniversalCart',
      'projects/VirtualProjectsList'
    ]

    await this.preloadComponents(criticalComponents)
  }

  /**
   * Setup performance tracking and optimization suggestions
   */
  private setupPerformanceTracking(): void {
    if (import.meta.env.DEV) {
      // Log performance insights every 30 seconds
      setInterval(() => {
        this.logPerformanceInsights()
      }, 30000)
    }
  }

  /**
   * Estimate component size from network timing
   */
  private estimateComponentSize(chunkName: string): number {
    const resources = performance.getEntriesByType('resource')
    for (const resource of resources) {
      const entry = resource as PerformanceResourceTiming
      if (entry.name.includes(chunkName) && (entry as any).transferSize) {
        return Math.round((entry as any).transferSize / 1024)
      }
    }
    return 0
  }

  /**
   * Get performance analytics for components
   */
  getAnalytics() {
    return {
      cache: Array.from(this.componentCache.entries()).map(([name, cache]) => ({
        name,
        hitCount: cache.hitCount,
        size: cache.size,
        loadTime: cache.loadTime,
        age: Date.now() - cache.timestamp
      })),
      performance: Array.from(this.performanceMetrics.entries()).map(([name, metrics]) => ({
        name,
        ...metrics
      })),
      summary: {
        totalCached: this.componentCache.size,
        totalHits: Array.from(this.componentCache.values()).reduce((sum, cache) => sum + cache.hitCount, 0),
        avgLoadTime: this.getAverageLoadTime(),
        cacheEfficiency: this.getCacheEfficiency()
      }
    }
  }

  /**
   * Get average load time across all components
   */
  private getAverageLoadTime(): number {
    const metrics = Array.from(this.performanceMetrics.values())
    if (metrics.length === 0) return 0
    return metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length
  }

  /**
   * Calculate cache efficiency
   */
  private getCacheEfficiency(): number {
    const totalRequests = Array.from(this.componentCache.values())
      .reduce((sum, cache) => sum + cache.hitCount + 1, 0) // +1 for initial load
    const cacheHits = Array.from(this.componentCache.values())
      .reduce((sum, cache) => sum + cache.hitCount, 0)

    return totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0
  }

  /**
   * Log performance insights
   */
  private logPerformanceInsights(): void {
    const analytics = this.getAnalytics()

    if (analytics.cache.length > 0) {
      console.group('📊 Async Component Performance')
      console.log(`Components Cached: ${analytics.summary.totalCached}`)
      console.log(`Cache Efficiency: ${analytics.summary.cacheEfficiency.toFixed(1)}%`)
      console.log(`Average Load Time: ${analytics.summary.avgLoadTime.toFixed(2)}ms`)

      // Show top performers
      const topPerformers = analytics.cache
        .sort((a, b) => b.hitCount - a.hitCount)
        .slice(0, 3)

      if (topPerformers.length > 0) {
        console.log('Top Cached Components:')
        topPerformers.forEach(comp => {
          console.log(`  ${comp.name}: ${comp.hitCount} hits (${comp.loadTime?.toFixed(2)}ms)`)
        })
      }

      console.groupEnd()
    }
  }

  /**
   * Clear component cache
   */
  clearCache(): void {
    this.componentCache.clear()
    this.performanceMetrics.clear()
    this.loadingQueue.clear()
  }

  /**
   * Get cached component
   */
  getCachedComponent(chunkName: string): Component | null {
    const cached = this.componentCache.get(chunkName)
    return cached ? cached.component : null
  }

  /**
   * Check if component is cached
   */
  isCached(chunkName: string): boolean {
    return this.componentCache.has(chunkName)
  }
}

// Export singleton instance and composable
export const asyncComponentManager = AsyncComponentManager.getInstance()

/**
 * Vue composable for async component management
 */
export function useAsyncComponentManager() {
  const analytics = ref(asyncComponentManager.getAnalytics())

  // Update analytics periodically
  const updateAnalytics = () => {
    analytics.value = asyncComponentManager.getAnalytics()
  }

  let analyticsInterval: NodeJS.Timeout | null = null

  onMounted(() => {
    updateAnalytics()
    analyticsInterval = setInterval(updateAnalytics, 5000)
  })

  onUnmounted(() => {
    if (analyticsInterval) {
      clearInterval(analyticsInterval)
    }
  })

  return {
    // Methods
    createAsyncComponent: (config: AsyncComponentConfig) =>
      asyncComponentManager.createAsyncComponent(config),

    preloadComponents: (components: string[]) =>
      asyncComponentManager.preloadComponents(components),

    clearCache: () => asyncComponentManager.clearCache(),

    isCached: (chunkName: string) => asyncComponentManager.isCached(chunkName),

    getCachedComponent: (chunkName: string) =>
      asyncComponentManager.getCachedComponent(chunkName),

    // Reactive data
    analytics: computed(() => analytics.value),

    // Utilities
    updateAnalytics
  }
}

/**
 * Pre-configured async components with optimal settings
 */
export const useOptimizedAsyncComponents = () => {
  const manager = useAsyncComponentManager()

  return {
    // Critical components (high priority, preloaded)
    VirtualEquipmentList: manager.createAsyncComponent({
      chunkName: 'VirtualEquipmentList',
      loader: () => import('@/components/equipment/VirtualEquipmentList.vue'),
      priority: 'critical',
      preload: true,
      skeletonVariant: 'virtual-equipment-list',
      skeletonProps: { itemCount: 9 }
    }),

    UniversalCart: manager.createAsyncComponent({
      chunkName: 'UniversalCart',
      loader: () => import('@/components/cart/UniversalCart.vue'),
      priority: 'high',
      preload: true,
      skeletonVariant: 'universal-cart',
      skeletonProps: { itemCount: 3 }
    }),

    // Medium priority components
    VirtualProjectsList: manager.createAsyncComponent({
      chunkName: 'VirtualProjectsList',
      loader: () => import('@/components/projects/VirtualProjectsList.vue'),
      priority: 'medium',
      dependencies: ['VirtualEquipmentList'], // Depends on virtual scrolling
      skeletonVariant: 'virtual-projects-list',
      skeletonProps: { itemCount: 5 }
    }),

    // Low priority components (lazy loaded)
    ScannerComponent: manager.createAsyncComponent({
      chunkName: 'Scanner',
      loader: () => Promise.resolve({
        template: '<div class="p-4 text-center text-gray-500">Scanner component not available yet</div>'
      }),
      priority: 'low',
      skeletonVariant: 'scanner'
    }),

    // Demo components (development only)
    VirtualScrollingDemo: manager.createAsyncComponent({
      chunkName: 'VirtualScrollingDemo',
      loader: () => import('@/components/demo/VirtualScrollingDemo.vue'),
      priority: 'low',
      cache: import.meta.env.DEV, // Only cache in development
      skeletonVariant: 'virtual-equipment-list',
      skeletonProps: { itemCount: 12 }
    })
  }
}
