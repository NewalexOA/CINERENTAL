/**
 * Vue Render Optimization Composable
 * Provides intelligent v-memo, computed caching, and reactivity optimizations
 */

import {
  ref,
  computed,
  shallowRef,
  shallowReactive,
  readonly,
  watchEffect,
  nextTick,
  onBeforeUnmount,
  type Ref,
  type ComputedRef,
  type UnwrapRef
} from 'vue'

interface MemoConfig {
  maxSize?: number
  ttl?: number
  deepEqual?: boolean
}

interface RenderMetrics {
  computedCacheHits: number
  computedCacheMisses: number
  memoizedRenders: number
  skippedRenders: number
  totalRenders: number
}

/**
 * Advanced render optimization with intelligent memoization
 */
export function useRenderOptimization() {
  const metrics = ref<RenderMetrics>({
    computedCacheHits: 0,
    computedCacheMisses: 0,
    memoizedRenders: 0,
    skippedRenders: 0,
    totalRenders: 0
  })

  /**
   * Create memoized computed with intelligent caching
   */
  const createMemoizedComputed = <T>(
    getter: () => T,
    config: MemoConfig = {}
  ): ComputedRef<T> => {
    const { maxSize = 10, ttl = 60000, deepEqual = false } = config
    const cache = new Map<string, { value: T; timestamp: number; hits: number }>()
    let lastDeps: any[] = []

    return computed(() => {
      const currentDeps = getCurrentDependencies()
      const depsKey = createDepsKey(currentDeps, deepEqual)

      // Check cache
      const cached = cache.get(depsKey)
      const now = Date.now()

      if (cached && (now - cached.timestamp) < ttl) {
        cached.hits++
        metrics.value.computedCacheHits++
        return cached.value
      }

      // Compute new value
      const value = getter()
      metrics.value.computedCacheMisses++

      // Update cache with LRU eviction
      if (cache.size >= maxSize) {
        const oldestKey = Array.from(cache.keys())[0]
        cache.delete(oldestKey)
      }

      cache.set(depsKey, { value, timestamp: now, hits: 1 })
      lastDeps = currentDeps

      return value
    })
  }

  /**
   * Create shallow reactive for better performance with large objects
   */
  const createShallowState = <T extends Record<string, any>>(
    initialState: T
  ): UnwrapRef<T> => {
    return shallowReactive(initialState)
  }

  /**
   * Create optimized ref that uses shallow comparison
   */
  const createOptimizedRef = <T>(initialValue: T): Ref<T> => {
    const internalRef = shallowRef(initialValue)

    return computed({
      get: () => internalRef.value,
      set: (newValue: T) => {
        // Only update if value actually changed (shallow comparison)
        if (newValue !== internalRef.value) {
          internalRef.value = newValue
        }
      }
    })
  }

  /**
   * Memoize component props for v-memo optimization
   */
  const createMemoizedProps = <T extends Record<string, any>>(
    props: T,
    dependencies: (keyof T)[] = Object.keys(props) as (keyof T)[]
  ) => {
    const memoKey = computed(() => {
      return dependencies.map(key => props[key])
    })

    const lastMemoKey = ref<any[]>([])
    const shouldUpdate = computed(() => {
      const current = memoKey.value
      const last = lastMemoKey.value

      if (current.length !== last.length) {
        lastMemoKey.value = current
        return true
      }

      const changed = current.some((val, index) => {
        return !Object.is(val, last[index])
      })

      if (changed) {
        lastMemoKey.value = current
        metrics.value.memoizedRenders++
      } else {
        metrics.value.skippedRenders++
      }

      return changed
    })

    return {
      memoKey: readonly(memoKey),
      shouldUpdate: readonly(shouldUpdate)
    }
  }

  /**
   * Create smart list key generator for optimal v-for performance
   */
  const createListKeys = <T>(
    items: T[],
    keyExtractor?: (item: T, index: number) => string | number,
    stableSort: boolean = false
  ) => {
    const keyCache = new Map<T, string | number>()
    let keyCounter = 0

    const getItemKey = (item: T, index: number): string | number => {
      if (keyExtractor) {
        return keyExtractor(item, index)
      }

      // Use cached key if available
      if (keyCache.has(item)) {
        return keyCache.get(item)!
      }

      // Generate stable key
      const key = `item-${keyCounter++}`
      keyCache.set(item, key)

      return key
    }

    const keys = computed(() => {
      const result = items.map(getItemKey)

      // Clear cache for items no longer in list
      const currentItems = new Set(items)
      for (const [item] of keyCache.entries()) {
        if (!currentItems.has(item)) {
          keyCache.delete(item)
        }
      }

      return result
    })

    return {
      keys: readonly(keys),
      getItemKey,
      clearCache: () => keyCache.clear()
    }
  }

  /**
   * Debounced reactive value for expensive operations
   */
  const createDebouncedRef = <T>(
    initialValue: T,
    delay: number = 300
  ): Ref<T> => {
    const immediate = ref(initialValue)
    const debounced = ref(initialValue)
    let timeoutId: number | null = null

    watchEffect(() => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(() => {
        debounced.value = immediate.value
        timeoutId = null
      }, delay)
    })

    return computed({
      get: () => debounced.value,
      set: (value: T) => {
        immediate.value = value
      }
    })
  }

  /**
   * Batch reactive updates to prevent excessive re-renders
   */
  const createBatchedUpdates = () => {
    const updateQueue = new Map<string, () => void>()
    let flushScheduled = false

    const scheduleUpdate = (key: string, update: () => void) => {
      updateQueue.set(key, update)

      if (!flushScheduled) {
        flushScheduled = true
        nextTick(() => {
          const updates = Array.from(updateQueue.values())
          updateQueue.clear()
          flushScheduled = false

          // Execute all updates in single batch
          updates.forEach(update => update())
        })
      }
    }

    return { scheduleUpdate }
  }

  /**
   * Smart computed that only recalculates when specific dependencies change
   */
  const createSelectiveComputed = <T, D extends any[]>(
    dependencies: () => D,
    computer: (deps: D) => T,
    isEqual: (a: D, b: D) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  ): ComputedRef<T> => {
    let lastDeps: D | undefined
    let lastResult: T
    let initialized = false

    return computed(() => {
      const currentDeps = dependencies()

      if (!initialized || (lastDeps && !isEqual(currentDeps, lastDeps))) {
        lastResult = computer(currentDeps)
        lastDeps = currentDeps
        initialized = true
      }

      return lastResult
    })
  }

  /**
   * Create render-optimized data structure for large lists
   */
  const createRenderOptimizedList = <T>(
    items: T[],
    renderWindowSize: number = 50
  ) => {
    const visibleRange = ref({ start: 0, end: renderWindowSize })
    const allItems = shallowRef(items)

    const visibleItems = computed(() => {
      const { start, end } = visibleRange.value
      return allItems.value.slice(start, Math.min(end, allItems.value.length))
    })

    const totalHeight = computed(() => allItems.value.length * 50) // Assume 50px per item
    const offsetY = computed(() => visibleRange.value.start * 50)

    const updateVisibleRange = (scrollTop: number, containerHeight: number) => {
      const itemHeight = 50
      const start = Math.floor(scrollTop / itemHeight)
      const visibleCount = Math.ceil(containerHeight / itemHeight)
      const buffer = Math.floor(visibleCount / 2)

      visibleRange.value = {
        start: Math.max(0, start - buffer),
        end: Math.min(allItems.value.length, start + visibleCount + buffer)
      }
    }

    return {
      visibleItems: readonly(visibleItems),
      totalHeight: readonly(totalHeight),
      offsetY: readonly(offsetY),
      updateVisibleRange,
      setItems: (newItems: T[]) => {
        allItems.value = newItems
      }
    }
  }

  /**
   * Intelligent component update prevention
   */
  const createUpdateGate = (
    shouldUpdate: () => boolean,
    updateCallback: () => void
  ) => {
    let lastUpdateTime = 0
    const minUpdateInterval = 16 // 60fps

    const gatedUpdate = () => {
      const now = performance.now()

      if (now - lastUpdateTime < minUpdateInterval) {
        return // Skip update if too frequent
      }

      if (shouldUpdate()) {
        updateCallback()
        lastUpdateTime = now
        metrics.value.totalRenders++
      } else {
        metrics.value.skippedRenders++
      }
    }

    return gatedUpdate
  }

  /**
   * Memory-efficient object comparison for v-memo
   */
  const createDeepEqualityCheck = <T>(
    maxDepth: number = 3,
    maxProperties: number = 10
  ) => {
    const compare = (a: T, b: T, depth: number = 0): boolean => {
      if (depth > maxDepth) return a === b
      if (a === b) return true
      if (a == null || b == null) return a === b
      if (typeof a !== typeof b) return false

      if (typeof a === 'object') {
        const keysA = Object.keys(a).slice(0, maxProperties)
        const keysB = Object.keys(b).slice(0, maxProperties)

        if (keysA.length !== keysB.length) return false

        return keysA.every(key =>
          keysB.includes(key) &&
          compare((a as any)[key], (b as any)[key], depth + 1)
        )
      }

      return false
    }

    return compare
  }

  /**
   * Performance-aware reactive state
   */
  const createPerformantState = <T extends Record<string, any>>(
    initialState: T,
    options: {
      shallow?: boolean
      debounce?: number
      batchUpdates?: boolean
    } = {}
  ) => {
    const { shallow = false, debounce = 0, batchUpdates = true } = options

    let state = shallow ? shallowReactive(initialState) : reactive(initialState)

    if (debounce > 0) {
      const debouncedState = ref(state)
      let timeoutId: number | null = null

      watchEffect(() => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = window.setTimeout(() => {
          debouncedState.value = { ...state }
        }, debounce)
      })

      return readonly(debouncedState)
    }

    if (batchUpdates) {
      const { scheduleUpdate } = createBatchedUpdates()

      return new Proxy(state, {
        set(target, key, value) {
          scheduleUpdate(String(key), () => {
            target[key] = value
          })
          return true
        }
      })
    }

    return readonly(state)
  }

  // Utility functions
  const getCurrentDependencies = (): any[] => {
    // This is a simplified implementation
    // In a real scenario, you'd track the current reactive dependencies
    return []
  }

  const createDepsKey = (deps: any[], deepEqual: boolean): string => {
    if (deepEqual) {
      return JSON.stringify(deps)
    }
    return deps.map(dep => String(dep)).join('|')
  }

  // Cleanup
  onBeforeUnmount(() => {
    // Clear any pending timers or cleanup
  })

  return {
    // Memoization utilities
    createMemoizedComputed,
    createMemoizedProps,
    createSelectiveComputed,

    // State management
    createShallowState,
    createOptimizedRef,
    createDebouncedRef,
    createPerformantState,

    // List optimization
    createListKeys,
    createRenderOptimizedList,

    // Update control
    createBatchedUpdates,
    createUpdateGate,

    // Utilities
    createDeepEqualityCheck,

    // Metrics
    metrics: readonly(metrics)
  }
}

