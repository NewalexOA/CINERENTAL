<template>
  <div class="cart-demo">
    <div class="demo-header">
      <h1 class="page-title">Universal Cart Demo</h1>
      <p class="page-description">
        Demonstration of the Universal Cart Core Engine with dual-mode support,
        sophisticated business logic, and virtual scrolling.
      </p>
    </div>

    <div class="demo-content">
      <!-- Mode Selection -->
      <div class="demo-section">
        <h2 class="section-title">Cart Mode</h2>
        <div class="mode-selector">
          <BaseButton
            v-for="mode in cartModes"
            :key="mode.value"
            :variant="selectedMode === mode.value ? 'primary' : 'outline'"
            @click="setCartMode(mode.value)"
          >
            {{ mode.label }}
          </BaseButton>
        </div>
      </div>

      <!-- Sample Equipment -->
      <div class="demo-section">
        <h2 class="section-title">Sample Equipment</h2>
        <div class="equipment-grid">
          <div
            v-for="equipment in sampleEquipment"
            :key="equipment.id"
            class="equipment-card"
          >
            <div class="equipment-image">
              <img
                v-if="equipment.image_url"
                :src="equipment.image_url"
                :alt="equipment.name"
                class="w-full h-32 object-cover"
              >
              <div v-else class="w-full h-32 bg-gray-200 flex items-center justify-center">
                <svg class="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>

            <div class="equipment-info">
              <h3 class="equipment-name">{{ equipment.name }}</h3>
              <p class="equipment-description">{{ equipment.description }}</p>
              <div class="equipment-meta">
                <span class="barcode">{{ equipment.barcode }}</span>
                <span class="daily-cost">{{ formatCurrency(equipment.daily_cost) }}/day</span>
              </div>

              <div class="equipment-actions">
                <BaseButton
                  @click="addToCart(equipment)"
                  size="sm"
                  :disabled="cartStore.loading"
                >
                  Add to Cart
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cart Statistics -->
      <div class="demo-section">
        <h2 class="section-title">Cart Statistics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ cartStore.itemCount }}</div>
            <div class="stat-label">Items</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ cartStore.totalQuantity }}</div>
            <div class="stat-label">Total Quantity</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatCurrency(cartStore.totalCost) }}</div>
            <div class="stat-label">Total Cost</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ cartStore.isVisible ? 'Visible' : 'Hidden' }}</div>
            <div class="stat-label">Cart State</div>
          </div>
        </div>
      </div>

      <!-- Embedded Cart Container -->
      <div class="demo-section">
        <h2 class="section-title">Embedded Cart</h2>
        <div id="universalCartContainer" class="embedded-cart-container">
          <UniversalCart
            mode="embedded"
            :project-id="demoProjectId"
            :cart-mode="selectedMode"
            title="Demo Cart (Embedded)"
            :show-summary="true"
            :use-virtual-scrolling="true"
            @action-executed="handleActionExecuted"
            @cart-ready="handleCartReady"
          />
        </div>
      </div>

      <!-- Debug Information -->
      <div v-if="showDebug" class="demo-section">
        <h2 class="section-title">Debug Information</h2>
        <div class="debug-panel">
          <pre>{{ debugInfo }}</pre>
        </div>
      </div>
    </div>

    <!-- Floating Cart (will auto-detect and show only if no embedded container) -->
    <UniversalCart
      mode="auto"
      :project-id="demoProjectId"
      :cart-mode="selectedMode"
      @action-executed="handleActionExecuted"
      @mode-changed="handleModeChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '@/stores/cart'
import BaseButton from '@/components/common/BaseButton.vue'
import type { CartMode } from '@/types/cart'
import type { EquipmentResponse, EquipmentStatus } from '@/types/equipment'
import { useAsyncComponents } from '@/composables/useAsyncComponents'

// Use async component for UniversalCart to improve initial bundle size
const { UniversalCart } = useAsyncComponents()

// Demo state
const cartStore = useCartStore()
const selectedMode = ref<CartMode>('equipment_add')
const demoProjectId = ref(1)
const showDebug = ref(false)
const detectedCartMode = ref<'floating' | 'embedded'>('floating')

// Cart mode options
const cartModes = [
  { value: 'equipment_add' as CartMode, label: 'Add Equipment' },
  { value: 'equipment_remove' as CartMode, label: 'Remove Equipment' },
  { value: 'booking_edit' as CartMode, label: 'Edit Booking' }
]

