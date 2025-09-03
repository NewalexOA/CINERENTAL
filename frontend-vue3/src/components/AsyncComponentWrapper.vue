<template>
  <Suspense>
    <component :is="asyncComponent" v-bind="componentProps" />
    <template #fallback>
      <component :is="fallbackComponent" v-bind="fallbackProps" />
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import { defineAsyncComponent, type Component } from 'vue'
import { performanceMonitor } from '@/utils/performance'

interface Props {
  componentLoader: () => Promise<Component>
  fallbackComponent?: Component
  componentProps?: Record<string, any>
  fallbackProps?: Record<string, any>
  chunkName?: string
}

const props = withDefaults(defineProps<Props>(), {
  componentProps: () => ({}),
  fallbackProps: () => ({}),
})

// Track loading performance
const asyncComponent = defineAsyncComponent({
  loader: async () => {
    const startTime = performance.now()

    try {
      const component = await props.componentLoader()
      const loadTime = performance.now() - startTime

      // Log chunk loading performance
      if (import.meta.env.DEV && props.chunkName) {
        console.group(`📦 Chunk Loading: ${props.chunkName}`)
        console.log(`Load Time: ${loadTime.toFixed(2)}ms`)
        console.groupEnd()
      }

      return component
    } catch (error) {
      console.error(`Failed to load async component ${props.chunkName || 'Unknown'}:`, error)
      throw error
    }
  },
  delay: 200, // Show fallback after 200ms
  timeout: 10000, // Timeout after 10s
  errorComponent: {
    template: `
      <div class="async-error p-4 border border-red-300 bg-red-50 rounded-lg">
        <h3 class="text-red-800 font-medium">Failed to load component</h3>
        <p class="text-red-600 text-sm mt-1">Please try refreshing the page.</p>
      </div>
    `
  },
  loadingComponent: props.fallbackComponent,
})
</script>

<style scoped>
.async-error {
  @apply text-center;
}
</style>
