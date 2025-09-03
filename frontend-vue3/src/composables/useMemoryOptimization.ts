/**
 * Memory Optimization Composable for Large Dataset Handling
 * Provides advanced memory management patterns for 845+ equipment items
 */
import { ref, onMounted, onUnmounted, watch, computed, nextTick, type Ref } from 'vue'
import { performanceMonitor } from '@/utils/performance'

interface MemoryPressureMetrics {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  pressureLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
}

interface ObjectPoolConfig {
  initialSize: number
  maxSize: number
  factory: () => any
  reset?: (obj: any) => void
}

class ObjectPool<T> {
  private available: T[] = []
  private inUse = new Set<T>()
  private factory: () => T
  private reset?: (obj: T) => void
  private maxSize: number

  constructor(config: ObjectPoolConfig) {
    this.factory = config.factory
    this.reset = config.reset
    this.maxSize = config.maxSize

    // Pre-populate with initial objects
    for (let i = 0; i < config.initialSize; i++) {
      this.available.push(this.factory())
    }
  }

  acquire(): T {
    let obj: T

    if (this.available.length > 0) {
      obj = this.available.pop()!
    } else {
      obj = this.factory()
    }

    this.inUse.add(obj)
    return obj
  }

  release(obj: T): void {
    if (!this.inUse.has(obj)) return

    this.inUse.delete(obj)

    // Reset object state if reset function provided
    if (this.reset) {
      this.reset(obj)
    }

    // Only return to pool if under max size
    if (this.available.length < this.maxSize) {
      this.available.push(obj)
    }
  }

  getStats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    }
  }

  clear(): void {
    this.available.length = 0
    this.inUse.clear()
  }
}

// WeakMap for component-specific memory tracking
const componentMemoryUsage = new WeakMap<any, number>()
const memoryCleanupCallbacks = new WeakMap<any, Function[]>()

