<!--
  Advanced Async Component Wrapper with Error Boundary and Performance Tracking
  Provides loading states, error handling, and performance monitoring for lazy-loaded components
-->
<template>
  <div class="async-wrapper" :class="{ 'async-wrapper--loading': isLoading }">
    <!-- Loading State -->
    <div v-if="isLoading" class="async-loading">
      <LoadingSkeleton
        :variant="skeletonVariant"
        :item-count="skeletonItemCount"
        v-bind="skeletonProps"
      />

      <!-- Enhanced Loading Progress Indicator -->
      <div v-if="showProgress && loadingProgress > 0" class="async-loading-progress mt-4">
        <div class="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <div class="w-48 bg-gray-200 rounded-full h-1.5">
            <div
              class="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              :style="{ width: `${loadingProgress}%` }"
            ></div>
          </div>
          <span>{{ Math.round(loadingProgress) }}%</span>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="async-error">
      <div class="p-6 text-center border border-red-300 bg-red-50 rounded-lg">
        <div class="text-red-600 mb-3">
          <svg class="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-red-800 font-medium mb-2">Failed to Load Component</h3>
        <p class="text-red-600 text-sm mb-4">
          {{ chunkName || 'Component' }} could not be loaded.
          <span v-if="retryCount > 0">Attempted {{ retryCount }} times.</span>
        </p>

        <!-- Error Details (Development Only) -->
        <details v-if="isDev && error.message" class="text-left mb-4">
          <summary class="cursor-pointer text-red-700 text-xs hover:text-red-800">
            Technical Details
          </summary>
          <pre class="text-xs text-red-600 mt-2 p-2 bg-red-100 rounded overflow-auto">{{ error.message }}</pre>
        </details>

        <div class="flex justify-center space-x-3">
          <button
            @click="retry"
            :disabled="isRetrying"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm transition-colors"
          >
            <span v-if="isRetrying">Retrying...</span>
            <span v-else>{{ retryCount > 0 ? 'Try Again' : 'Retry' }}</span>
          </button>
          <button
            @click="fallbackToFullReload"
            class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>

    <!-- Success State -->
    <div v-else class="async-content">
      <component
        :is="loadedComponent"
        v-bind="$attrs"
        @error="handleComponentError"
      />
    </div>

    <!-- Performance Info (Development Only) -->
    <div v-if="isDev && showPerformanceInfo && performanceMetrics"
         class="async-performance-info mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 border-l-2 border-blue-500">
      <div class="flex justify-between items-center">
        <span>Load Time: {{ performanceMetrics.loadTime.toFixed(2) }}ms</span>
        <span v-if="performanceMetrics.size">Size: {{ performanceMetrics.size }}KB</span>
        <span v-if="performanceMetrics.cacheHit" class="text-green-600">✓ Cache Hit</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onErrorCaptured, type Component } from 'vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { performanceMonitor } from '@/utils/performance'

interface AsyncWrapperProps {
  chunkName: string
  loader: () => Promise<Component>
  skeletonVariant?: 'virtual-equipment-list' | 'universal-cart' | 'virtual-projects-list' | 'scanner' | 'generic'
  skeletonItemCount?: number
  skeletonProps?: Record<string, any>
  showProgress?: boolean
  showPerformanceInfo?: boolean
  maxRetries?: number
  retryDelay?: number
  timeout?: number
  preload?: boolean
}

const props = withDefaults(defineProps<AsyncWrapperProps>(), {
  skeletonVariant: 'generic',
  skeletonItemCount: 3,
  skeletonProps: () => ({}),
  showProgress: false,
  showPerformanceInfo: false,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 10000,
  preload: false
})

const emit = defineEmits<{
  loaded: [component: Component, metrics: any]
  error: [error: Error, retryCount: number]
  retry: [attempt: number]
}>()

// State
const isLoading = ref(true)
const error = ref<Error | null>(null)
const loadedComponent = ref<Component | null>(null)
const isRetrying = ref(false)
const retryCount = ref(0)
const loadingProgress = ref(0)
const performanceMetrics = ref<any>(null)

// Computed
const isDev = computed(() => import.meta.env.DEV)

// Component loading with enhanced error handling and performance tracking
const loadComponent = async (attempt = 0): Promise<Component> => {
  const startTime = performance.now()
  let progressInterval: NodeJS.Timeout | null = null

  try {
    isLoading.value = true
    error.value = null

    // Simulate progress for better UX (in development)
    if (props.showProgress && isDev.value) {
      loadingProgress.value = 10
      progressInterval = setInterval(() => {
        if (loadingProgress.value < 90) {
          loadingProgress.value += Math.random() * 20
        }
      }, 200)
    }

    // Load component with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Component load timeout (${props.timeout}ms)`)), props.timeout)
    })

    const component = await Promise.race([
      performanceMonitor.trackAsyncChunkLoad(props.chunkName, props.loader),
      timeoutPromise
    ])

    const loadTime = performance.now() - startTime

    // Complete progress
    if (progressInterval) {
      clearInterval(progressInterval)
      loadingProgress.value = 100
    }

    // Track performance metrics
    performanceMetrics.value = {
      loadTime,
      cacheHit: loadTime < 50,
      size: performanceMonitor.getChunkMetrics()
        .find(m => m.chunkName === props.chunkName)?.size,
      attempt: attempt + 1
    }

    loadedComponent.value = component
    isLoading.value = false

    emit('loaded', component, performanceMetrics.value)

    return component

  } catch (loadError) {
    if (progressInterval) {
      clearInterval(progressInterval)
    }

    const errorInstance = loadError instanceof Error ? loadError : new Error(String(loadError))

    if (attempt < props.maxRetries) {
      console.warn(`Retrying load for ${props.chunkName} (attempt ${attempt + 1}/${props.maxRetries})`)

      // Exponential backoff with jitter
      const delay = props.retryDelay * Math.pow(2, attempt) + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))

      return loadComponent(attempt + 1)
    }

    throw errorInstance
  }
}

const retry = async () => {
  try {
    isRetrying.value = true
    retryCount.value++
    emit('retry', retryCount.value)

    await loadComponent()
  } catch (retryError) {
    error.value = retryError instanceof Error ? retryError : new Error(String(retryError))
    emit('error', error.value, retryCount.value)
  } finally {
    isRetrying.value = false
  }
}

const fallbackToFullReload = () => {
  window.location.reload()
}

const handleComponentError = (componentError: Error) => {
  console.error(`Runtime error in ${props.chunkName}:`, componentError)
  error.value = componentError
  emit('error', componentError, retryCount.value)
}

// Error boundary
onErrorCaptured((capturedError) => {
  handleComponentError(capturedError)
  return false // Prevent error from bubbling up
})

// Initialize
onMounted(async () => {
  try {
    await loadComponent()
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError : new Error(String(loadError))
    isLoading.value = false
    emit('error', error.value, retryCount.value)
  }
})
</script>

<style scoped>
.async-wrapper {
  @apply transition-opacity duration-300;
}

.async-wrapper--loading {
  @apply opacity-90;
}

.async-loading {
  @apply animate-pulse;
}

.async-error {
  @apply animate-fadeIn;
}

.async-content {
  @apply animate-fadeIn;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
</style>
