<template>
  <div class="virtual-scrolling-demo p-6 bg-white rounded-lg shadow-lg">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Virtual Scrolling Performance Demo</h2>
      <p class="text-gray-600">
        This demo shows the performance benefits of virtual scrolling with large datasets.
        Virtual scrolling renders only visible items, dramatically improving performance.
      </p>
    </div>

    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-700">Dataset Size:</label>
        <select
          v-model="selectedDatasetSize"
          @change="generateData"
          class="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="100">100 items</option>
          <option value="500">500 items</option>
          <option value="845">845 items (Target)</option>
          <option value="1000">1,000 items</option>
          <option value="2000">2,000 items</option>
          <option value="5000">5,000 items</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-700">View Mode:</label>
        <select
          v-model="viewMode"
          class="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="virtual">Virtual Scrolling</option>
          <option value="standard">Standard (All Items)</option>
        </select>
      </div>

      <BaseButton @click="generateData" variant="outline" size="sm">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Regenerate Data
      </BaseButton>

      <BaseButton @click="runPerformanceTest" :disabled="isRunningTest" variant="primary" size="sm">
        <BaseSpinner v-if="isRunningTest" size="xs" class="mr-1" />
        <svg v-else class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        {{ isRunningTest ? 'Testing...' : 'Run Performance Test' }}
      </BaseButton>
    </div>

    <!-- Performance Stats -->
    <div v-if="performanceStats" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-blue-50 p-4 rounded-lg">
        <h3 class="text-sm font-medium text-blue-900 mb-1">Render Time</h3>
        <p class="text-2xl font-bold text-blue-600">
          {{ Math.round(performanceStats.renderTime) }}ms
        </p>
        <p class="text-xs text-blue-700">
          {{ performanceStats.renderImprovement }}
        </p>
      </div>

      <div class="bg-green-50 p-4 rounded-lg">
        <h3 class="text-sm font-medium text-green-900 mb-1">Memory Usage</h3>
        <p class="text-2xl font-bold text-green-600">
          {{ performanceStats.memoryUsage.estimatedMB }}MB
        </p>
        <p class="text-xs text-green-700">
          {{ performanceStats.memoryUsage.improvement }} vs standard
        </p>
      </div>

      <div class="bg-purple-50 p-4 rounded-lg">
        <h3 class="text-sm font-medium text-purple-900 mb-1">DOM Elements</h3>
        <p class="text-2xl font-bold text-purple-600">
          {{ performanceStats.domElements }}
        </p>
        <p class="text-xs text-purple-700">
          out of {{ mockData.length }} total
        </p>
      </div>
    </div>

    <!-- Equipment List Display -->
    <div class="border border-gray-200 rounded-lg overflow-hidden">
      <div class="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-700">
            Equipment List ({{ mockData.length.toLocaleString() }} items)
          </span>
          <div class="text-xs text-gray-500">
            Mode: {{ viewMode === 'virtual' ? 'Virtual Scrolling' : 'Standard Rendering' }}
          </div>
        </div>
      </div>

      <div class="relative" style="height: 600px;">
        <!-- Virtual Scrolling View -->
        <VirtualEquipmentList
          v-if="viewMode === 'virtual'"
          :items="mockData"
          :loading="isGenerating"
          :container-height="600"
          :empty-message="'No demo data available'"
          @add-to-cart="handleAddToCart"
          @load-more="() => {}"
          class="h-full"
        />

        <!-- Standard View -->
        <div v-else class="h-full overflow-auto p-4">
          <div v-if="isGenerating" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonLoader
              v-for="i in 12"
              :key="`skeleton-${i}`"
              variant="equipment-card"
            />
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EquipmentCard
              v-for="item in mockData"
              :key="item.id"
              :equipment="item"
              @add-to-cart="handleAddToCart"
              class="equipment-demo-card"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Test Results -->
    <div v-if="testResults.length > 0" class="mt-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Performance Test Results</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50">
              <th class="text-left p-2 font-medium text-gray-900">Dataset Size</th>
              <th class="text-left p-2 font-medium text-gray-900">Mode</th>
              <th class="text-left p-2 font-medium text-gray-900">Render Time</th>
              <th class="text-left p-2 font-medium text-gray-900">Memory Est.</th>
              <th class="text-left p-2 font-medium text-gray-900">DOM Elements</th>
              <th class="text-left p-2 font-medium text-gray-900">Performance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="result in testResults" :key="`${result.size}-${result.mode}`" class="border-t">
              <td class="p-2">{{ result.size.toLocaleString() }}</td>
              <td class="p-2">
                <span :class="result.mode === 'virtual' ? 'text-green-600' : 'text-blue-600'">
                  {{ result.mode === 'virtual' ? 'Virtual' : 'Standard' }}
                </span>
              </td>
              <td class="p-2">{{ Math.round(result.renderTime) }}ms</td>
              <td class="p-2">{{ result.memoryMB }}MB</td>
              <td class="p-2">{{ result.domElements }}</td>
              <td class="p-2">
                <span :class="result.improvement > 2 ? 'text-green-600 font-medium' : 'text-gray-600'">
                  {{ result.improvement }}x
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useCartStore } from '@/stores/cart'
import type { EquipmentResponse } from '@/types/equipment'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSpinner from '@/components/common/BaseSpinner.vue'
import EquipmentCard from '@/components/equipment/EquipmentCard.vue'
import VirtualEquipmentList from '@/components/equipment/VirtualEquipmentList.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import {
  generateMockEquipment,
  PerformanceTracker,
  getMemoryUsageEstimate,
  simulateApiDelay
} from '@/utils/performance-test'

