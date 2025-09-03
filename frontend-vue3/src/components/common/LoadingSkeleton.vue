<template>
  <div :class="skeletonClasses" :style="skeletonStyle">
    <!-- Virtual Equipment List Skeleton -->
    <template v-if="variant === 'virtual-equipment-list'">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="i in itemCount"
          :key="`equipment-skeleton-${i}`"
          class="equipment-card-skeleton"
        >
          <div class="animate-pulse">
            <div class="bg-gray-200 h-48 rounded-t-lg mb-4"></div>
            <div class="px-4 pb-4">
              <div class="bg-gray-200 h-4 rounded mb-2"></div>
              <div class="bg-gray-200 h-3 rounded w-3/4 mb-2"></div>
              <div class="bg-gray-200 h-3 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Universal Cart Skeleton -->
    <template v-else-if="variant === 'universal-cart'">
      <div class="cart-skeleton">
        <div class="animate-pulse">
          <!-- Cart Header -->
          <div class="flex justify-between items-center p-4 border-b">
            <div class="bg-gray-200 h-6 w-24 rounded"></div>
            <div class="bg-gray-200 h-8 w-16 rounded"></div>
          </div>

          <!-- Cart Items -->
          <div class="p-4 space-y-3">
            <div v-for="i in itemCount" :key="`cart-item-${i}`" class="flex items-center space-x-3">
              <div class="bg-gray-200 h-12 w-12 rounded"></div>
              <div class="flex-1">
                <div class="bg-gray-200 h-4 rounded mb-1"></div>
                <div class="bg-gray-200 h-3 rounded w-1/2"></div>
              </div>
              <div class="bg-gray-200 h-8 w-16 rounded"></div>
            </div>
          </div>

          <!-- Cart Footer -->
          <div class="p-4 border-t">
            <div class="bg-gray-200 h-10 rounded"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- Virtual Projects List Skeleton -->
    <template v-else-if="variant === 'virtual-projects-list'">
      <div class="projects-skeleton space-y-4">
        <div
          v-for="i in itemCount"
          :key="`project-skeleton-${i}`"
          class="animate-pulse"
        >
          <div class="border rounded-lg p-4">
            <div class="flex items-center space-x-4">
              <div class="bg-gray-200 h-12 w-12 rounded-full"></div>
              <div class="flex-1">
                <div class="bg-gray-200 h-4 rounded mb-2"></div>
                <div class="bg-gray-200 h-3 rounded w-3/4"></div>
              </div>
              <div class="bg-gray-200 h-6 w-20 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Scanner Component Skeleton -->
    <template v-else-if="variant === 'scanner'">
      <div class="scanner-skeleton">
        <div class="animate-pulse">
          <div class="text-center p-8">
            <div class="bg-gray-200 h-24 w-24 rounded-full mx-auto mb-4"></div>
            <div class="bg-gray-200 h-4 rounded w-48 mx-auto mb-2"></div>
            <div class="bg-gray-200 h-3 rounded w-32 mx-auto"></div>
          </div>

          <div class="mt-6 space-y-4">
            <div class="bg-gray-200 h-12 rounded"></div>
            <div class="bg-gray-200 h-32 rounded"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- Generic Skeleton -->
    <template v-else>
      <div class="animate-pulse">
        <div
          v-for="i in itemCount"
          :key="`skeleton-${i}`"
          class="bg-gray-200 rounded mb-2"
          :style="{ height: `${height}px` }"
        ></div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'virtual-equipment-list' | 'universal-cart' | 'virtual-projects-list' | 'scanner' | 'generic'
  height?: number
  itemCount?: number
  fullHeight?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'generic',
  height: 60,
  itemCount: 6,
  fullHeight: false,
})

const skeletonClasses = computed(() => ({
  'loading-skeleton': true,
  'h-full': props.fullHeight,
  'w-full': true,
}))

const skeletonStyle = computed(() => ({
  minHeight: props.fullHeight ? '100%' : 'auto',
}))
</script>

<style scoped>
.loading-skeleton {
  @apply bg-gray-50 rounded-lg;
}

.equipment-card-skeleton {
  @apply bg-white border rounded-lg shadow-sm;
}

.cart-skeleton {
  @apply bg-white border rounded-lg shadow-sm;
}

.projects-skeleton {
  @apply space-y-4;
}

.scanner-skeleton {
  @apply bg-white border rounded-lg shadow-sm p-6;
}

/* Smooth animation for better UX */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
