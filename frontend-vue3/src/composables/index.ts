/**
 * DOM Optimization Composables Export Index
 * Provides centralized access to all performance optimization utilities
 */

// Core DOM optimization composables
export {
  useDOMOptimization,
  useListOptimization,
  useGPUTransitions
} from './useDOMOptimization'

// Vue render optimization composables
export {
  useRenderOptimization,
  useComponentMemoization,
  useOptimizedListRendering
} from './useRenderOptimization'

// Transition and animation optimization composables
export {
  useTransitionOptimization,
  useListTransitions
} from './useTransitionOptimization'

// Memory optimization composables (existing)
export {
  useMemoryOptimization,
  useVirtualScrollingMemoryOptimization
} from './useMemoryOptimization'

// Async component management (existing)
export {
  useAsyncComponents,
  createOptimizedAsyncComponent,
  preloadCriticalChunks
} from './useAsyncComponents'

// Other existing composables
export { useScanner } from './useScanner'
export { useErrorHandler } from './useErrorHandler'
export { useAsyncState } from './useAsyncState'
export { useCartIntegration } from './useCartIntegration'
export { useAsyncComponentManager } from './useAsyncComponentManager'
export { useMemoryEfficientData } from './useMemoryEfficientData'

/**
 * Combined optimization hook that includes all major optimizations
 * Use this for components that need comprehensive performance optimization
 */
export function useComprehensiveOptimization(config: {
  enableDOMBatching?: boolean
  enableMemoryOptimization?: boolean
  enableTransitionOptimization?: boolean
  enableRenderOptimization?: boolean
} = {}) {
  const {
    enableDOMBatching = true,
    enableMemoryOptimization = true,
    enableTransitionOptimization = true,
    enableRenderOptimization = true
  } = config

  const optimizations: any = {}

  if (enableDOMBatching) {
    const { scheduleUpdate, batchStyleUpdates, updateList } = useDOMOptimization()
    optimizations.dom = { scheduleUpdate, batchStyleUpdates, updateList }
  }

  if (enableMemoryOptimization) {
    const { currentMemoryPressure, triggerMemoryCleanup } = useMemoryOptimization()
    optimizations.memory = { currentMemoryPressure, triggerMemoryCleanup }
  }

  if (enableTransitionOptimization) {
    const { fadeTransition, slideTransition, batchTransitions } = useTransitionOptimization()
    optimizations.transitions = { fadeTransition, slideTransition, batchTransitions }
  }

  if (enableRenderOptimization) {
    const { createMemoizedComputed, createDebouncedRef } = useRenderOptimization()
    optimizations.rendering = { createMemoizedComputed, createDebouncedRef }
  }

  return optimizations
}

/**
 * Performance monitoring and analytics aggregator
 */
export function usePerformanceAnalytics() {
  const domOpt = useDOMOptimization()
  const memOpt = useMemoryOptimization()
  const transOpt = useTransitionOptimization()

  return {
    getDOMMetrics: () => domOpt.metrics.value,
    getMemoryMetrics: () => memOpt.currentMemoryPressure.value,
    getTransitionMetrics: () => transOpt.metrics.value,

    getComprehensiveReport: () => ({
      dom: domOpt.metrics.value,
      memory: memOpt.currentMemoryPressure.value,
      transitions: transOpt.metrics.value,
      timestamp: Date.now()
    })
  }
}
