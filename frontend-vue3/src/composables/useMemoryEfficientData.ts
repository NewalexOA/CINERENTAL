/**
 * Memory-Efficient Data Management Composable
 * Provides optimized data structures and patterns for handling large datasets (845+ items)
 */
import { ref, computed, watch, onUnmounted, nextTick, type Ref } from 'vue'
import { useMemoryOptimization } from './useMemoryOptimization'

interface DataChunk<T> {
  data: T[]
  startIndex: number
  endIndex: number
  timestamp: number
  accessCount: number
}

interface PaginatedDataConfig<T> {
  pageSize: number
  maxCachedPages: number
  itemKeyExtractor: (item: T) => string | number
  memoryLimit?: number // MB
  ttl?: number // Time to live in milliseconds
}

interface IndexedDataStructure<T> {
  data: T[]
  indices: {
    byId: Map<string | number, T>
    byProperty: Map<string, Map<any, T[]>>
  }
  lastUpdated: number
}

/**
 * Memory-efficient paginated data management
 */
export function useMemoryEfficientPaginatedData<T>(
  config: PaginatedDataConfig<T>
) {
  const memoryOpt = useMemoryOptimization()

  const {
    pageSize,
    maxCachedPages,
    itemKeyExtractor,
    memoryLimit = 100,
    ttl = 10 * 60 * 1000 // 10 minutes default
  } = config

  const dataChunks = ref<Map<number, DataChunk<T>>>(new Map())
  const totalItems = ref(0)
  const currentPage = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Memory usage tracking
  const estimatedMemoryUsage = computed(() => {
    let totalSize = 0
    for (const chunk of dataChunks.value.values()) {
      totalSize += chunk.data.length * 0.5 // Estimate 0.5KB per item
    }
    return totalSize
  })

  // Clean up expired chunks
  const cleanupExpiredChunks = () => {
    const now = Date.now()
    for (const [pageNum, chunk] of dataChunks.value.entries()) {
      if (now - chunk.timestamp > ttl) {
        dataChunks.value.delete(pageNum)
      }
    }
  }

  // LRU eviction when memory limit exceeded
  const evictLeastRecentlyUsed = () => {
    if (dataChunks.value.size <= maxCachedPages) return

    const sortedChunks = Array.from(dataChunks.value.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount || a.timestamp - b.timestamp)

    const toEvict = sortedChunks.slice(0, sortedChunks.length - maxCachedPages)
    for (const [pageNum] of toEvict) {
      dataChunks.value.delete(pageNum)
    }
  }

  // Get data for specific page
  const getPageData = (pageNum: number): T[] => {
    const chunk = dataChunks.value.get(pageNum)
    if (chunk) {
      chunk.accessCount++
      return chunk.data
    }
    return []
  }

  // Set data for specific page
  const setPageData = (pageNum: number, data: T[]) => {
    const startIndex = pageNum * pageSize
    const endIndex = startIndex + data.length - 1

    dataChunks.value.set(pageNum, {
      data,
      startIndex,
      endIndex,
      timestamp: Date.now(),
      accessCount: 1
    })

    // Clean up if needed
    cleanupExpiredChunks()
    evictLeastRecentlyUsed()

    // Check memory usage and cleanup if needed
    if (estimatedMemoryUsage.value > memoryLimit) {
      memoryOpt.triggerMemoryCleanup()
      evictLeastRecentlyUsed()
    }
  }

  // Get visible data range
  const getVisibleData = (startIndex: number, endIndex: number): T[] => {
    const startPage = Math.floor(startIndex / pageSize)
    const endPage = Math.floor(endIndex / pageSize)

    let result: T[] = []

    for (let page = startPage; page <= endPage; page++) {
      const pageData = getPageData(page)
      if (pageData.length > 0) {
        const pageStart = page * pageSize
        const pageEnd = pageStart + pageData.length - 1

        // Calculate slice indices relative to the page
        const sliceStart = Math.max(0, startIndex - pageStart)
        const sliceEnd = Math.min(pageData.length, endIndex - pageStart + 1)

        result = result.concat(pageData.slice(sliceStart, sliceEnd))
      }
    }

    return result
  }

  // Find item by key across all cached pages
  const findItem = (key: string | number): T | null => {
    for (const chunk of dataChunks.value.values()) {
      const item = chunk.data.find(item => itemKeyExtractor(item) === key)
      if (item) {
        chunk.accessCount++
        return item
      }
    }
    return null
  }

  // Clear all cached data
  const clearCache = () => {
    dataChunks.value.clear()
    error.value = null
  }

  // Get cache statistics
  const getCacheStats = () => {
    return {
      cachedPages: dataChunks.value.size,
      totalCachedItems: Array.from(dataChunks.value.values())
        .reduce((sum, chunk) => sum + chunk.data.length, 0),
      estimatedMemoryMB: estimatedMemoryUsage.value,
      oldestCache: Math.min(...Array.from(dataChunks.value.values()).map(c => c.timestamp)),
      newestCache: Math.max(...Array.from(dataChunks.value.values()).map(c => c.timestamp))
    }
  }

  // Clean up on memory pressure
  const handleMemoryPressure = () => {
    const currentSize = dataChunks.value.size
    const targetSize = Math.floor(currentSize * 0.5) // Remove 50% of cached data

    evictLeastRecentlyUsed()

    if (import.meta.env.DEV) {
      console.log(`🧠 Paginated data: Reduced cache from ${currentSize} to ${dataChunks.value.size} pages`)
    }
  }

  // Setup memory pressure monitoring
  if (typeof window !== 'undefined') {
    window.addEventListener('memory-pressure-high', handleMemoryPressure)
  }

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('memory-pressure-high', handleMemoryPressure)
    }
  })

  return {
    // State
    totalItems,
    currentPage,
    loading,
    error,
    estimatedMemoryUsage,

    // Methods
    getPageData,
    setPageData,
    getVisibleData,
    findItem,
    clearCache,
    getCacheStats,
    cleanupExpiredChunks
  }
}

