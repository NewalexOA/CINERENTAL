<template>
  <component
    :is="tag"
    :class="buttonClasses"
    :disabled="disabled || loading"
    :type="type"
    v-bind="$attrs"
    @click="handleClick"
  >
    <BaseSpinner v-if="loading" :size="iconSize" />
    <BaseIcon v-else-if="icon" :name="icon" :size="iconSize" />

    <span v-if="$slots.default" class="button__text">
      <slot />
    </span>

    <BaseIcon v-if="trailingIcon" :name="trailingIcon" :size="iconSize" />
  </component>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import BaseSpinner from './BaseSpinner.vue';
import BaseIcon from './BaseIcon.vue';

interface Props {
  /**
   * The visual style of the button.
   * @type {'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'text' | 'success'}
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'text' | 'success'
  /**
   * The size of the button.
   * @type {'xs' | 'sm' | 'md' | 'lg' | 'xl'}
   * @default 'md'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /**
   * The name of the icon to display on the left.
   */
  icon?: string
  /**
   * The name of the icon to display on the right.
   */
  trailingIcon?: string
  /**
   * If true, shows a loading spinner and disables the button.
   * @default false
   */
  loading?: boolean
  /**
   * If true, disables the button.
   * @default false
   */
  disabled?: boolean
  /**
   * The HTML tag to use for the component.
   * @type {'button' | 'a'}
   * @default 'button'
   */
  tag?: 'button' | 'a'
  /**
   * The native type attribute for the button.
   * @type {'button' | 'submit' | 'reset'}
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  tag: 'button',
  type: 'button'
})

const emit = defineEmits<{
  /**
   * Emitted when the button is clicked.
   * @param {MouseEvent} event The click event.
   */
  click: [event: MouseEvent]
}>()

const slots = useSlots()

const buttonClasses = computed(() => ({
  'button': true,
  [`button--${props.variant}`]: true,
  [`button--${props.size}`]: true,
  'button--loading': props.loading,
  'button--disabled': props.disabled,
  'button--icon-only': !slots.default && (props.icon || props.loading)
}))

const iconSize = computed(() => {
  const sizeMap: Record<string, 'sm' | 'md' | 'lg'> = {
    xs: 'sm',
    sm: 'sm',
    md: 'md',
    lg: 'md',
    xl: 'lg'
  }
  return sizeMap[props.size]
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.button {
  @apply inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.button--xs {
  @apply px-2 py-1 text-xs rounded;
}

.button--sm {
  @apply px-3 py-1.5 text-sm rounded;
}

.button--md {
  @apply px-4 py-2 text-sm rounded-md;
}

.button--lg {
  @apply px-6 py-3 text-base rounded-md;
}

.button--xl {
  @apply px-8 py-4 text-lg rounded-lg;
}

.button--primary {
  @apply bg-primary-500 text-white hover:bg-primary-900 focus:ring-primary-500;
}

.button--secondary {
  @apply bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500;
}

.button--outline {
  @apply border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500;
}

.button--ghost {
  @apply text-gray-700 hover:bg-gray-100 focus:ring-gray-500;
}

.button--danger {
  @apply bg-red-500 text-white hover:bg-red-700 focus:ring-red-500;
}

.button--success {
  @apply bg-green-500 text-white hover:bg-green-700 focus:ring-green-500;
}

.button--text {
  @apply text-gray-600 hover:text-gray-900 hover:bg-gray-50 focus:ring-gray-500;
}

.button--disabled {
  @apply opacity-50 cursor-not-allowed;
}

.button--loading {
  @apply cursor-wait;
}

.button--icon-only {
  @apply p-2;
}

.button__text {
  @apply truncate;
}
</style>