/**
 * Specialized hook for component memoization strategies
 */
export function useComponentMemoization<T extends Record<string, any>>(
  props: T,
  options: {
    keys?: (keyof T)[]
    deepEqual?: boolean
    updateThreshold?: number
  } = {}
) {
  const { keys = Object.keys(props) as (keyof T)[], deepEqual = false, updateThreshold = 0 } = options

  const renderOptimization = useRenderOptimization()
  const lastRenderTime = ref(0)

  const memoizedProps = renderOptimization.createMemoizedProps(props, keys)
  const deepEqual = renderOptimization.createDeepEqualityCheck()

  const shouldRender = computed(() => {
    const now = performance.now()
    const timeSinceLastRender = now - lastRenderTime.value

    // Throttle updates if updateThreshold is set
    if (updateThreshold > 0 && timeSinceLastRender < updateThreshold) {
      return false
    }

    const shouldUpdate = memoizedProps.shouldUpdate.value
    if (shouldUpdate) {
      lastRenderTime.value = now
    }

    return shouldUpdate
  })

  // Generate v-memo dependency array
  const memoArray = computed(() => {
    return keys.map(key => props[key])
  })

  return {
    shouldRender: readonly(shouldRender),
    memoArray: readonly(memoArray),
    memoKey: memoizedProps.memoKey
  }
}