/**
 * Memory-efficient indexed data structure
 */
export function useMemoryEfficientIndexedData<T>() {
  const memoryOpt = useMemoryOptimization()

  const indexedData = ref<IndexedDataStructure<T>>({
    data: [],
    indices: {
      byId: new Map(),
      byProperty: new Map()
    },
    lastUpdated: Date.now()
  })

  const isLargeDataset = computed(() => indexedData.value.data.length > 1000)

  // Set data with automatic indexing
  const setData = (data: T[], idKey: keyof T) => {
    // Clear existing indices
    indexedData.value.indices.byId.clear()
    indexedData.value.indices.byProperty.clear()

    // Use memory-efficient array for large datasets
    if (data.length > 1000) {
      const efficientArray = memoryOpt.createMemoryEfficientArray<T>()
      data.forEach(item => efficientArray.push(item))
      indexedData.value.data = efficientArray.slice(0, efficientArray.length)
    } else {
      indexedData.value.data = [...data]
    }

    // Build ID index
    data.forEach(item => {
      const id = item[idKey] as string | number
      indexedData.value.indices.byId.set(id, item)
    })

    indexedData.value.lastUpdated = Date.now()
  }

  // Add index for a specific property
  const addPropertyIndex = (propertyKey: keyof T) => {
    const propertyMap = new Map<any, T[]>()

    indexedData.value.data.forEach(item => {
      const value = item[propertyKey]
      if (!propertyMap.has(value)) {
        propertyMap.set(value, [])
      }
      propertyMap.get(value)!.push(item)
    })

    indexedData.value.indices.byProperty.set(String(propertyKey), propertyMap)
  }

  // Get item by ID (O(1) lookup)
  const getById = (id: string | number): T | undefined => {
    return indexedData.value.indices.byId.get(id)
  }

  // Get items by property value (O(1) lookup after indexing)
  const getByProperty = (propertyKey: keyof T, value: any): T[] => {
    const propertyMap = indexedData.value.indices.byProperty.get(String(propertyKey))
    return propertyMap?.get(value) || []
  }

  // Memory-efficient filtering
  const filter = (predicate: (item: T) => boolean): T[] => {
    if (isLargeDataset.value) {
      // Process in chunks for large datasets
      const chunks = memoryOpt.createMemoryEfficientChunks(indexedData.value.data, 100)
      const results: T[] = []

      for (const chunk of chunks) {
        const filtered = chunk.filter(predicate)
        results.push(...filtered)

        // Yield to event loop periodically
        if (results.length % 500 === 0) {
          nextTick()
        }
      }

      return results
    } else {
      return indexedData.value.data.filter(predicate)
    }
  }

  // Memory-efficient search
  const search = (searchTerm: string, searchKeys: (keyof T)[]): T[] => {
    const term = searchTerm.toLowerCase()

    return filter(item => {
      return searchKeys.some(key => {
        const value = item[key]
        return String(value).toLowerCase().includes(term)
      })
    })
  }

  // Clear all data and indices
  const clear = () => {
    indexedData.value.data = []
    indexedData.value.indices.byId.clear()
    indexedData.value.indices.byProperty.clear()
    indexedData.value.lastUpdated = Date.now()
  }

  // Get statistics about the indexed data
  const getStats = () => {
    return {
      totalItems: indexedData.value.data.length,
      indicesCount: indexedData.value.indices.byProperty.size + 1, // +1 for ID index
      lastUpdated: indexedData.value.lastUpdated,
      memoryEstimate: indexedData.value.data.length * 0.5, // KB
      isLargeDataset: isLargeDataset.value
    }
  }

  return {
    // State
    indexedData: computed(() => indexedData.value),
    isLargeDataset,

    // Methods
    setData,
    addPropertyIndex,
    getById,
    getByProperty,
    filter,
    search,
    clear,
    getStats
  }
}

