<template>
  <span class="status-badge" :class="badgeClasses">
    <svg v-if="showIcon" class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
      <path v-if="status === 'AVAILABLE'" fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
      <path v-else-if="status === 'RENTED'" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
      <path v-else-if="status === 'MAINTENANCE'" fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
      <path v-else-if="status === 'BROKEN'" fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      <path v-else fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
    </svg>
    {{ statusLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EquipmentStatus } from '@/types/equipment'

interface Props {
  status: EquipmentStatus
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: true,
  size: 'sm'
})

const statusConfig = {
  AVAILABLE: {
    label: 'Available',
    classes: 'bg-green-100 text-green-800 border-green-200',
  },
  RENTED: {
    label: 'Rented',
    classes: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  BROKEN: {
    label: 'Broken',
    classes: 'bg-red-100 text-red-800 border-red-200',
  },
  RETIRED: {
    label: 'Retired',
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
  }
} as const

const statusLabel = computed(() => {
  return statusConfig[props.status]?.label || props.status
})

const badgeClasses = computed(() => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const baseClasses = 'inline-flex items-center font-medium rounded-full border'
  const statusClasses = statusConfig[props.status]?.classes || 'bg-gray-100 text-gray-800 border-gray-200'
  const size = sizeClasses[props.size]

  return `${baseClasses} ${statusClasses} ${size}`
})
</script>

<style scoped>
.status-badge {
  /* Additional custom styles can go here */
}
</style>