// Sample equipment data
const sampleEquipment = ref<EquipmentResponse[]>([
  {
    id: 1,
    name: 'Canon EOS R5',
    description: 'Professional mirrorless camera with 45MP sensor',
    barcode: '12345678901',
    category_id: 1,
    category_name: 'Cameras',
    status: 'AVAILABLE' as EquipmentStatus,
    daily_cost: 150,
    replacement_cost: 3899,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    active_projects: [],
    image_url: 'https://via.placeholder.com/200x120/4F46E5/FFFFFF?text=Canon+R5'
  },
  {
    id: 2,
    name: 'Sony FX3',
    description: 'Compact full-frame cinema camera',
    barcode: '12345678902',
    category_id: 2,
    category_name: 'Video Cameras',
    status: 'AVAILABLE' as EquipmentStatus,
    daily_cost: 200,
    replacement_cost: 3898,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    active_projects: []
  },
  {
    id: 3,
    name: 'ARRI SkyPanel S60-C',
    description: 'LED soft light with color mixing',
    barcode: '12345678903',
    category_id: 3,
    category_name: 'Lighting',
    status: 'AVAILABLE' as EquipmentStatus,
    daily_cost: 75,
    replacement_cost: 1995,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    active_projects: [],
    image_url: 'https://via.placeholder.com/200x120/059669/FFFFFF?text=SkyPanel'
  },
  {
    id: 4,
    name: 'Sennheiser MKE 600',
    description: 'Professional shotgun microphone',
    barcode: '12345678904',
    category_id: 4,
    category_name: 'Audio',
    status: 'AVAILABLE' as EquipmentStatus,
    daily_cost: 25,
    replacement_cost: 349,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    active_projects: []
  },
  {
    id: 5,
    name: 'DJI Ronin 4D',
    description: 'All-in-one cinema camera with gimbal',
    barcode: '12345678905',
    category_id: 5,
    category_name: 'Stabilizers',
    status: 'AVAILABLE' as EquipmentStatus,
    daily_cost: 300,
    replacement_cost: 7199,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    active_projects: [],
    image_url: 'https://via.placeholder.com/200x120/DC2626/FFFFFF?text=Ronin+4D'
  }
])

// Debug information
const debugInfo = computed(() => ({
  cartMode: selectedMode.value,
  detectedMode: detectedCartMode.value,
  itemCount: cartStore.itemCount,
  totalCost: cartStore.totalCost,
  hasErrors: cartStore.hasErrors,
  errors: cartStore.errors,
  loading: cartStore.loading,
  config: cartStore.config
}))

// Methods
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

function setCartMode(mode: CartMode): void {
  selectedMode.value = mode
  cartStore.setMode(mode)
}

async function addToCart(equipment: EquipmentResponse): Promise<void> {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 8)

  const result = await cartStore.addItem({
    equipment,
    quantity: 1,
    startDate: tomorrow.toISOString().split('T')[0],
    endDate: nextWeek.toISOString().split('T')[0],
    dailyCost: equipment.daily_cost,
    notes: `Added via demo at ${new Date().toLocaleTimeString()}`
  })

  if (!result.success) {
    alert(`Failed to add item: ${result.message}`)
  }
}

function handleActionExecuted(result: any): void {
  console.log('Action executed:', result)
  alert(`Action executed successfully! ${result.length} bookings created.`)
}

function handleCartReady(): void {
  console.log('Cart is ready')
}

function handleModeChanged(mode: 'floating' | 'embedded'): void {
  detectedCartMode.value = mode
  console.log('Cart mode detected:', mode)
}

function toggleDebug(): void {
  showDebug.value = !showDebug.value
}

// Initialize demo
onMounted(async () => {
  await cartStore.loadCartForProject(demoProjectId.value)

  // Add some sample items to demonstrate the cart
  if (cartStore.itemCount === 0) {
    // Add first item automatically for demo
    await addToCart(sampleEquipment.value[0])
  }
})
</script>

<style scoped>
.cart-demo {
  @apply min-h-screen bg-gray-50 py-8;
}

.demo-header {
  @apply max-w-6xl mx-auto px-4 mb-8;
}

.page-title {
  @apply text-3xl font-bold text-gray-900 mb-2;
}

.page-description {
  @apply text-lg text-gray-600 max-w-3xl;
}

.demo-content {
  @apply max-w-6xl mx-auto px-4 space-y-8;
}

.demo-section {
  @apply bg-white rounded-lg shadow-sm p-6;
}

.section-title {
  @apply text-xl font-semibold text-gray-900 mb-4;
}

.mode-selector {
  @apply flex gap-2 flex-wrap;
}

.equipment-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.equipment-card {
  @apply border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow;
}

.equipment-info {
  @apply p-4;
}

.equipment-name {
  @apply font-semibold text-gray-900 mb-1;
}

.equipment-description {
  @apply text-sm text-gray-600 mb-2;
}

.equipment-meta {
  @apply flex justify-between items-center text-xs text-gray-500 mb-3;
}

.barcode {
  @apply font-mono bg-gray-100 px-2 py-1 rounded;
}

.daily-cost {
  @apply font-semibold text-green-600;
}

.equipment-actions {
  @apply flex justify-end;
}

.stats-grid {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4;
}

.stat-card {
  @apply bg-gray-50 rounded-lg p-4 text-center;
}

.stat-value {
  @apply text-2xl font-bold text-gray-900 mb-1;
}

.stat-label {
  @apply text-sm text-gray-600;
}

.embedded-cart-container {
  @apply border border-gray-200 rounded-lg min-h-[400px] p-4 bg-gray-50;
}

.debug-panel {
  @apply bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm;
  @apply font-mono max-h-96;
}

/* Fixed positioning for floating cart demo */
:deep(.cart--floating) {
  @apply bottom-4 right-4;
}

@media (max-width: 640px) {
  .equipment-grid {
    @apply grid-cols-1;
  }

  .stats-grid {
    @apply grid-cols-2;
  }
}
</style>