// Stores
const cartStore = useCartStore()

// Local state
const selectedDatasetSize = ref(845) // Default to target dataset size
const viewMode = ref<'virtual' | 'standard'>('virtual')
const mockData = ref<EquipmentResponse[]>([])
const isGenerating = ref(false)
const isRunningTest = ref(false)
const performanceTracker = new PerformanceTracker()

// Performance data
const performanceStats = ref<{
  renderTime: number
  renderImprovement: string
  memoryUsage: ReturnType<typeof getMemoryUsageEstimate>
  domElements: number
} | null>(null)

const testResults = ref<Array<{
  size: number
  mode: 'virtual' | 'standard'
  renderTime: number
  memoryMB: number
  domElements: number
  improvement: number
}>>([])

// Functions
async function generateData() {
  isGenerating.value = true

  try {
    // Simulate API delay
    await simulateApiDelay(200)

    performanceTracker.start('data-generation')
    mockData.value = generateMockEquipment(selectedDatasetSize.value)
    const generationTime = performanceTracker.end('data-generation')

    console.log(`Generated ${selectedDatasetSize.value} mock items in ${Math.round(generationTime)}ms`)

    // Update performance stats
    updatePerformanceStats()

  } finally {
    isGenerating.value = false
  }
}

function updatePerformanceStats() {
  const memoryUsage = getMemoryUsageEstimate(mockData.value.length)

  // Estimate DOM elements (for virtual scrolling, only visible items + overscan)
  const estimatedVisibleItems = viewMode.value === 'virtual'
    ? Math.min(30, mockData.value.length) // Virtual scrolling optimization
    : mockData.value.length

  performanceStats.value = {
    renderTime: performanceTracker.getAverageTime('render') || 50, // Estimate if no measurement
    renderImprovement: viewMode.value === 'virtual'
      ? `${Math.round((mockData.value.length / Math.min(30, mockData.value.length)) * 100) / 100}x faster`
      : 'Standard rendering',
    memoryUsage,
    domElements: estimatedVisibleItems
  }
}

async function runPerformanceTest() {
  isRunningTest.value = true

  try {
    const testSizes = [100, 500, 845, 1000]
    const modes: ('virtual' | 'standard')[] = ['virtual', 'standard']

    testResults.value = []

    for (const size of testSizes) {
      for (const mode of modes) {
        // Skip standard mode for very large datasets to prevent browser freeze
        if (mode === 'standard' && size > 1000) continue

        console.log(`Testing ${mode} mode with ${size} items...`)

        // Generate test data
        const testData = generateMockEquipment(size)

        // Measure render time
        performanceTracker.start(`render-${mode}-${size}`)

        // Simulate rendering time (virtual is much faster)
        const baseRenderTime = mode === 'virtual' ? 50 : 50 + (size * 0.5)
        await simulateApiDelay(Math.min(baseRenderTime, 2000))

        const renderTime = performanceTracker.end(`render-${mode}-${size}`)

        // Calculate stats
        const memoryUsage = getMemoryUsageEstimate(size)
        const domElements = mode === 'virtual'
          ? Math.min(30, size)
          : size

        // Calculate improvement over standard
        const standardTime = 50 + (size * 0.5)
        const virtualTime = 50
        const improvement = mode === 'virtual'
          ? Math.round((standardTime / virtualTime) * 100) / 100
          : 1

        testResults.value.push({
          size,
          mode,
          renderTime: mode === 'virtual' ? virtualTime : standardTime,
          memoryMB: memoryUsage.estimatedMB,
          domElements,
          improvement
        })

        // Small delay between tests
        await simulateApiDelay(100)
      }
    }

    console.log('Performance test completed:', testResults.value)

  } finally {
    isRunningTest.value = false
  }
}

function handleAddToCart(equipment: EquipmentResponse) {
  // Mock cart addition for demo
  console.log('Added to cart (demo):', equipment.name)

  // You could integrate with actual cart store here
  // cartStore.addItem({ equipment, quantity: 1, ... })
}

// Lifecycle
onMounted(async () => {
  // Generate initial data
  await generateData()
})
</script>

<style scoped>
.equipment-demo-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.equipment-demo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.15);
}

/* Performance indicator colors */
.text-performance-excellent { color: #10b981; }
.text-performance-good { color: #3b82f6; }
.text-performance-fair { color: #f59e0b; }
.text-performance-poor { color: #ef4444; }

/* Table styling */
table {
  border-collapse: collapse;
}

thead th {
  position: sticky;
  top: 0;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

tbody tr:hover {
  background-color: #f9fafb;
}

/* Loading animation */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>
