<template>
  <div class="stat-card" :class="cardClasses">
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <div class="stat-icon" :class="iconClasses">
          <svg v-if="icon === 'equipment'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <svg v-else-if="icon === 'calendar'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <svg v-else-if="icon === 'check'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <svg v-else-if="icon === 'wrench'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      </div>
      <div class="ml-5 w-0 flex-1">
        <dt class="text-sm font-medium text-gray-500 truncate">{{ title }}</dt>
        <dd class="flex items-baseline">
          <div v-if="loading" class="animate-pulse">
            <div class="h-6 bg-gray-200 rounded w-16"></div>
          </div>
          <div v-else class="text-2xl font-semibold text-gray-900">{{ formatValue }}</div>
          <div v-if="change" class="ml-2 flex items-baseline text-sm font-semibold" :class="changeClasses">
            <svg class="self-center flex-shrink-0 h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path v-if="change > 0" fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414 6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
              <path v-else fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
            <span class="sr-only">{{ change > 0 ? 'Increased' : 'Decreased' }} by</span>
            {{ Math.abs(change) }}{{ changeType }}
          </div>
        </dd>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  value: number | string
  icon?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'emerald' | 'purple'
  loading?: boolean
  change?: number
  changeType?: '%' | 'units'
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'default',
  color: 'blue',
  loading: false,
  changeType: 'units'
})

const cardClasses = computed(() => [
  'bg-white overflow-hidden shadow rounded-lg p-5 transition-all duration-200 hover:shadow-md'
])

const iconClasses = computed(() => {
  const baseClasses = 'flex items-center justify-center h-10 w-10 rounded-md'
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    emerald: 'bg-emerald-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    red: 'bg-red-500 text-white',
    purple: 'bg-purple-500 text-white',
  }
  return `${baseClasses} ${colorClasses[props.color]}`
})

const changeClasses = computed(() => {
  if (!props.change) return ''
  return props.change > 0 ? 'text-green-600' : 'text-red-600'
})

const formatValue = computed(() => {
  if (typeof props.value === 'string') return props.value

  // Format numbers with commas for thousands
  if (props.value >= 1000) {
    return props.value.toLocaleString()
  }

  return props.value.toString()
})
</script>

<style scoped>
.stat-card {
  /* Additional custom styles can go here */
}

.stat-icon {
  /* Icon-specific styles */
}
</style>
