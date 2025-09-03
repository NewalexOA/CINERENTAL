/**
 * DOM Optimization Composable for High-Performance Vue Components
 * Provides batched DOM updates, intelligent memoization, and GPU acceleration
 */

import { ref, computed, nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

interface DOMUpdateTask {
  id: string
  priority: 'high' | 'medium' | 'low'
  callback: () => void
  timestamp: number
  retries?: number
}

interface BatchUpdateConfig {
  batchSize?: number
  flushInterval?: number
  maxRetries?: number
  enablePriority?: boolean
}

interface ElementPool<T> {
  elements: T[]
  factory: () => T
  reset: (element: T) => void
  maxSize: number
}

/**
 * Advanced DOM optimization composable
 */
export function useDOMOptimization(config: BatchUpdateConfig = {}) {
  const {
    batchSize = 10,
    flushInterval = 16, // ~60fps
    maxRetries = 3,
    enablePriority = true
  } = config

  // State
  const updateQueue = ref<DOMUpdateTask[]>([])
  const isProcessing = ref(false)
  const frameId = ref<number | null>(null)
  const metrics = ref({
    totalUpdates: 0,
    batchedUpdates: 0,
    averageFlushTime: 0,
    queueSize: 0
  })

  let flushTimer: number | null = null
  let lastFlushTime = 0

  /**
   * Schedule DOM update with intelligent batching
   */
  const scheduleUpdate = (
    id: string,
    callback: () => void,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void => {
    // Remove existing task with same ID to prevent duplicates
    const existingIndex = updateQueue.value.findIndex(task => task.id === id)
    if (existingIndex !== -1) {
      updateQueue.value.splice(existingIndex, 1)
    }

    const task: DOMUpdateTask = {
      id,
      priority,
      callback,
      timestamp: performance.now(),
      retries: 0
    }

    updateQueue.value.push(task)
    metrics.value.queueSize = updateQueue.value.length

    // Sort by priority if enabled
    if (enablePriority) {
      updateQueue.value.sort((a, b) => {
        const priorities = { high: 3, medium: 2, low: 1 }
        return priorities[b.priority] - priorities[a.priority]
      })
    }

    // Schedule flush if not already processing
    if (!isProcessing.value) {
      scheduleFlush()
    }
  }

  /**
   * Schedule flush using requestAnimationFrame for optimal timing
   */
  const scheduleFlush = (): void => {
    if (frameId.value) return

    // Use RAF for smooth updates aligned with display refresh
    frameId.value = requestAnimationFrame(() => {
      flushUpdates()
      frameId.value = null
    })
  }

  /**
   * Process queued updates with batching and error handling
   */
  const flushUpdates = async (): Promise<void> => {
    if (isProcessing.value || updateQueue.value.length === 0) return

    isProcessing.value = true
    const startTime = performance.now()
    const batch = updateQueue.value.splice(0, batchSize)
    const failedTasks: DOMUpdateTask[] = []

    // Process batch with error handling
    for (const task of batch) {
      try {
        task.callback()
        metrics.value.totalUpdates++
      } catch (error) {
        console.error(`DOM update task '${task.id}' failed:`, error)

        // Retry failed tasks up to maxRetries
        task.retries = (task.retries || 0) + 1
        if (task.retries < maxRetries) {
          failedTasks.push(task)
        }
      }
    }

    // Re-queue failed tasks
    if (failedTasks.length > 0) {
      updateQueue.value.unshift(...failedTasks)
    }

    // Update metrics
    metrics.value.batchedUpdates++
    const flushTime = performance.now() - startTime
    metrics.value.averageFlushTime =
      (metrics.value.averageFlushTime * (metrics.value.batchedUpdates - 1) + flushTime) /
      metrics.value.batchedUpdates
    metrics.value.queueSize = updateQueue.value.length

    // Wait for DOM updates to complete
    await nextTick()

    isProcessing.value = false

    // Continue processing if queue not empty
    if (updateQueue.value.length > 0) {
      scheduleFlush()
    }
  }

  /**
   * Force immediate flush of all pending updates
   */
  const forceFlush = async (): Promise<void> => {
    if (frameId.value) {
      cancelAnimationFrame(frameId.value)
      frameId.value = null
    }

    while (updateQueue.value.length > 0 && !isProcessing.value) {
      await flushUpdates()
    }
  }

  /**
   * Clear all pending updates
   */
  const clearQueue = (): void => {
    updateQueue.value.length = 0
    metrics.value.queueSize = 0

    if (frameId.value) {
      cancelAnimationFrame(frameId.value)
      frameId.value = null
    }
  }

  /**
   * Create element pool for DOM element recycling
   */
  const createElementPool = <T>(
    factory: () => T,
    reset: (element: T) => void,
    maxSize: number = 50
  ): ElementPool<T> => {
    const pool: ElementPool<T> = {
      elements: [],
      factory,
      reset,
      maxSize
    }

    // Pre-populate pool
    for (let i = 0; i < Math.min(10, maxSize); i++) {
      pool.elements.push(factory())
    }

    return pool
  }

  /**
   * Get element from pool or create new one
   */
  const acquireElement = <T>(pool: ElementPool<T>): T => {
    if (pool.elements.length > 0) {
      return pool.elements.pop()!
    }
    return pool.factory()
  }

  /**
   * Return element to pool for reuse
   */
  const releaseElement = <T>(pool: ElementPool<T>, element: T): void => {
    if (pool.elements.length < pool.maxSize) {
      pool.reset(element)
      pool.elements.push(element)
    }
  }

  /**
   * Batch DOM style updates to reduce layout thrashing
   */
  const batchStyleUpdates = (
    element: HTMLElement,
    styles: Record<string, string>,
    useTransform: boolean = true
  ): void => {
    scheduleUpdate(`style-${element.id || Math.random()}`, () => {
      // Use transform for GPU acceleration when possible
      if (useTransform && ('transform' in styles || 'opacity' in styles)) {
        element.style.willChange = 'transform, opacity'
      }

      // Apply all styles at once to minimize reflows
      Object.assign(element.style, styles)

      // Clean up will-change after animation
      if (useTransform) {
        requestAnimationFrame(() => {
          element.style.willChange = 'auto'
        })
      }
    }, 'high')
  }

  /**
   * Batch class updates to reduce DOM manipulation
   */
  const batchClassUpdates = (
    element: HTMLElement,
    changes: { add?: string[]; remove?: string[]; toggle?: string[] }
  ): void => {
    scheduleUpdate(`class-${element.id || Math.random()}`, () => {
      if (changes.remove) {
        element.classList.remove(...changes.remove)
      }
      if (changes.add) {
        element.classList.add(...changes.add)
      }
      if (changes.toggle) {
        changes.toggle.forEach(cls => element.classList.toggle(cls))
      }
    }, 'medium')
  }

  /**
   * Efficient list update with DOM recycling
   */
  const updateList = <T>(
    container: HTMLElement,
    items: T[],
    renderItem: (item: T, element?: HTMLElement) => HTMLElement,
    keyFunction?: (item: T) => string | number
  ): void => {
    scheduleUpdate(`list-${container.id || Math.random()}`, () => {
      const existingElements = Array.from(container.children) as HTMLElement[]
      const newElements: HTMLElement[] = []
      const elementMap = new Map<string | number, HTMLElement>()

      // Create map of existing elements by key
      if (keyFunction) {
        existingElements.forEach((el, index) => {
          const key = el.dataset.key
          if (key) {
            elementMap.set(key, el)
          }
        })
      }

      // Process items and reuse/create elements
      items.forEach((item, index) => {
        const key = keyFunction ? keyFunction(item) : index
        let element = keyFunction ? elementMap.get(key) : existingElements[index]

        if (element) {
          // Update existing element
          element = renderItem(item, element)
          elementMap.delete(key)
        } else {
          // Create new element
          element = renderItem(item)
          if (keyFunction) {
            element.dataset.key = String(key)
          }
        }

        newElements.push(element)
      })

      // Remove unused elements
      elementMap.forEach(element => element.remove())

      // Update DOM efficiently
      const fragment = document.createDocumentFragment()
      newElements.forEach(element => {
        if (!container.contains(element)) {
          fragment.appendChild(element)
        }
      })

      if (fragment.hasChildNodes()) {
        container.appendChild(fragment)
      }

      // Reorder elements if necessary
      newElements.forEach((element, index) => {
        const currentElement = container.children[index]
        if (currentElement !== element) {
          container.insertBefore(element, currentElement)
        }
      })
    }, 'high')
  }

  /**
   * Debounced DOM updates to prevent excessive reflows
   */
  const createDebouncedUpdate = (
    callback: () => void,
    delay: number = 16
  ) => {
    let timeoutId: number | null = null

    return (...args: any[]) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(() => {
        callback.apply(null, args)
        timeoutId = null
      }, delay)
    }
  }

  /**
   * Measure DOM operation performance
   */
  const measureDOMOperation = async <T>(
    name: string,
    operation: () => T | Promise<T>
  ): Promise<T> => {
    const startTime = performance.now()
    const result = await operation()
    const duration = performance.now() - startTime

    if (import.meta.env.DEV && duration > 16) {
      console.warn(`DOM operation '${name}' took ${duration.toFixed(2)}ms (>16ms threshold)`)
    }

    return result
  }

  /**
   * Observer for DOM mutations with performance monitoring
   */
  const createPerformantObserver = (
    target: Element,
    callback: (mutations: MutationRecord[]) => void,
    options: MutationObserverInit = {}
  ): MutationObserver => {
    let mutationBatch: MutationRecord[] = []
    let flushTimeout: number | null = null

    const observer = new MutationObserver((mutations) => {
      mutationBatch.push(...mutations)

      if (flushTimeout) return

      flushTimeout = window.setTimeout(() => {
        const batch = mutationBatch.slice()
        mutationBatch.length = 0
        flushTimeout = null

        requestAnimationFrame(() => {
          measureDOMOperation('mutation-batch', () => callback(batch))
        })
      }, 16)
    })

    observer.observe(target, {
      childList: true,
      subtree: true,
      ...options
    })

    return observer
  }

  // Cleanup on unmount
  onBeforeUnmount(() => {
    clearQueue()
    if (flushTimer) {
      clearTimeout(flushTimer)
    }
  })

  return {
    // Update scheduling
    scheduleUpdate,
    forceFlush,
    clearQueue,

    // Element pooling
    createElementPool,
    acquireElement,
    releaseElement,

    // Batch operations
    batchStyleUpdates,
    batchClassUpdates,
    updateList,

    // Utilities
    createDebouncedUpdate,
    measureDOMOperation,
    createPerformantObserver,

    // State
    isProcessing: computed(() => isProcessing.value),
    queueSize: computed(() => updateQueue.value.length),
    metrics: computed(() => metrics.value)
  }
}

/**
 * Specialized hook for list rendering optimization
 */
export function useListOptimization<T>() {
  const domOpt = useDOMOptimization()
  const renderCache = new Map<string | number, HTMLElement>()

  /**
   * Render list with intelligent caching and recycling
   */
  const renderOptimizedList = (
    container: HTMLElement,
    items: T[],
    renderItem: (item: T, cached?: HTMLElement) => HTMLElement,
    keyFunction: (item: T) => string | number
  ): void => {
    const usedKeys = new Set<string | number>()
    const fragment = document.createDocumentFragment()

    items.forEach(item => {
      const key = keyFunction(item)
      usedKeys.add(key)

      let element = renderCache.get(key)

      if (element) {
        // Update cached element
        element = renderItem(item, element)
      } else {
        // Create new element and cache it
        element = renderItem(item)
        renderCache.set(key, element)
      }

      fragment.appendChild(element)
    })

    // Clean up unused cached elements
    for (const [key, element] of renderCache.entries()) {
      if (!usedKeys.has(key)) {
        renderCache.delete(key)
        element.remove()
      }
    }

    // Update DOM
    domOpt.scheduleUpdate(`list-${container.id}`, () => {
      container.replaceChildren(fragment)
    }, 'high')
  }

  return {
    renderOptimizedList,
    clearCache: () => renderCache.clear(),
    cacheSize: computed(() => renderCache.size)
  }
}

/**
 * GPU-accelerated transition utilities
 */
export function useGPUTransitions() {
  /**
   * Apply GPU-accelerated transform
   */
  const applyTransform = (
    element: HTMLElement,
    transform: string,
    duration: number = 300,
    easing: string = 'ease-out'
  ): Promise<void> => {
    return new Promise(resolve => {
      // Prepare for GPU acceleration
      element.style.willChange = 'transform'
      element.style.transform = transform
      element.style.transition = `transform ${duration}ms ${easing}`

      const cleanup = () => {
        element.style.willChange = 'auto'
        element.style.transition = ''
        resolve()
      }

      element.addEventListener('transitionend', cleanup, { once: true })
      setTimeout(cleanup, duration + 50) // Fallback
    })
  }

  /**
   * Fade with GPU acceleration
   */
  const fadeTransition = (
    element: HTMLElement,
    opacity: number,
    duration: number = 300
  ): Promise<void> => {
    return new Promise(resolve => {
      element.style.willChange = 'opacity'
      element.style.opacity = String(opacity)
      element.style.transition = `opacity ${duration}ms ease-out`

      const cleanup = () => {
        element.style.willChange = 'auto'
        element.style.transition = ''
        resolve()
      }

      element.addEventListener('transitionend', cleanup, { once: true })
      setTimeout(cleanup, duration + 50)
    })
  }

  /**
   * Slide animation with transform3d for GPU acceleration
   */
  const slideTransition = (
    element: HTMLElement,
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number,
    duration: number = 300
  ): Promise<void> => {
    const transforms = {
      up: `translate3d(0, -${distance}px, 0)`,
      down: `translate3d(0, ${distance}px, 0)`,
      left: `translate3d(-${distance}px, 0, 0)`,
      right: `translate3d(${distance}px, 0, 0)`
    }

    return applyTransform(element, transforms[direction], duration)
  }

  return {
    applyTransform,
    fadeTransition,
    slideTransition
  }
}
