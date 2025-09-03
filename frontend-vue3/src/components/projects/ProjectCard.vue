<template>
  <div
    v-memo="memoArray"
    :class="cardClasses"
    :data-testid="`project-card-${project.id}`"
    ref="cardElement"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Card Header -->
    <div class="p-4 border-b border-gray-100">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-semibold text-gray-900 truncate" :title="project.name">
            {{ project.name }}
          </h3>
          <p class="text-sm text-gray-600 mt-1 truncate" :title="project.client_name">
            <svg class="inline w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            {{ project.client_name }}
          </p>
        </div>
        <div class="flex-shrink-0 ml-4">
          <StatusBadge :status="project.status" type="project" />
        </div>
      </div>
    </div>

    <!-- Card Content -->
    <div class="p-4">
      <!-- Project Dates -->
      <div class="flex items-center text-sm text-gray-600 mb-3">
        <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <span class="font-medium">{{ formatDateRange(project.start_date, project.end_date) }}</span>
      </div>

      <!-- Project Description -->
      <div v-if="project.description" class="text-sm text-gray-700 mb-3">
        <p class="line-clamp-2" :title="project.description">
          {{ project.description }}
        </p>
      </div>

      <!-- Project Meta Info -->
      <div class="flex items-center justify-between text-xs text-gray-500">
        <div class="flex items-center">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>{{ formatDate(project.created_at) }}</span>
        </div>
        <div class="flex items-center">
          <span>Updated {{ formatDate(project.updated_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Card Actions -->
    <div class="px-4 py-3 bg-gray-50 border-t border-gray-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <!-- Quick Actions -->
          <BaseButton
            size="sm"
            variant="outline"
            @click="$emit('quick-edit', project)"
            class="text-xs"
          >
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Edit
          </BaseButton>
        </div>

        <router-link
          :to="{ name: 'project-detail', params: { id: project.id } }"
          class="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          View Details
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ProjectData } from '@/services/api/projects'
import BaseButton from '@/components/common/BaseButton.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useComponentMemoization } from '@/composables/useRenderOptimization'

interface Props {
  project: ProjectData
}

interface Emits {
  (e: 'quick-edit', project: ProjectData): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

// DOM optimization setup
const cardElement = ref<HTMLElement | null>(null)
const isHovered = ref(false)

// Component memoization for performance
const { memoArray } = useComponentMemoization(props, {
  keys: ['project.id', 'project.name', 'project.status', 'project.updated_at'],
  updateThreshold: 16
})

// Optimized computed classes
const cardClasses = computed(() => ({
  'project-card': true,
  'bg-white': true,
  'rounded-lg': true,
  'border': true,
  'border-gray-200': true,
  'overflow-hidden': true,
  'project-card--hovered': isHovered.value,
  'shadow-md': !isHovered.value,
  'shadow-lg': isHovered.value
}))

// GPU-optimized hover handlers
function handleMouseEnter() {
  isHovered.value = true
  if (cardElement.value) {
    cardElement.value.style.willChange = 'transform, box-shadow'
  }
}

function handleMouseLeave() {
  isHovered.value = false
  if (cardElement.value) {
    cardElement.value.style.willChange = 'auto'
  }
}

// Memoized date formatters for better performance
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric'
})

const dateFormatterWithYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})

// Utility functions for date formatting
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const currentYear = new Date().getFullYear()
    const formatter = date.getFullYear() !== currentYear ? dateFormatterWithYear : dateFormatter
    return formatter.format(date)
  } catch {
    return 'Invalid date'
  }
}

function formatDateRange(startDate: string, endDate: string): string {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const startFormatted = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
    const endFormatted = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })

    // If same month, show "Jan 15-20, 2024"
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`
    }

    return `${startFormatted} - ${endFormatted}`
  } catch {
    return 'Invalid date range'
  }
}
</script>

<style scoped>
.project-card {
  height: 280px; /* Fixed height for consistent virtual scrolling */
  display: flex;
  flex-direction: column;
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
  transform: translateZ(0); /* Force GPU layer */
}

.project-card--hovered {
  transform: translateY(-1px) translateZ(0);
}

/* Contain layout changes for better performance */
.project-card {
  contain: layout style;
}

/* Line clamp utility for description */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Status badge alignment */
.project-card .status-badge {
  flex-shrink: 0;
}

/* Performance-optimized responsive adjustments */
@media (max-width: 640px) {
  .project-card {
    height: auto;
    min-height: 280px;
    /* Reduce reflows on mobile */
    contain: layout;
  }

  .project-card .flex.items-start {
    flex-direction: column;
    align-items: stretch;
  }

  .project-card .flex-shrink-0.ml-4 {
    margin-left: 0;
    margin-top: 0.5rem;
    align-self: flex-start;
  }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .project-card {
    transition: none;
  }

  .project-card.loading::before {
    animation: none;
  }
}

/* GPU-accelerated loading state styles */
.project-card.loading {
  opacity: 0.7;
  pointer-events: none;
}

.project-card.loading::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  transform: translateZ(0); /* GPU acceleration */
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>
