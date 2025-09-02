<template>
  <div class="animate-pulse">
    <div class="skeleton-item" :style="{ height: `${height}px` }">
      <div class="skeleton-content" :class="variant">
        <!-- Equipment Card Skeleton -->
        <div v-if="variant === 'equipment-card'" class="p-4">
          <!-- Image placeholder -->
          <div class="aspect-w-16 aspect-h-9 bg-gray-300 rounded-lg mb-4"></div>

          <!-- Title and price -->
          <div class="flex justify-between items-start mb-2">
            <div class="h-6 bg-gray-300 rounded w-3/4"></div>
            <div class="h-6 bg-gray-300 rounded w-16"></div>
          </div>

          <!-- Category badge -->
          <div class="h-4 bg-gray-300 rounded-full w-20 mb-3"></div>

          <!-- Description -->
          <div class="space-y-2 mb-4">
            <div class="h-4 bg-gray-300 rounded w-full"></div>
            <div class="h-4 bg-gray-300 rounded w-2/3"></div>
          </div>

          <!-- Details grid -->
          <div class="grid grid-cols-2 gap-2 mb-4">
            <div class="h-3 bg-gray-300 rounded w-full"></div>
            <div class="h-3 bg-gray-300 rounded w-full"></div>
          </div>

          <!-- Buttons -->
          <div class="flex space-x-2">
            <div class="h-10 bg-gray-300 rounded flex-1"></div>
            <div class="h-10 bg-gray-300 rounded w-10"></div>
          </div>
        </div>

        <!-- Project Card Skeleton -->
        <div v-else-if="variant === 'project-card'" class="p-4">
          <!-- Header section -->
          <div class="border-b border-gray-200 pb-3 mb-3">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <!-- Project name -->
                <div class="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
                <!-- Client name -->
                <div class="h-4 bg-gray-300 rounded w-1/2"></div>
              </div>
              <!-- Status badge -->
              <div class="h-6 bg-gray-300 rounded-full w-20"></div>
            </div>
          </div>

          <!-- Date range -->
          <div class="flex items-center mb-3">
            <div class="h-4 bg-gray-300 rounded w-4 mr-2"></div>
            <div class="h-4 bg-gray-300 rounded w-32"></div>
          </div>

          <!-- Description -->
          <div class="space-y-2 mb-4">
            <div class="h-3 bg-gray-300 rounded w-full"></div>
            <div class="h-3 bg-gray-300 rounded w-4/5"></div>
          </div>

          <!-- Meta info and actions -->
          <div class="border-t border-gray-200 pt-3">
            <div class="flex justify-between items-center">
              <div class="h-8 bg-gray-300 rounded w-16"></div>
              <div class="h-8 bg-gray-300 rounded w-24"></div>
            </div>
          </div>
        </div>

        <!-- Generic skeleton -->
        <div v-else class="p-4">
          <div class="space-y-3">
            <div class="h-4 bg-gray-300 rounded w-3/4"></div>
            <div class="h-4 bg-gray-300 rounded w-1/2"></div>
            <div class="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  height?: number
  variant?: 'equipment-card' | 'project-card' | 'generic'
}

withDefaults(defineProps<Props>(), {
  height: 350, // Matches approximate EquipmentCard height
  variant: 'equipment-card'
})
</script>

<style scoped>
.skeleton-item {
  @apply w-full;
}

.skeleton-content {
  @apply bg-white rounded-lg shadow-sm border border-gray-200;
  height: 100%;
}

.aspect-w-16 {
  position: relative;
  width: 100%;
}

.aspect-w-16::before {
  content: '';
  display: block;
  padding-top: 56.25%; /* 16:9 aspect ratio */
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
