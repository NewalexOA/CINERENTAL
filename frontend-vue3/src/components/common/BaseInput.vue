<template>
  <div class="input-group" :class="groupClasses">
    <label v-if="label" :for="inputId" class="input__label">
      {{ label }}
      <span v-if="required" class="input__required">*</span>
    </label>

    <div class="input__container">
      <BaseIcon
        v-if="icon"
        :name="icon"
        class="input__icon input__icon--leading"
      />

      <input
        :id="inputId"
        ref="inputRef"
        :class="inputClasses"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        v-bind="$attrs"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />

      <BaseIcon
        v-if="trailingIcon || (clearable && modelValue)"
        :name="clearable && modelValue ? 'x' : trailingIcon"
        class="input__icon input__icon--trailing"
        @click="handleTrailingIconClick"
      />
    </div>

    <div v-if="error || hint" class="input__help">
      <span v-if="error" class="input__error">{{ error }}</span>
      <span v-else-if="hint" class="input__hint">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseIcon from './BaseIcon.vue';

interface Props {
  /**
   * The value of the input.
   */
  modelValue: string | number
  /**
   * The label for the input, displayed above it.
   */
  label?: string
  /**
   * The placeholder text for the input.
   */
  placeholder?: string
  /**
   * The native type of the input element.
   * @default 'text'
   */
  type?: 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url'
  /**
   * The size of the input.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * The visual style of the input.
   * @default 'default'
   */
  variant?: 'default' | 'filled' | 'outlined'
  /**
   * An icon to display on the left side of the input.
   */
  icon?: string
  /**
   * An icon to display on the right side of the input.
   */
  trailingIcon?: string
  /**
   * If true, disables the input.
   * @default false
   */
  disabled?: boolean
  /**
   * If true, makes the input readonly.
   * @default false
   */
  readonly?: boolean
  /**
   * If true, marks the input as required.
   * @default false
   */
  required?: boolean
  /**
   * If true, shows a clear button when the input has a value.
   * @default false
   */
  clearable?: boolean
  /**
   * An error message to display below the input.
   */
  error?: string
  /**
   * A hint message to display below the input.
   */
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  variant: 'default'
})

const emit = defineEmits<{
  /**
   * Emitted when the input value changes.
   * @param {string | number} value The new value.
   */
  'update:modelValue': [value: string | number]
  /**
   * Emitted when the input loses focus.
   * @param {FocusEvent} event The blur event.
   */
  blur: [event: FocusEvent]
  /**
   * Emitted when the input gains focus.
   * @param {FocusEvent} event The focus event.
   */
  focus: [event: FocusEvent]
  /**
   * Emitted when the clear button is clicked.
   */
  clear: []
}>()

const inputRef = ref<HTMLInputElement>()
const isFocused = ref(false)
const inputId = `input-${Math.random().toString(36).substr(2, 9)}`

const groupClasses = computed(() => ({
  [`input-group--${props.size}`]: true,
  [`input-group--${props.variant}`]: true,
  'input-group--disabled': props.disabled,
  'input-group--error': !!props.error,
  'input-group--focused': isFocused.value
}))

const inputClasses = computed(() => ({
  'input': true,
  'input--with-leading-icon': !!props.icon,
  'input--with-trailing-icon': !!(props.trailingIcon || (props.clearable && props.modelValue))
}))

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const handleTrailingIconClick = () => {
  if (props.clearable && props.modelValue) {
    emit('update:modelValue', '')
    emit('clear')
    inputRef.value?.focus()
  }
}





defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur()
})
</script>

<style scoped>
.input-group {
  @apply w-full;
}

.input-group--sm .input__label {
  @apply text-sm;
}
.input-group--sm .input {
  @apply px-3 py-1.5 text-sm;
}

.input-group--md .input__label {
  @apply text-sm;
}
.input-group--md .input {
  @apply px-4 py-2 text-base;
}

.input-group--lg .input__label {
  @apply text-base;
}
.input-group--lg .input {
  @apply px-4 py-3 text-lg;
}

.input-group--disabled {
  @apply opacity-50 cursor-not-allowed;
}

.input-group--error .input {
  @apply border-red-300 focus:border-red-500 focus:ring-red-500;
}

.input-group--focused .input {
  @apply ring-2 ring-primary-500 ring-opacity-50;
}

.input__label {
  @apply block font-medium text-gray-700 mb-1;
}

.input__required {
  @apply text-red-500;
}

.input__container {
  @apply relative;
}

.input {
  @apply w-full border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors;
}

.input--with-leading-icon {
  @apply pl-10;
}

.input--with-trailing-icon {
  @apply pr-10;
}

.input__icon {
  @apply absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none;
}

.input__icon--leading {
  @apply left-3;
}

.input__icon--trailing {
  @apply right-3 cursor-pointer pointer-events-auto;
}

.input__help {
  @apply mt-1 text-sm;
}

.input__error {
  @apply text-red-600;
}

.input__hint {
  @apply text-gray-500;
}
</style>
