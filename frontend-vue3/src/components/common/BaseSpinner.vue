<template>
  <div class="spinner" :class="[`spinner--${size}`]"></div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  size: 'md',
})
</script>

<style scoped>
.spinner {
  @apply animate-spin rounded-full border-t-2 border-b-2 border-transparent;
}

.spinner--sm {
  @apply h-4 w-4 border-2;
}

.spinner--md {
  @apply h-6 w-6 border-4;
}

.spinner--lg {
  @apply h-8 w-8 border-4;
}
</style>