export function useMemoryOptimization() {
  const isSupported = ref(false)
  const currentMemoryPressure = ref<MemoryPressureMetrics | null>(null)
  const isMemoryPressureHigh = computed(() =>
    currentMemoryPressure.value?.pressureLevel === 'high' ||
    currentMemoryPressure.value?.pressureLevel === 'critical'
  )

  let memoryMonitorInterval: number | null = null
  let pressureCheckInterval: number | null = null
  let gcSuggestTimeout: number | null = null

  // Object pools for commonly created/destroyed objects
  const equipmentCardPool = new ObjectPool({
    initialSize: 50,
    maxSize: 200,
    factory: () => ({
      id: 0,
      name: '',
      category: '',
      status: '',
      visible: false,
      cached: false
    }),
    reset: (obj) => {
      obj.id = 0
      obj.name = ''
      obj.category = ''
      obj.status = ''
      obj.visible = false
      obj.cached = false
    }
  })

  const virtualItemPool = new ObjectPool({
    initialSize: 20,
    maxSize: 100,
    factory: () => ({
      index: -1,
      start: 0,
      size: 0,
      key: '',
      data: null
    }),
    reset: (obj) => {
      obj.index = -1
      obj.start = 0
      obj.size = 0
      obj.key = ''
      obj.data = null
    }
  })

  onMounted(() => {
    checkMemoryAPISupport()
    startMemoryMonitoring()
  })

  onUnmounted(() => {
    stopMemoryMonitoring()
    cleanupObjectPools()
  })

  function checkMemoryAPISupport(): void {
    isSupported.value = 'memory' in performance && typeof (performance as any).memory === 'object'
  }

  function startMemoryMonitoring(): void {
    if (!isSupported.value) return

    // Monitor memory usage every 5 seconds
    memoryMonitorInterval = window.setInterval(() => {
      updateMemoryMetrics()
    }, 5000)

    // Check for memory pressure every 2 seconds
    pressureCheckInterval = window.setInterval(() => {
      checkMemoryPressure()
    }, 2000)
  }

  function stopMemoryMonitoring(): void {
    if (memoryMonitorInterval) {
      clearInterval(memoryMonitorInterval)
      memoryMonitorInterval = null
    }
    if (pressureCheckInterval) {
      clearInterval(pressureCheckInterval)
      pressureCheckInterval = null
    }
    if (gcSuggestTimeout) {
      clearTimeout(gcSuggestTimeout)
      gcSuggestTimeout = null
    }
  }

  function updateMemoryMetrics(): void {
    if (!isSupported.value) return

    const memory = (performance as any).memory
    const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
    const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024)
    const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)

    // Calculate pressure level
    const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit
    let pressureLevel: MemoryPressureMetrics['pressureLevel'] = 'low'
    let recommendation = 'Memory usage is optimal'

    if (usageRatio > 0.9) {
      pressureLevel = 'critical'
      recommendation = 'Critical: Consider immediate cleanup and data reduction'
    } else if (usageRatio > 0.75) {
      pressureLevel = 'high'
      recommendation = 'High: Reduce data sets and trigger cleanup'
    } else if (usageRatio > 0.5) {
      pressureLevel = 'medium'
      recommendation = 'Medium: Consider lazy loading and data pagination'
    }

    currentMemoryPressure.value = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      pressureLevel,
      recommendation
    }

    // Log in development
    if (import.meta.env.DEV && pressureLevel !== 'low') {
      console.warn(`🧠 Memory Pressure [${pressureLevel}]: ${usedMB}MB/${limitMB}MB (${Math.round(usageRatio * 100)}%)`)
      console.warn(`💡 ${recommendation}`)
    }
  }

  function checkMemoryPressure(): void {
    if (!isSupported.value || !currentMemoryPressure.value) return

    const { pressureLevel } = currentMemoryPressure.value

    // Trigger automatic cleanup on high memory pressure
    if (pressureLevel === 'high' || pressureLevel === 'critical') {
      triggerMemoryCleanup()

      // Suggest garbage collection on critical pressure
      if (pressureLevel === 'critical' && !gcSuggestTimeout) {
        gcSuggestTimeout = window.setTimeout(() => {
          suggestGarbageCollection()
          gcSuggestTimeout = null
        }, 1000)
      }
    }
  }

  function triggerMemoryCleanup(): void {
    // Clear expired caches
    clearExpiredCaches()

    // Clean object pools
    equipmentCardPool.clear()
    virtualItemPool.clear()

    // Notify components to cleanup
    window.dispatchEvent(new CustomEvent('memory-pressure-high', {
      detail: currentMemoryPressure.value
    }))

    if (import.meta.env.DEV) {
      console.log('🧹 Memory cleanup triggered due to high pressure')
    }
  }

  function suggestGarbageCollection(): void {
    // Force garbage collection in development (Chrome DevTools)
    if (import.meta.env.DEV && 'gc' in window) {
      try {
        (window as any).gc()
        console.log('🗑️ Manual garbage collection triggered')
      } catch (error) {
        console.log('🗑️ GC not available (enable --expose-gc in Chrome)')
      }
    }
  }

  function clearExpiredCaches(): void {
    // Clear expired items from various caches
    const now = Date.now()
    const TTL = 5 * 60 * 1000 // 5 minutes

    // Clear session storage expired items
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('cache_')) {
        try {
          const item = JSON.parse(sessionStorage.getItem(key) || '{}')
          if (item.timestamp && (now - item.timestamp) > TTL) {
            sessionStorage.removeItem(key)
          }
        } catch (error) {
          sessionStorage.removeItem(key)
        }
      }
    })
  }

  function cleanupObjectPools(): void {
    equipmentCardPool.clear()
    virtualItemPool.clear()
  }

  /**
   * Memory-efficient data chunking for large datasets
   */
  function createMemoryEfficientChunks<T>(
    data: T[],
    chunkSize: number = 100,
    maxMemoryMB: number = 50
  ): T[][] {
    const chunks: T[][] = []
    const currentMemoryMB = getCurrentMemoryUsage()

    // Adjust chunk size based on memory pressure
    if (currentMemoryMB > maxMemoryMB) {
      chunkSize = Math.max(20, Math.floor(chunkSize * 0.5))
    }

    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize))
    }

    return chunks
  }

  /**
   * WeakRef-based cache for memory-sensitive caching
   */
  function createWeakCache<K extends object, V>() {
    const cache = new Map<K, WeakRef<V>>()
    const finalizer = new FinalizationRegistry((key: K) => {
      cache.delete(key)
    })

    return {
      set(key: K, value: V): void {
        cache.set(key, new WeakRef(value))
        finalizer.register(value, key)
      },

      get(key: K): V | undefined {
        const ref = cache.get(key)
        if (!ref) return undefined

        const value = ref.deref()
        if (!value) {
          cache.delete(key)
          return undefined
        }

        return value
      },

      has(key: K): boolean {
        const ref = cache.get(key)
        if (!ref) return false

        const value = ref.deref()
        if (!value) {
          cache.delete(key)
          return false
        }

        return true
      },

      delete(key: K): boolean {
        return cache.delete(key)
      },

      clear(): void {
        cache.clear()
      },

      size(): number {
        // Clean up dead references
        for (const [key, ref] of cache.entries()) {
          if (!ref.deref()) {
            cache.delete(key)
          }
        }
        return cache.size
      }
    }
  }

  /**
   * Component memory tracking
   */
  function trackComponentMemory(component: any, initialSize: number): void {
    componentMemoryUsage.set(component, initialSize)
  }

  function updateComponentMemory(component: any, newSize: number): void {
    componentMemoryUsage.set(component, newSize)
  }

  function getComponentMemory(component: any): number {
    return componentMemoryUsage.get(component) || 0
  }

  /**
   * Register cleanup callback for component
   */
  function registerCleanupCallback(component: any, callback: Function): void {
    let callbacks = memoryCleanupCallbacks.get(component)
    if (!callbacks) {
      callbacks = []
      memoryCleanupCallbacks.set(component, callbacks)
    }
    callbacks.push(callback)
  }

  /**
   * Trigger cleanup callbacks for component
   */
  function triggerComponentCleanup(component: any): void {
    const callbacks = memoryCleanupCallbacks.get(component)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('Error in memory cleanup callback:', error)
        }
      })
    }
  }

  /**
   * Get current memory usage in MB
   */
  function getCurrentMemoryUsage(): number {
    if (!isSupported.value) return 0
    return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
  }

  /**
   * Memory-efficient array operations
   */
  function createMemoryEfficientArray<T>() {
    const chunks: T[][] = []
    const chunkSize = 1000
    let totalLength = 0

    return {
      push(...items: T[]): void {
        for (const item of items) {
          if (chunks.length === 0 || chunks[chunks.length - 1].length >= chunkSize) {
            chunks.push([])
          }
          chunks[chunks.length - 1].push(item)
          totalLength++
        }
      },

      get(index: number): T | undefined {
        const chunkIndex = Math.floor(index / chunkSize)
        const itemIndex = index % chunkSize
        return chunks[chunkIndex]?.[itemIndex]
      },

      slice(start: number, end?: number): T[] {
        const result: T[] = []
        const actualEnd = end ?? totalLength

        for (let i = start; i < actualEnd; i++) {
          const item = this.get(i)
          if (item !== undefined) {
            result.push(item)
          }
        }

        return result
      },

      get length(): number {
        return totalLength
      },

      clear(): void {
        chunks.length = 0
        totalLength = 0
      }
    }
  }

  /**
   * Create memory-aware reactive data with automatic cleanup
   */
  function createMemoryAwareRef<T>(
    initialValue: T,
    maxMemoryMB: number = 100,
    cleanupCallback?: (value: T) => void
  ): Ref<T> {
    const reactiveRef = ref(initialValue)

    // Watch for memory pressure and trigger cleanup if needed
    watch(
      [reactiveRef, currentMemoryPressure],
      ([newValue, pressure]) => {
        if (pressure && pressure.pressureLevel === 'high') {
          if (cleanupCallback) {
            cleanupCallback(newValue)
          }
        }
      },
      { deep: true }
    )

    return reactiveRef
  }

  return {
    // State
    isSupported: computed(() => isSupported.value),
    currentMemoryPressure: computed(() => currentMemoryPressure.value),
    isMemoryPressureHigh,

    // Memory monitoring
    updateMemoryMetrics,
    getCurrentMemoryUsage,

    // Object pools
    equipmentCardPool,
    virtualItemPool,

    // Memory-efficient operations
    createMemoryEfficientChunks,
    createMemoryEfficientArray,
    createWeakCache,
    createMemoryAwareRef,

    // Component tracking
    trackComponentMemory,
    updateComponentMemory,
    getComponentMemory,
    registerCleanupCallback,
    triggerComponentCleanup,

    // Cleanup operations
    triggerMemoryCleanup,
    clearExpiredCaches,
    cleanupObjectPools
  }
}

