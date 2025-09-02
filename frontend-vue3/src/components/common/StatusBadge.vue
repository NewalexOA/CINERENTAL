<template>
  <span class="status-badge" :class="badgeClasses">
    <svg v-if="showIcon" class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
      <!-- Project status icons -->
      <path v-if="status === 'ACTIVE'" fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
      <path v-else-if="status === 'PLANNING'" fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd"></path>
      <path v-else-if="status === 'IN_PROGRESS'" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
      <path v-else-if="status === 'COMPLETED'" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
      <path v-else-if="status === 'CANCELLED' || status === 'ON_HOLD'" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
      <path v-else-if="status === 'ARCHIVED'" fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd"></path>

      <!-- Equipment status icons (fallback) -->
      <path v-else-if="status === 'AVAILABLE'" fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
      <path v-else-if="status === 'RENTED'" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
      <path v-else-if="status === 'MAINTENANCE'" fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"></path>
      <path v-else-if="status === 'BROKEN'" fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>

      <!-- Default icon for unknown status -->
      <path v-else fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
    </svg>
    {{ statusLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ProjectStatus = 'ACTIVE' | 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD' | 'ARCHIVED'
type EquipmentStatus = 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'BROKEN' | 'RETIRED'
type StatusType = ProjectStatus | EquipmentStatus | string

interface Props {
  status: StatusType
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  type?: 'project' | 'equipment' | 'auto'
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: true,
  size: 'sm',
  type: 'auto'
})

// Project status configurations
const projectStatusConfig = {
  ACTIVE: {
    label: 'Active',
    classes: 'bg-green-100 text-green-800 border-green-200',
  },
  PLANNING: {
    label: 'Planning',
    classes: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  COMPLETED: {
    label: 'Completed',
    classes: 'bg-green-100 text-green-800 border-green-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    classes: 'bg-red-100 text-red-800 border-red-200',
  },
  ON_HOLD: {
    label: 'On Hold',
    classes: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  ARCHIVED: {
    label: 'Archived',
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
  }
} as const

// Equipment status configurations
const equipmentStatusConfig = {
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

// Auto-detect status type based on value
function detectStatusType(status: string): 'project' | 'equipment' {
  if (status in projectStatusConfig) {
    return 'project'
  }
  if (status in equipmentStatusConfig) {
    return 'equipment'
  }
  // Default fallback - if status contains common project keywords
  const projectKeywords = ['ACTIVE', 'PLANNING', 'PROGRESS', 'COMPLETED', 'CANCELLED', 'HOLD', 'ARCHIVED']
  return projectKeywords.some(keyword => status.toUpperCase().includes(keyword)) ? 'project' : 'equipment'
}

const statusType = computed(() => {
  if (props.type !== 'auto') {
    return props.type
  }
  return detectStatusType(props.status)
})

const statusConfig = computed(() => {
  return statusType.value === 'project' ? projectStatusConfig : equipmentStatusConfig
})

const statusLabel = computed(() => {
  const config = statusConfig.value as Record<string, { label: string; classes: string }>
  return config[props.status]?.label || props.status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
})

const badgeClasses = computed(() => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const baseClasses = 'inline-flex items-center font-medium rounded-full border'
  const config = statusConfig.value as Record<string, { label: string; classes: string }>
  const statusClasses = config[props.status]?.classes || 'bg-gray-100 text-gray-800 border-gray-200'
  const size = sizeClasses[props.size]

  return `${baseClasses} ${statusClasses} ${size}`
})
</script>

<style scoped>
.status-badge {
  /* Additional custom styles can go here */
}
</style>
