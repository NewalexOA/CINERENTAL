<template>
  <div v-if="showMonitor" class="memory-pressure-monitor">
    <!-- Development Mode Memory Monitor -->
    <div
      v-if="isDev && memoryData"
      class="fixed bottom-4 right-4 z-50 bg-gray-900 text-white p-3 rounded-lg shadow-lg text-xs font-mono"
      :class="pressureColorClass"
    >
      <div class="flex items-center gap-2 mb-2">
        <div class="w-2 h-2 rounded-full" :class="pressureIndicatorClass"></div>
        <span class="font-semibold">Memory: {{ pressureLevel.toUpperCase() }}</span>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div>Used: {{ formatMB(memoryData.usedJSHeapSize) }}MB</div>
          <div>Total: {{ formatMB(memoryData.totalJSHeapSize) }}MB</div>
        </div>
        <div>
          <div>Limit: {{ formatMB(memoryData.jsHeapSizeLimit) }}MB</div>
          <div>{{ Math.round(memoryUsagePercentage) }}% Used</div>
        </div>
      </div>

      <div v-if="recommendation" class="mt-2 pt-2 border-t border-gray-700 text-xs text-yellow-300">
        💡 {{ recommendation }}
      </div>

      <!-- Memory cleanup button -->
      <button
        @click="triggerCleanup"
        class="mt-2 w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
        :disabled="cleanupInProgress"
      >
        {{ cleanupInProgress ? 'Cleaning...' : '🧹 Cleanup' }}
      </button>
    </div>

    <!-- Warning Toast for High Memory Pressure -->
    <Teleport to="body">
      <div
        v-if="showWarningToast"
        class="fixed top-4 right-4 z-50 bg-amber-600 text-white p-4 rounded-lg shadow-lg max-w-sm"
        role="alert"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>

          <div class="flex-1">
            <h4 class="font-semibold">High Memory Usage</h4>
            <p class="mt-1 text-sm">
              {{ recommendation }}
            </p>

            <div class="mt-2 flex gap-2">
              <button
                @click="triggerCleanup"
                class="px-3 py-1 bg-white bg-opacity-20 rounded text-sm hover:bg-opacity-30 transition-colors"
              >
                Auto Cleanup
              </button>
              <button
                @click="dismissWarning"
                class="px-3 py-1 bg-white bg-opacity-20 rounded text-sm hover:bg-opacity-30 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>

          <button
            @click="dismissWarning"
            class="flex-shrink-0 text-white hover:text-gray-200"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useMemoryOptimization } from '@/composables/useMemoryOptimization'

interface Props {
  showInProduction?: boolean
  warningThreshold?: number // Memory usage percentage to show warning
  autoCleanup?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showInProduction: false,
  warningThreshold: 75,
  autoCleanup: true
})

const memoryOpt = useMemoryOptimization()
const isDev = import.meta.env.DEV
const showMonitor = computed(() => isDev || props.showInProduction)

const showWarningToast = ref(false)
const cleanupInProgress = ref(false)
const warningDismissed = ref(false)

const memoryData = computed(() => memoryOpt.currentMemoryPressure.value)
const pressureLevel = computed(() => memoryData.value?.pressureLevel || 'low')
const recommendation = computed(() => memoryData.value?.recommendation || '')

const memoryUsagePercentage = computed(() => {
  if (!memoryData.value) return 0
  return (memoryData.value.usedJSHeapSize / memoryData.value.jsHeapSizeLimit) * 100
})

const pressureColorClass = computed(() => {
  switch (pressureLevel.value) {
    case 'critical': return 'border-l-4 border-red-500 bg-red-900'
    case 'high': return 'border-l-4 border-orange-500 bg-orange-900'
    case 'medium': return 'border-l-4 border-yellow-500 bg-yellow-900'
    default: return 'border-l-4 border-green-500 bg-green-900'
  }
})

const pressureIndicatorClass = computed(() => {
  switch (pressureLevel.value) {
    case 'critical': return 'bg-red-500 animate-pulse'
    case 'high': return 'bg-orange-500 animate-pulse'
    case 'medium': return 'bg-yellow-500'
    default: return 'bg-green-500'
  }
})

function formatMB(bytes: number): string {
  return Math.round(bytes / 1024 / 1024).toString()
}

async function triggerCleanup(): Promise<void> {
  cleanupInProgress.value = true

  try {
    // Trigger memory cleanup
    memoryOpt.triggerMemoryCleanup()

    // Dispatch cleanup event to all stores and components
    window.dispatchEvent(new CustomEvent('app-memory-cleanup', {
      detail: { source: 'manual', memoryData: memoryData.value }
    }))

    // Wait a bit for cleanup to take effect
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Update memory metrics
    memoryOpt.updateMemoryMetrics()

  } catch (error) {
    console.error('Error during memory cleanup:', error)
  } finally {
    cleanupInProgress.value = false
  }
}

function dismissWarning(): void {
  showWarningToast.value = false
  warningDismissed.value = true

  // Reset dismissal after 5 minutes
  setTimeout(() => {
    warningDismissed.value = false
  }, 5 * 60 * 1000)
}

// Watch for memory pressure changes
watch(
  () => [pressureLevel.value, memoryUsagePercentage.value],
  ([newPressure, newPercentage]) => {
    // Show warning toast for high memory usage
    if ((newPressure === 'high' || newPressure === 'critical' || newPercentage > props.warningThreshold) &&
        !showWarningToast.value &&
        !warningDismissed.value) {
      showWarningToast.value = true

      // Auto cleanup if enabled and pressure is critical
      if (props.autoCleanup && newPressure === 'critical') {
        setTimeout(() => {
          triggerCleanup()
        }, 2000) // Delay to allow user to see the warning
      }
    }

    // Hide warning when pressure reduces
    if (newPressure === 'low' || newPressure === 'medium') {
      showWarningToast.value = false
    }
  }
)

// Auto dismiss warning after 10 seconds
watch(showWarningToast, (show) => {
  if (show) {
    setTimeout(() => {
      showWarningToast.value = false
    }, 10000)
  }
})

onMounted(() => {
  // Start monitoring if not already running
  memoryOpt.updateMemoryMetrics()

  if (import.meta.env.DEV) {
    console.log('🧠 Memory Pressure Monitor: Started')
  }
})

onUnmounted(() => {
  if (import.meta.env.DEV) {
    console.log('🧠 Memory Pressure Monitor: Stopped')
  }
})
</script>

<style scoped>
.memory-pressure-monitor {
  /* Ensure monitor doesn't interfere with app layout */
  pointer-events: none;
}

.memory-pressure-monitor > * {
  pointer-events: auto;
}

/* Smooth transitions for toast */
.v-enter-active,
.v-leave-active {
  transition: all 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