/**
 * Memory-optimized virtual scrolling utilities
 */
export function useVirtualScrollingMemoryOptimization() {
  const memoryOpt = useMemoryOptimization()

  // Item recycling for virtual scrolling
  const recycledItems = new Map<string, any>()
  const maxRecycledItems = 100

  function recycleVirtualItem(key: string, item: any): void {
    if (recycledItems.size < maxRecycledItems) {
      recycledItems.set(key, item)
    }
  }

  function getRecycledVirtualItem(key: string): any | null {
    return recycledItems.get(key) || null
  }

  function clearRecycledItems(): void {
    recycledItems.clear()
  }

  // Memory-aware overscan calculation
  function calculateMemoryAwareOverscan(
    containerHeight: number,
    itemHeight: number,
    baseOverscan: number = 3
  ): number {
    const currentMemory = memoryOpt.getCurrentMemoryUsage()

    // Reduce overscan if memory usage is high
    if (currentMemory > 80) {
      return Math.max(1, Math.floor(baseOverscan * 0.5))
    } else if (currentMemory > 50) {
      return Math.max(2, Math.floor(baseOverscan * 0.75))
    }

    return baseOverscan
  }

  // Chunked data loading for virtual scrolling
  function createChunkedVirtualData<T>(
    data: T[],
    chunkSize: number = 50
  ) {
    const chunks = memoryOpt.createMemoryEfficientChunks(data, chunkSize)
    const loadedChunks = new Set<number>()

    return {
      getChunk(chunkIndex: number): T[] {
        if (!loadedChunks.has(chunkIndex)) {
          loadedChunks.add(chunkIndex)
          // Simulate async loading
          return chunks[chunkIndex] || []
        }
        return chunks[chunkIndex] || []
      },

      unloadChunk(chunkIndex: number): void {
        loadedChunks.delete(chunkIndex)
      },

      getVisibleChunks(startIndex: number, endIndex: number): T[] {
        const startChunk = Math.floor(startIndex / chunkSize)
        const endChunk = Math.floor(endIndex / chunkSize)

        let items: T[] = []
        for (let i = startChunk; i <= endChunk; i++) {
          items = items.concat(this.getChunk(i))
        }

        return items.slice(
          startIndex - startChunk * chunkSize,
          endIndex - startChunk * chunkSize + 1
        )
      },

      getTotalSize(): number {
        return data.length
      }
    }
  }

  return {
    recycleVirtualItem,
    getRecycledVirtualItem,
    clearRecycledItems,
    calculateMemoryAwareOverscan,
    createChunkedVirtualData
  }
}
