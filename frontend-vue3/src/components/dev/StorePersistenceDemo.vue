<template>
  <div class="store-persistence-demo p-6 bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Store Persistence Demo</h1>

      <!-- Global Storage Stats -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Global Storage Statistics</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ globalStats.totalKeys }}</div>
            <div class="text-sm text-gray-500">Total Keys</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ globalStats.cinerentalKeys }}</div>
            <div class="text-sm text-gray-500">Cinerental Keys</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">{{ formatBytes(globalStats.totalSize) }}</div>
            <div class="text-sm text-gray-500">Total Size</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">{{ formatBytes(globalStats.cinerentalSize) }}</div>
            <div class="text-sm text-gray-500">Cinerental Size</div>
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          <button @click="cleanupStorage" class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
            Cleanup Expired
          </button>
          <button @click="refreshStats" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Refresh Stats
          </button>
        </div>
      </div>

      <!-- Store-specific Persistence Info -->
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <!-- Equipment Store -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center">
            🛠️ Equipment Store
            <span v-if="equipmentStore.isDataStale" class="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              Stale
            </span>
          </h3>
          <div class="space-y-2 text-sm">
            <div><strong>Items:</strong> {{ equipmentStore.items.length }}</div>
            <div><strong>Cache:</strong> {{ equipmentStore.cacheInfo.hasCache ? '✅' : '❌' }}</div>
            <div><strong>Last Update:</strong> {{ equipmentStore.cacheInfo.lastUpdate || 'Never' }}</div>
            <div><strong>Size:</strong> {{ formatBytes(equipmentStore.cacheInfo.size || 0) }}</div>
          </div>
          <div class="mt-4 flex gap-2">
            <button @click="equipmentStore.refreshData()" class="bg-blue-500 text-white px-3 py-1 rounded text-sm">
              Refresh
            </button>
            <button @click="equipmentStore.clearCache()" class="bg-red-500 text-white px-3 py-1 rounded text-sm">
              Clear Cache
            </button>
          </div>
        </div>

        <!-- Projects Store -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center">
            📊 Projects Store
            <span v-if="projectsStore.isDataStale" class="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              Stale
            </span>
          </h3>
          <div class="space-y-2 text-sm">
            <div><strong>Projects:</strong> {{ projectsStore.projects.length }}</div>
            <div><strong>Cache:</strong> {{ projectsStore.cacheInfo.hasCache ? '✅' : '❌' }}</div>
            <div><strong>Last Update:</strong> {{ projectsStore.cacheInfo.lastUpdate || 'Never' }}</div>
            <div><strong>Size:</strong> {{ formatBytes(projectsStore.cacheInfo.size || 0) }}</div>
          </div>
          <div class="mt-4 flex gap-2">
            <button @click="projectsStore.refreshData()" class="bg-blue-500 text-white px-3 py-1 rounded text-sm">
              Refresh
            </button>
            <button @click="projectsStore.clearCache()" class="bg-red-500 text-white px-3 py-1 rounded text-sm">
              Clear Cache
            </button>
          </div>
        </div>

        <!-- Clients Store -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center">
            👥 Clients Store
            <span v-if="clientsStore.isDataStale" class="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              Stale
            </span>
          </h3>
          <div class="space-y-2 text-sm">
            <div><strong>Clients:</strong> {{ clientsStore.clients.length }}</div>
            <div><strong>Cache:</strong> {{ clientsStore.cacheInfo.hasCache ? '✅' : '❌' }}</div>
            <div><strong>Last Update:</strong> {{ clientsStore.cacheInfo.lastUpdate || 'Never' }}</div>
            <div><strong>Size:</strong> {{ formatBytes(clientsStore.cacheInfo.size || 0) }}</div>
          </div>
          <div class="mt-4 flex gap-2">
            <button @click="clientsStore.refreshData()" class="bg-blue-500 text-white px-3 py-1 rounded text-sm">
              Refresh
            </button>
            <button @click="clientsStore.clearCache()" class="bg-red-500 text-white px-3 py-1 rounded text-sm">
              Clear Cache
            </button>
          </div>
        </div>

        <!-- Bookings Store -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center">
            📅 Bookings Store
            <span v-if="bookingsStore.isDataStale" class="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              Stale
            </span>
          </h3>
          <div class="space-y-2 text-sm">
            <div><strong>Bookings:</strong> {{ bookingsStore.bookings.length }}</div>
            <div><strong>Cache:</strong> {{ bookingsStore.cacheInfo.hasCache ? '✅' : '❌' }}</div>
            <div><strong>Last Update:</strong> {{ bookingsStore.cacheInfo.lastUpdate || 'Never' }}</div>
            <div><strong>Size:</strong> {{ formatBytes(bookingsStore.cacheInfo.size || 0) }}</div>
          </div>
          <div class="mt-4 flex gap-2">
            <button @click="bookingsStore.refreshData()" class="bg-blue-500 text-white px-3 py-1 rounded text-sm">
              Refresh
            </button>
            <button @click="bookingsStore.clearCache()" class="bg-red-500 text-white px-3 py-1 rounded text-sm">
              Clear Cache
            </button>
          </div>
        </div>

        <!-- Scanner Store -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold mb-4">📷 Scanner Store</h3>
          <div class="space-y-2 text-sm">
            <div><strong>Sessions:</strong> {{ scannerStore.sessionCount }}</div>
            <div><strong>Total Items:</strong> {{ scannerStore.totalScannedItems }}</div>
            <div><strong>Cache:</strong> {{ scannerStore.cacheInfo.hasCache ? '✅' : '❌' }}</div>
            <div><strong>Last Activity:</strong> {{ scannerStore.cacheInfo.lastActivity || 'Never' }}</div>
            <div><strong>Size:</strong> {{ formatBytes(scannerStore.cacheInfo.size || 0) }}</div>
          </div>
          <div class="mt-4 flex gap-2">
            <button @click="createTestSession" class="bg-green-500 text-white px-3 py-1 rounded text-sm">
              Test Session
            </button>
            <button @click="scannerStore.clearCache()" class="bg-red-500 text-white px-3 py-1 rounded text-sm">
              Clear Cache
            </button>
          </div>
        </div>

        <!-- Auth Store -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold mb-4 flex items-center">
            🔐 Auth Store
            <span v-if="authStore.isLoggedIn" class="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Authenticated
            </span>
          </h3>
          <div class="space-y-2 text-sm">
            <div><strong>User:</strong> {{ authStore.user?.name || 'Not logged in' }}</div>
            <div><strong>Theme:</strong> {{ authStore.userPreferences.theme }}</div>
            <div><strong>Cache:</strong> {{ authStore.cacheInfo.hasCache ? '✅' : '❌' }}</div>
            <div><strong>Last Activity:</strong> {{ authStore.cacheInfo.lastActivity || 'Never' }}</div>
            <div><strong>Size:</strong> {{ formatBytes(authStore.cacheInfo.size || 0) }}</div>
          </div>
          <div class="mt-4 flex gap-2">
            <button @click="updateTheme" class="bg-purple-500 text-white px-3 py-1 rounded text-sm">
              Toggle Theme
            </button>
            <button @click="authStore.clearCache()" class="bg-red-500 text-white px-3 py-1 rounded text-sm">
              Clear Cache
            </button>
          </div>
        </div>
      </div>

      <!-- Persistence Features Demo -->
      <div class="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 class="text-xl font-semibold mb-4">Persistence Features Demo</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 bg-blue-50 rounded-lg">
            <h4 class="font-semibold text-blue-800 mb-2">✅ Compression</h4>
            <p class="text-sm text-blue-700">Large datasets are automatically compressed using LZ-string algorithm</p>
          </div>
          <div class="p-4 bg-green-50 rounded-lg">
            <h4 class="font-semibold text-green-800 mb-2">⏰ TTL Support</h4>
            <p class="text-sm text-green-700">Data automatically expires based on configurable TTL values</p>
          </div>
          <div class="p-4 bg-purple-50 rounded-lg">
            <h4 class="font-semibold text-purple-800 mb-2">🔄 Version Migration</h4>
            <p class="text-sm text-purple-700">Automatic data structure migration between versions</p>
          </div>
          <div class="p-4 bg-orange-50 rounded-lg">
            <h4 class="font-semibold text-orange-800 mb-2">🛡️ Error Recovery</h4>
            <p class="text-sm text-orange-700">Graceful handling of corrupted or invalid cached data</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useEquipmentStore } from '@/stores/equipment'