/**
 * Performance-optimized list rendering hook
 */
export function useOptimizedListRendering<T>(
  items: Ref<T[]>,
  options: {
    keyExtractor?: (item: T, index: number) => string | number
    virtualScrolling?: boolean
    windowSize?: number
    itemHeight?: number
  } = {}
) {
  const { keyExtractor, virtualScrolling = false, windowSize = 50, itemHeight = 50 } = options

  const renderOpt = useRenderOptimization()
  const listKeys = renderOpt.createListKeys(items.value, keyExtractor)

  let renderOptimizedList: ReturnType<typeof renderOpt.createRenderOptimizedList> | null = null

  if (virtualScrolling) {
    renderOptimizedList = renderOpt.createRenderOptimizedList(items.value, windowSize)
  }

  const visibleItems = computed(() => {
    if (renderOptimizedList) {
      return renderOptimizedList.visibleItems.value
    }
    return items.value
  })

  const handleScroll = (scrollTop: number, containerHeight: number) => {
    if (renderOptimizedList) {
      renderOptimizedList.updateVisibleRange(scrollTop, containerHeight)
    }
  }

  // Update list when items change
  watchEffect(() => {
    if (renderOptimizedList) {
      renderOptimizedList.setItems(items.value)
    }
  })

  return {
    visibleItems: readonly(visibleItems),
    keys: listKeys.keys,
    getItemKey: listKeys.getItemKey,
    handleScroll,
    totalHeight: renderOptimizedList?.totalHeight,
    offsetY: renderOptimizedList?.offsetY,
    clearKeyCache: listKeys.clearCache
  }
}

import { reactive } from 'vue'
