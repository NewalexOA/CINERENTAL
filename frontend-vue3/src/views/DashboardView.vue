<template>
  <div class="dashboard-view">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p class="mt-2 text-sm text-gray-600">Cinema Equipment Rental Management</p>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Equipment"
        :value="dashboardStats.totalEquipment"
        icon="equipment"
        color="blue"
        :loading="loading"
      />
      <StatCard
        title="Active Rentals"
        :value="dashboardStats.activeRentals"
        icon="calendar"
        color="green"
        :loading="loading"
      />
      <StatCard
        title="Available Items"
        :value="dashboardStats.availableEquipment"
        icon="check"
        color="emerald"
        :loading="loading"
      />
      <StatCard
        title="Maintenance"
        :value="dashboardStats.maintenanceEquipment"
        icon="wrench"
        color="yellow"
        :loading="loading"
      />
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <!-- Equipment Actions -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div class="space-y-3">
          <RouterLink
            to="/equipment"
            class="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
          >
            <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <div>
              <div class="font-medium text-gray-900">Browse Equipment</div>
              <div class="text-sm text-gray-500">Find equipment for rental</div>
            </div>
          </RouterLink>

          <RouterLink
            to="/scanner"
            class="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
          >
            <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
            </svg>
            <div>
              <div class="font-medium text-gray-900">Barcode Scanner</div>
              <div class="text-sm text-gray-500">Quick equipment lookup</div>
            </div>
          </RouterLink>

          <RouterLink
            to="/projects"
            class="flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
          >
            <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            <div>
              <div class="font-medium text-gray-900">Manage Projects</div>
              <div class="text-sm text-gray-500">Create and track rentals</div>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div v-if="loading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div v-else class="space-y-4">
          <div v-for="activity in recentActivity" :key="activity.id" class="flex items-start">
            <div class="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
            <div class="ml-3">
              <p class="text-sm text-gray-900">{{ activity.description }}</p>
              <p class="text-xs text-gray-500">{{ formatRelativeTime(activity.timestamp) }}</p>
            </div>
          </div>
          <div v-if="recentActivity.length === 0" class="text-sm text-gray-500 text-center py-4">
            No recent activity
          </div>
        </div>
      </div>
    </div>

    <!-- Equipment Status Overview -->
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Equipment Status Overview</h2>
      <div v-if="loading" class="animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-full mb-4"></div>
        <div class="grid grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div v-else class="space-y-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div class="p-4 border rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ dashboardStats.availableEquipment }}</div>
            <div class="text-sm text-gray-600">Available</div>
          </div>
          <div class="p-4 border rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{ dashboardStats.rentedEquipment }}</div>
            <div class="text-sm text-gray-600">Rented</div>
          </div>
          <div class="p-4 border rounded-lg">
            <div class="text-2xl font-bold text-yellow-600">{{ dashboardStats.maintenanceEquipment }}</div>
            <div class="text-sm text-gray-600">Maintenance</div>
          </div>
          <div class="p-4 border rounded-lg">
            <div class="text-2xl font-bold text-red-600">{{ dashboardStats.brokenEquipment }}</div>
            <div class="text-sm text-gray-600">Broken</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import StatCard from '@/components/common/StatCard.vue'
import { dashboardService, type DashboardStats, type RecentActivity } from '@/services/api/dashboard'

// Dashboard state
const loading = ref(true)
const dashboardStats = ref<DashboardStats>({
  totalEquipment: 0,
  activeRentals: 0,
  availableEquipment: 0,
  rentedEquipment: 0,
  maintenanceEquipment: 0,
  brokenEquipment: 0,
})

const recentActivity = ref<RecentActivity[]>([])

// Fetch dashboard data
onMounted(async () => {
  await fetchDashboardData()
})

async function fetchDashboardData() {
  loading.value = true
  try {
    // Fetch real data from backend
    const [stats, activity] = await Promise.all([
      dashboardService.getDashboardStats(),
      dashboardService.getRecentActivity(),
    ])

    dashboardStats.value = stats
    recentActivity.value = activity
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    // Keep default values on error
  } finally {
    loading.value = false
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffInHours < 1) return 'Just now'
  if (diffInHours === 1) return '1 hour ago'
  if (diffInHours < 24) return `${diffInHours} hours ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays === 1) return '1 day ago'
  return `${diffInDays} days ago`
}
</script>
