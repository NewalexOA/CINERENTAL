<template>
  <div class="project-detail-view">
    <div v-if="projectStore.loading">Loading project...</div>
    <div v-else-if="projectStore.error">{{ projectStore.error }}</div>
    <div v-else-if="projectStore.currentProject">
      <div class="flex justify-between items-center">
        <h1>{{ projectStore.currentProject.name }}</h1>
        <BaseButton @click="generateDocument">Print Document</BaseButton>
      </div>
      <p><strong>Client:</strong> {{ projectStore.currentProject.client_name }}</p>
      <p><strong>Status:</strong> {{ projectStore.currentProject.status }}</p>

      <div class="mt-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Equipment & Bookings</h2>
          <div class="flex gap-2">
            <BaseButton
              @click="cartIntegration.scanner?.start()"
              v-if="cartIntegration.scanner && !cartIntegration.scanner.isActive.value"
              variant="outline"
              size="sm"
            >
              📦 Start Scanner
            </BaseButton>
            <BaseButton
              @click="cartIntegration.scanner?.stop()"
              v-if="cartIntegration.scanner?.isActive.value"
              variant="outline"
              size="sm"
            >
              Stop Scanner
            </BaseButton>
            <BaseButton @click="showEquipmentSearch = true" variant="primary" size="sm">
              + Add Equipment
            </BaseButton>
          </div>
        </div>

        <!-- Scanner Status -->
        <div v-if="cartIntegration.scanner?.isActive.value" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span class="text-sm text-blue-700">Scanner active - Scan equipment barcodes to add to cart</span>
          </div>
          <div v-if="cartIntegration.scanner.lastScan.value" class="text-xs text-blue-600 mt-1">
            Last scan: {{ cartIntegration.scanner.lastScan.value }}
          </div>
        </div>

        <!-- Cart Error Display -->
        <div v-if="cartIntegration.cartState.value.errors.length > 0" class="mb-4">
          <div v-for="error in cartIntegration.cartState.value.errors" :key="error"
               class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-2">
            {{ error }}
            <BaseButton @click="cartIntegration.clearErrors" class="float-right text-red-500 hover:text-red-700" variant="text" size="sm">×</BaseButton>
          </div>
        </div>

        <!-- Universal Cart Component -->
        <div id="universalCartContainer">
          <UniversalCart mode="embedded" data-testid="universal-cart" />
        </div>

        <!-- Equipment Search Modal -->
        <Teleport to="body">
          <div v-if="showEquipmentSearch" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-hidden">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">Add Equipment</h3>
                <BaseButton @click="showEquipmentSearch = false" variant="text">×</BaseButton>
              </div>
              <div class="mb-4">
                <input
                  v-model="searchQuery"
                  @keyup.enter="handleEquipmentSearch"
                  type="text"
                  placeholder="Search equipment..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <BaseButton @click="handleEquipmentSearch" class="mt-2" :loading="cartIntegration.isProcessing.value">
                  Search
                </BaseButton>
              </div>
              <div v-if="searchResults.length > 0" class="max-h-64 overflow-y-auto">
                <div v-for="equipment in searchResults" :key="equipment.id"
                     class="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50">
                  <div class="flex-1">
                    <h4 class="font-medium">{{ equipment.name }}</h4>
                    <p class="text-sm text-gray-600">{{ equipment.category_name }} - {{ equipment.barcode }}</p>
                    <p class="text-sm font-medium text-green-600">${{ equipment.daily_cost }}/day</p>
                  </div>
                  <BaseButton @click="addEquipmentFromSearch(equipment)" size="sm">
                    Add to Cart
                  </BaseButton>
                </div>
              </div>
            </div>
          </div>
        </Teleport>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useCartIntegration } from '@/composables/useCartIntegration'
import UniversalCart from '@/components/cart/UniversalCart.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { httpClient } from '@/services/api/http-client'
import type { EquipmentResponse } from '@/types/equipment'

const route = useRoute()
const projectStore = useProjectStore()

const projectId = Number(route.params.id)

// Enhanced cart integration with scanner support
const cartIntegration = useCartIntegration({
  projectId,
  mode: 'equipment_add',
  enableScanner: true,
  autoShowOnAdd: true,
  maxItems: 50
})

// Equipment search state
const showEquipmentSearch = ref(false)
const searchQuery = ref('')
const searchResults = ref<EquipmentResponse[]>([])

async function generateDocument() {
  if (!projectId) return
  try {
    const response = await httpClient.get(`/projects/${projectId}/document`, {
      responseType: 'blob',
    })
    const blob = new Blob([response], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank')
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to generate document:', error)
  }
}

// Methods
async function handleEquipmentSearch() {
  if (!searchQuery.value.trim()) return

  const result = await cartIntegration.searchAndAddEquipment(searchQuery.value)
  searchResults.value = result.results

  if (result.errors.length > 0) {
    console.error('Search errors:', result.errors)
  }
}

async function addEquipmentFromSearch(equipment: EquipmentResponse) {
  const result = await cartIntegration.addEquipmentToCart(equipment, 1)
  if (result.success) {
    showEquipmentSearch.value = false
    searchQuery.value = ''
    searchResults.value = []
  }
}

// Lifecycle
onMounted(async () => {
  await projectStore.fetchProject(projectId)
  await cartIntegration.initializeCart(projectId)
})

watch(() => projectStore.currentProject, (newProject) => {
  if (newProject) {
    // Load existing bookings into cart for editing
    // This would be handled by the cart store's setItemsFromBookings method
  }
})

</script>

<style scoped>
.project-detail-view {
  @apply p-4;
}
</style>
