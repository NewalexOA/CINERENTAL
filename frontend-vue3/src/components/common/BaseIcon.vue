<template>
  <i :class="iconClasses"></i>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
})

const iconClasses = computed(() => [
  'fas',
  `fa-${props.name}`,
  {
    'fa-xs': props.size === 'xs',
    'fa-sm': props.size === 'sm',
    'fa-lg': props.size === 'lg',
    'fa-xl': props.size === 'xl',
  },
])
</script>