/**
 * Memory-efficient batch operations for large datasets
 */
export function useMemoryEfficientBatchOperations<T>() {
  const memoryOpt = useMemoryOptimization()

  const processBatch = async <R>(
    items: T[],
    operation: (batch: T[]) => Promise<R[]>,
    batchSize: number = 50,
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> => {
    const results: R[] = []
    const chunks = memoryOpt.createMemoryEfficientChunks(items, batchSize)

    let processedCount = 0

    for (const chunk of chunks) {
      try {
        const batchResults = await operation(chunk)
        results.push(...batchResults)

        processedCount += chunk.length
        onProgress?.(processedCount, items.length)

        // Yield to event loop to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0))

      } catch (error) {
        console.error('Batch operation failed:', error)
        throw error
      }
    }

    return results
  }

  const processSequentially = async <R>(
    items: T[],
    operation: (item: T, index: number) => Promise<R>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> => {
    const results: R[] = []

    for (let i = 0; i < items.length; i++) {
      try {
        const result = await operation(items[i], i)
        results.push(result)

        onProgress?.(i + 1, items.length)

        // Yield every 10 items to prevent blocking
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0))
        }

      } catch (error) {
        console.error(`Sequential operation failed at index ${i}:`, error)
        throw error
      }
    }

    return results
  }

  const deduplicate = (
    items: T[],
    keyExtractor: (item: T) => string | number
  ): T[] => {
    if (items.length <= 100) {
      // Simple deduplication for small arrays
      const seen = new Set<string | number>()
      return items.filter(item => {
        const key = keyExtractor(item)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    // Memory-efficient deduplication for large arrays
    const chunks = memoryOpt.createMemoryEfficientChunks(items, 1000)
    const seen = new Set<string | number>()
    const results: T[] = []

    for (const chunk of chunks) {
      const uniqueInChunk = chunk.filter(item => {
        const key = keyExtractor(item)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      results.push(...uniqueInChunk)
    }

    return results
  }

  return {
    processBatch,
    processSequentially,
    deduplicate
  }
}

/**
 * Memory-efficient reactive list with virtual operations
 */
export function useMemoryEfficientReactiveList<T>(
  initialData: T[] = [],
  keyExtractor: (item: T) => string | number
) {
  const memoryOpt = useMemoryOptimization()

  // Use memory-aware ref
  const items = memoryOpt.createMemoryAwareRef<T[]>(
    initialData,
    50, // 50MB limit
    (items) => {
      if (items.length > 2000) {
        console.log('🗂️ Reactive list: Reducing size due to memory pressure')
        return items.slice(-1000) // Keep most recent 1000 items
      }
      return items
    }
  )

  // Optimized operations
  const virtualOperations = {
    // Add items with memory check
    push: (...newItems: T[]) => {
      const currentMemory = memoryOpt.getCurrentMemoryUsage()

      if (currentMemory > 80 && items.value.length > 1000) {
        // Remove old items to make space
        items.value = items.value.slice(-(1000 - newItems.length))
      }

      items.value.push(...newItems)
    },

    // Memory-efficient find
    find: (predicate: (item: T) => boolean): T | undefined => {
      if (items.value.length <= 100) {
        return items.value.find(predicate)
      }

      // Search in chunks to avoid blocking
      const chunks = memoryOpt.createMemoryEfficientChunks(items.value, 100)
      for (const chunk of chunks) {
        const found = chunk.find(predicate)
        if (found) return found
      }
      return undefined
    },

    // Memory-efficient filter
    filter: (predicate: (item: T) => boolean): T[] => {
      if (items.value.length <= 100) {
        return items.value.filter(predicate)
      }

      const chunks = memoryOpt.createMemoryEfficientChunks(items.value, 100)
      const results: T[] = []

      for (const chunk of chunks) {
        const filtered = chunk.filter(predicate)
        results.push(...filtered)
      }

      return results
    },

    // Remove by key with memory optimization
    removeByKey: (key: string | number): boolean => {
      const index = items.value.findIndex(item => keyExtractor(item) === key)
      if (index !== -1) {
        items.value.splice(index, 1)
        return true
      }
      return false
    },

    // Update by key
    updateByKey: (key: string | number, updater: (item: T) => T): boolean => {
      const index = items.value.findIndex(item => keyExtractor(item) === key)
      if (index !== -1) {
        items.value[index] = updater(items.value[index])
        return true
      }
      return false
    },

    // Clear with memory cleanup
    clear: () => {
      items.value = []
      memoryOpt.triggerMemoryCleanup()
    }
  }

  return {
    items: computed(() => items.value),
    size: computed(() => items.value.length),
    isEmpty: computed(() => items.value.length === 0),
    ...virtualOperations
  }
}
