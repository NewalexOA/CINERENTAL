<!--
  Example of using the optimized async component system
  Demonstrates how to convert existing components to async loading with performance tracking
-->
<template>
  <div class="async-example p-6 bg-gray-50 rounded-lg">
    <h2 class="text-xl font-bold mb-4 text-gray-900">Async Component Loading Examples</h2>

    <!-- Performance Metrics Display -->
    <div class="performance-metrics mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="metric-card bg-white p-4 rounded border">
        <h3 class="text-sm font-medium text-gray-600">Cache Hit Rate</h3>
        <p class="text-2xl font-bold text-blue-600">{{ analytics.cacheHitRate.toFixed(1) }}%</p>
      </div>
      <div class="metric-card bg-white p-4 rounded border">
        <h3 class="text-sm font-medium text-gray-600">Loading Components</h3>
        <p class="text-2xl font-bold text-orange-600">{{ analytics.loadingComponents }}</p>
      </div>
      <div class="metric-card bg-white p-4 rounded border">
        <h3 class="text-sm font-medium text-gray-600">Average Load Time</h3>
        <p class="text-2xl font-bold text-green-600">{{ analytics.averageLoadTime.toFixed(0) }}ms</p>
      </div>
    </div>

    <!-- Preload Progress -->
    <div v-if="analytics.isPreloading" class="preload-progress mb-6">
      <div class="bg-white p-4 rounded border">
        <h3 class="text-sm font-medium text-gray-600 mb-2">Preloading Components</h3>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="bg-blue-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${analytics.preloadProgress}%` }"
          ></div>
        </div>
        <p class="text-sm text-gray-500 mt-1">{{ analytics.preloadProgress.toFixed(0) }}% complete</p>
      </div>
    </div>

    <!-- Component Loading Examples -->
    <div class="component-examples space-y-6">

      <!-- Example 1: High Priority Component (Equipment List) -->
      <div class="example-section">
        <h3 class="text-lg font-semibold mb-3 text-gray-800">High Priority: Equipment List</h3>
        <button
          @click="loadEquipmentComponent"
          :disabled="equipmentLoading"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {{ equipmentLoading ? 'Loading...' : 'Load Equipment Module' }}
        </button>

        <div v-if="equipmentComponent" class="mt-4 p-4 border border-blue-200 bg-blue-50 rounded">
          <Suspense>
            <component :is="equipmentComponent" />
            <template #fallback>
              <div class="animate-pulse bg-blue-200 h-32 rounded"></div>
            </template>
          </Suspense>
        </div>
      </div>

      <!-- Example 2: Medium Priority Component (Cart System) -->
      <div class="example-section">
        <h3 class="text-lg font-semibold mb-3 text-gray-800">Medium Priority: Cart System</h3>
        <button
          @click="loadCartComponent"
          :disabled="cartLoading"
          class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {{ cartLoading ? 'Loading...' : 'Load Cart Module' }}
        </button>

        <div v-if="cartComponent" class="mt-4 p-4 border border-green-200 bg-green-50 rounded">
          <Suspense>
            <component :is="cartComponent" />
            <template #fallback>
              <div class="animate-pulse bg-green-200 h-24 rounded"></div>
            </template>
          </Suspense>
        </div>
      </div>

      <!-- Example 3: Low Priority Component (Scanner) -->
      <div class="example-section">
        <h3 class="text-lg font-semibold mb-3 text-gray-800">Low Priority: Scanner Module</h3>
        <button
          @click="loadScannerComponent"
          :disabled="scannerLoading"
          class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {{ scannerLoading ? 'Loading...' : 'Load Scanner Module' }}
        </button>

        <div v-if="scannerComponent" class="mt-4 p-4 border border-purple-200 bg-purple-50 rounded">
          <Suspense>
            <component :is="scannerComponent" />
            <template #fallback>
              <div class="animate-pulse bg-purple-200 h-16 rounded"></div>
            </template>
          </Suspense>
        </div>
      </div>

      <!-- Example 4: Error Handling -->
      <div class="example-section">
        <h3 class="text-lg font-semibold mb-3 text-gray-800">Error Handling Example</h3>
        <button
          @click="loadFailingComponent"
          :disabled="failingLoading"
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {{ failingLoading ? 'Loading...' : 'Load Failing Component' }}
        </button>

        <div v-if="failingError" class="mt-4 p-4 border border-red-200 bg-red-50 rounded text-red-700">
          <h4 class="font-medium">Loading Error:</h4>
          <p class="text-sm mt-1">{{ failingError.message }}</p>
          <button
            @click="retryFailingComponent"
            class="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions mt-8 flex flex-wrap gap-3">
      <button
        @click="clearComponentCache"
        class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
      >
        Clear Cache
      </button>
      <button
        @click="startPreloading"
        :disabled="analytics.isPreloading"
        class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {{ analytics.isPreloading ? 'Preloading...' : 'Start Preloading' }}
      </button>
      <button
        @click="exportAnalytics"
        class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
      >
        Export Analytics
      </button>
    </div>

    <!-- Component States Debug Info (Dev only) -->
    <div v-if="isDev" class="debug-info mt-8 p-4 bg-gray-800 text-gray-200 rounded-lg font-mono text-xs">
      <h4 class="text-lg font-bold mb-2 text-white">Debug Information</h4>
      <pre>{{ JSON.stringify(analytics.componentStates, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useAsyncComponents, createOptimizedAsyncComponent } from '@/composables/useAsyncComponents'
import type { Component } from 'vue'

// State
const isDev = computed(() => import.meta.env.DEV)
const equipmentComponent = ref<Component | null>(null)
const cartComponent = ref<Component | null>(null)
const scannerComponent = ref<Component | null>(null)
const equipmentLoading = ref(false)
const cartLoading = ref(false)
const scannerLoading = ref(false)
const failingLoading = ref(false)
const failingError = ref<Error | null>(null)

// Composables
const {
  getAnalytics,
  registerComponent,
  loadComponent,
  startPreloading,
  retryFailedComponents,
  clearCache
} = useAsyncComponents()

// Reactive analytics
const analytics = ref(getAnalytics())

// Update analytics periodically
const updateAnalytics = () => {
  analytics.value = getAnalytics()
}

// Component loading methods
const loadEquipmentComponent = async () => {
  equipmentLoading.value = true
  try {
    // Register and load equipment component with high priority
    registerComponent({
      chunkName: 'example-equipment',
      loader: () => import('@/components/equipment/VirtualScrollingList.vue'),
      priority: 'high',
      cacheStrategy: 'normal'
    })

    equipmentComponent.value = await loadComponent({
      chunkName: 'example-equipment',
      loader: () => import('@/components/equipment/VirtualScrollingList.vue'),
      priority: 'high',
      cacheStrategy: 'normal'
    })
  } catch (error) {
    console.error('Failed to load equipment component:', error)
  } finally {
    equipmentLoading.value = false
    updateAnalytics()
  }
}

const loadCartComponent = async () => {
  cartLoading.value = true
  try {
    // Register and load cart component with medium priority
    registerComponent({
      chunkName: 'example-cart',
      loader: () => import('@/components/cart/UniversalCart.vue'),
      priority: 'medium',
      cacheStrategy: 'aggressive'
    })

    cartComponent.value = await loadComponent({
      chunkName: 'example-cart',
      loader: () => import('@/components/cart/UniversalCart.vue'),
      priority: 'medium',
      cacheStrategy: 'aggressive'
    })
  } catch (error) {
    console.error('Failed to load cart component:', error)
  } finally {
    cartLoading.value = false
    updateAnalytics()
  }
}

const loadScannerComponent = async () => {
  scannerLoading.value = true
  try {
    // Create optimized async component with low priority
    scannerComponent.value = createOptimizedAsyncComponent(
      'example-scanner',
      () => import('@/components/scanner/BarcodeScanner.vue'),
      {
        priority: 'low',
        cacheStrategy: 'conservative'
      }
    )
  } catch (error) {
    console.error('Failed to load scanner component:', error)
  } finally {
    scannerLoading.value = false
    updateAnalytics()
  }
}

const loadFailingComponent = async () => {
  failingLoading.value = true
  failingError.value = null

  try {
    // Attempt to load a non-existent component to demonstrate error handling
    registerComponent({
      chunkName: 'failing-component',
      loader: () => import('@/components/nonexistent/FakeComponent.vue'),
      priority: 'medium',
      retryOptions: {
        maxAttempts: 2,
        baseDelay: 500
      }
    })

    await loadComponent({
      chunkName: 'failing-component',
      loader: () => import('@/components/nonexistent/FakeComponent.vue'),
      priority: 'medium',
      retryOptions: {
        maxAttempts: 2,
        baseDelay: 500
      }
    })
  } catch (error) {
    failingError.value = error as Error
    console.error('Expected error loading failing component:', error)
  } finally {
    failingLoading.value = false
    updateAnalytics()
  }
}

const retryFailingComponent = async () => {
  await retryFailedComponents()
  updateAnalytics()
}

const clearComponentCache = async () => {
  clearCache()
  equipmentComponent.value = null
  cartComponent.value = null
  scannerComponent.value = null
  failingError.value = null
  updateAnalytics()
}

const exportAnalytics = () => {
  const data = JSON.stringify(analytics.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `async-component-analytics-${new Date().toISOString().slice(0, 19)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Update analytics periodically
onMounted(() => {
  const interval = setInterval(updateAnalytics, 2000)

  // Cleanup on unmount
  return () => clearInterval(interval)
})
</script>

<style scoped>
.async-example {
  max-width: 1200px;
  margin: 0 auto;
}

.example-section {
  @apply border border-gray-200 rounded-lg p-4 bg-white;
}

.metric-card {
  @apply transition-all duration-200 hover:shadow-md;
}

.debug-info {
  max-height: 300px;
  overflow-y: auto;
}

.debug-info::-webkit-scrollbar {
  width: 6px;
}

.debug-info::-webkit-scrollbar-track {
  background: #374151;
}

.debug-info::-webkit-scrollbar-thumb {
  background: #6b7280;
  border-radius: 3px;
}
</style>