import { useProjectsStore } from '@/stores/projects'
import { useClientsStore } from '@/stores/clients'
import { useBookingsStore } from '@/stores/bookings'
import { useScannerStore } from '@/stores/scanner'
import { useAuthStore } from '@/stores/auth'
import { getStorageStats, cleanupExpiredStorage } from '@/plugins/store-persistence'

// Store instances
const equipmentStore = useEquipmentStore()
const projectsStore = useProjectsStore()
const clientsStore = useClientsStore()
const bookingsStore = useBookingsStore()
const scannerStore = useScannerStore()
const authStore = useAuthStore()

// Reactive stats
const globalStats = ref({
  totalKeys: 0,
  cinerentalKeys: 0,
  totalSize: 0,
  cinerentalSize: 0
})

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Refresh storage statistics
function refreshStats() {
  globalStats.value = getStorageStats()
}

// Clean up expired storage
function cleanupStorage() {
  cleanupExpiredStorage()
  refreshStats()
  console.log('🧹 Storage cleanup completed')
}

// Create a test scanner session
function createTestSession() {
  const sessionName = `Test Session ${new Date().toLocaleTimeString()}`
  scannerStore.createSession(sessionName)

  // Add some mock equipment to the session
  const mockEquipment = {
    id: Date.now(),
    name: 'Test Camera',
    barcode: '12345678901',
    serial_number: `SN${Date.now()}`,
    status: 'available' as const,
    daily_cost: 50,
    category_id: 1,
    category: { id: 1, name: 'Cameras' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  scannerStore.addEquipmentToSession(mockEquipment)
}

// Toggle theme preference
function updateTheme() {
  const themes = ['light', 'dark', 'auto'] as const
  const currentTheme = authStore.userPreferences.theme
  const currentIndex = themes.indexOf(currentTheme)
  const nextTheme = themes[(currentIndex + 1) % themes.length]

  authStore.updatePreferences({ theme: nextTheme })
}

// Auto-refresh stats
let statsInterval: number

onMounted(() => {
  refreshStats()
  // Refresh stats every 5 seconds
  statsInterval = setInterval(refreshStats, 5000)
})

onUnmounted(() => {
  if (statsInterval) {
    clearInterval(statsInterval)
  }
})
</script>

<style scoped>
/* Add any specific styling if needed */
</style>
