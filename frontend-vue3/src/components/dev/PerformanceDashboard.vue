<!--
  Development Performance Dashboard
  Provides real-time monitoring of bundle loading, chunk performance, and memory usage
-->
<template>
  <div v-if="isDev" class="performance-dashboard fixed bottom-4 right-4 z-50">
    <!-- Toggle Button -->
    <button
      v-if="!isExpanded"
      @click="isExpanded = true"
      class="performance-toggle bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all duration-200"
      title="Open Performance Dashboard"
    >
      📊
    </button>

    <!-- Expanded Dashboard -->
    <div
      v-else
      class="performance-panel bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-96 overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-3 bg-gray-50 border-b">
        <h3 class="font-semibold text-gray-900 text-sm">Performance Monitor</h3>
        <div class="flex items-center space-x-2">
          <button
            @click="refreshData"
            class="text-gray-500 hover:text-gray-700 transition-colors"
            title="Refresh Data"
          >
            🔄
          </button>
          <button
            @click="exportData"
            class="text-gray-500 hover:text-gray-700 transition-colors"
            title="Export Data"
          >
            📥
          </button>
          <button
            @click="isExpanded = false"
            class="text-gray-500 hover:text-gray-700 transition-colors"
            title="Close Dashboard"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-3 space-y-3 overflow-y-auto max-h-80 text-xs">
        <!-- Bundle Overview -->
        <div class="bg-blue-50 rounded p-2">
          <h4 class="font-medium text-blue-900 mb-2">Bundle Overview</h4>
          <div class="grid grid-cols-2 gap-2 text-blue-700">
            <div>
              <span class="text-blue-500">Total Chunks:</span>
              <span class="font-mono">{{ analytics.summary.totalChunks }}</span>
            </div>
            <div>
              <span class="text-blue-500">Avg Load:</span>
              <span class="font-mono">{{ analytics.summary.avgLoadTime.toFixed(1) }}ms</span>
            </div>
            <div>
              <span class="text-blue-500">Cache Hit:</span>
              <span class="font-mono">{{ asyncAnalytics.cacheHitRate.toFixed(1) }}%</span>
            </div>
            <div>
              <span class="text-blue-500">Error Rate:</span>
              <span class="font-mono">{{ analytics.summary.errorRate.toFixed(1) }}%</span>
            </div>
          </div>
        </div>

        <!-- Current Performance -->
        <div class="bg-green-50 rounded p-2">
          <h4 class="font-medium text-green-900 mb-2">Current Performance</h4>
          <div class="space-y-1 text-green-700">
            <div v-if="latestMetrics">
              <span class="text-green-500">Render Time:</span>
              <span class="font-mono">{{ latestMetrics.renderTime.toFixed(2) }}ms</span>
              <span class="ml-1" :class="getRenderPerformanceClass(latestMetrics.renderTime)">
                {{ getRenderPerformanceIcon(latestMetrics.renderTime) }}
              </span>
            </div>
            <div v-if="latestMetrics">
              <span class="text-green-500">Memory:</span>
              <span class="font-mono">{{ latestMetrics.memoryUsage }}MB</span>
              <span class="ml-1" :class="getMemoryPerformanceClass(latestMetrics.memoryUsage)">
                {{ getMemoryPerformanceIcon(latestMetrics.memoryUsage) }}
              </span>
            </div>
            <div v-if="latestMetrics">
              <span class="text-green-500">View Mode:</span>
              <span class="font-mono">{{ latestMetrics.viewMode }}</span>
            </div>
          </div>
        </div>

        <!-- Async Components Status -->
        <div class="bg-purple-50 rounded p-2">
          <h4 class="font-medium text-purple-900 mb-2">Async Components</h4>
          <div class="grid grid-cols-2 gap-2 text-purple-700">
            <div>
              <span class="text-purple-500">Total:</span>
              <span class="font-mono">{{ asyncAnalytics.totalComponents }}</span>
            </div>
            <div>
              <span class="text-purple-500">Loading:</span>
              <span class="font-mono">{{ asyncAnalytics.loadingComponents }}</span>
            </div>
            <div>
              <span class="text-purple-500">Errors:</span>
              <span class="font-mono">{{ asyncAnalytics.erroredComponents }}</span>
            </div>
            <div>
              <span class="text-purple-500">Cached:</span>
              <span class="font-mono">{{ asyncAnalytics.cacheSize }}</span>
            </div>
          </div>

          <!-- Preload Progress -->
          <div v-if="asyncAnalytics.isPreloading" class="mt-2">
            <div class="flex items-center justify-between text-purple-600 mb-1">
              <span class="text-purple-500">Preloading:</span>
              <span class="font-mono">{{ asyncAnalytics.preloadProgress.toFixed(0) }}%</span>
            </div>
            <div class="w-full bg-purple-200 rounded-full h-1">
              <div
                class="bg-purple-600 h-1 rounded-full transition-all duration-300"
                :style="{ width: `${asyncAnalytics.preloadProgress}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Recent Chunk Loads -->
        <div class="bg-gray-50 rounded p-2">
          <h4 class="font-medium text-gray-900 mb-2">Recent Chunks</h4>
          <div class="space-y-1 max-h-20 overflow-y-auto">
            <div
              v-for="chunk in recentChunks.slice(0, 5)"
              :key="`${chunk.chunkName}-${chunk.timestamp}`"
              class="flex items-center justify-between text-gray-600"
            >
              <span class="truncate flex-1 text-gray-500">
                {{ chunk.chunkName }}
              </span>
              <span class="font-mono ml-2">
                {{ chunk.loadTime.toFixed(0) }}ms
              </span>
              <span class="ml-1" :class="getChunkPerformanceClass(chunk.loadTime)">
                {{ getChunkPerformanceIcon(chunk.loadTime) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Performance Violations -->
        <div v-if="violations.length > 0" class="bg-red-50 rounded p-2">
          <h4 class="font-medium text-red-900 mb-2">
            Performance Issues ({{ violations.length }})
          </h4>
          <div class="space-y-1 max-h-16 overflow-y-auto">
            <div
              v-for="violation in violations.slice(0, 3)"
              :key="`${violation.type}-${violation.metric}-${violation.timestamp}`"
              class="text-red-700 text-xs"
            >
              <span class="text-red-500">{{ violation.type }}:</span>
              <span class="font-mono">{{ violation.metric }}</span>
              <span class="ml-1" :class="violation.severity === 'critical' ? 'text-red-800' : 'text-red-600'">
                {{ violation.severity === 'critical' ? '🚨' : '⚠️' }}
              </span>
            </div>
            <div v-if="violations.length > 3" class="text-red-600 italic">
              ...and {{ violations.length - 3 }} more
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-yellow-50 rounded p-2">
          <h4 class="font-medium text-yellow-900 mb-2">Quick Actions</h4>
          <div class="flex flex-wrap gap-1">
            <button
              @click="clearCaches"
              class="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded transition-colors"
            >
              Clear Cache
            </button>
            <button
              @click="retryFailedComponents"
              class="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded transition-colors"
            >
              Retry Failed
            </button>
            <button
              @click="forceReanalysis"
              class="text-xs bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded transition-colors"
            >
              Reanalyze
            </button>
          </div>
        </div>
      </div>

      <!-- Status Bar -->
      <div class="bg-gray-100 px-3 py-2 text-xs text-gray-600 border-t flex items-center justify-between">
        <span>Last updated: {{ lastUpdated }}</span>
        <span class="flex items-center space-x-2">
          <div class="w-2 h-2 rounded-full" :class="getStatusIndicatorClass()"></div>
          <span>{{ getStatusText() }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { performanceMonitor } from '@/utils/performance'
import { useAsyncComponents } from '@/composables/useAsyncComponents'

// State
const isDev = computed(() => import.meta.env.DEV)
const isExpanded = ref(false)
const lastUpdated = ref('')
const updateInterval = ref<NodeJS.Timeout | null>(null)

// Performance data
const analytics = ref(performanceMonitor.getPerformanceAnalytics())
const latestMetrics = ref(performanceMonitor.getLatestMetrics())
const violations = ref(performanceMonitor.getBudgetViolations())

// Async components analytics
const { getAnalytics: getAsyncAnalytics, retryFailedComponents: retryAsyncFailedComponents, clearCache } = useAsyncComponents()
const asyncAnalytics = ref(getAsyncAnalytics())

// Computed properties
const recentChunks = computed(() =>
  analytics.value.chunks
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
)

// Methods
const refreshData = async () => {
  analytics.value = performanceMonitor.getPerformanceAnalytics()
  latestMetrics.value = performanceMonitor.getLatestMetrics()
  violations.value = performanceMonitor.getBudgetViolations()
  asyncAnalytics.value = getAsyncAnalytics()
  lastUpdated.value = new Date().toLocaleTimeString()
}

const exportData = () => {
  const data = performanceMonitor.exportPerformanceData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `performance-data-${new Date().toISOString().slice(0, 19)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const clearCaches = async () => {
  performanceMonitor.clearAnalytics()
  clearCache()
  await nextTick()
  refreshData()
}

const retryFailedComponents = async () => {
  await retryAsyncFailedComponents()
  await nextTick()
  refreshData()
}

const forceReanalysis = () => {
  performanceMonitor.logPerformanceReport()
  refreshData()
}

// Performance status helpers
const getRenderPerformanceClass = (time: number) => {
  if (time > 100) return 'text-red-600'
  if (time > 50) return 'text-yellow-600'
  return 'text-green-600'
}

const getRenderPerformanceIcon = (time: number) => {
  if (time > 100) return '🐌'
  if (time > 50) return '⚡'
  return '🚀'
}

const getMemoryPerformanceClass = (memory: number) => {
  if (memory > 100) return 'text-red-600'
  if (memory > 50) return 'text-yellow-600'
  return 'text-green-600'
}

const getMemoryPerformanceIcon = (memory: number) => {
  if (memory > 100) return '🔥'
  if (memory > 50) return '⚠️'
  return '✅'
}

const getChunkPerformanceClass = (time: number) => {
  if (time > 1000) return 'text-red-600'
  if (time > 500) return 'text-yellow-600'
  return 'text-green-600'
}

const getChunkPerformanceIcon = (time: number) => {
  if (time > 1000) return '🐌'
  if (time > 500) return '⚡'
  return '🚀'
}

const getStatusIndicatorClass = () => {
  const criticalViolations = violations.value.filter(v => v.severity === 'critical').length
  const hasErrors = asyncAnalytics.value.erroredComponents > 0

  if (criticalViolations > 0 || hasErrors) return 'bg-red-500'
  if (violations.value.length > 0) return 'bg-yellow-500'
  return 'bg-green-500'
}

const getStatusText = () => {
  const criticalViolations = violations.value.filter(v => v.severity === 'critical').length
  const hasErrors = asyncAnalytics.value.erroredComponents > 0

  if (criticalViolations > 0) return 'Critical Issues'
  if (hasErrors) return 'Component Errors'
  if (violations.value.length > 0) return 'Performance Warnings'
  return 'All Good'
}

// Lifecycle
onMounted(() => {
  refreshData()

  // Update data every 5 seconds when dashboard is open
  updateInterval.value = setInterval(() => {
    if (isExpanded.value) {
      refreshData()
    }
  }, 5000)
})

onUnmounted(() => {
  if (updateInterval.value) {
    clearInterval(updateInterval.value)
  }
})
</script>

<style scoped>
.performance-dashboard {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.performance-toggle {
  transition: transform 0.2s ease;
}

.performance-toggle:hover {
  transform: scale(1.05);
}

.performance-panel {
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Custom scrollbar for better UX */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
