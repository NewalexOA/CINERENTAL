import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * Counter Store - Demo/Development Store
 *
 * This is a demonstration store used for development and testing purposes.
 * It intentionally does NOT use persistence as it's meant to be ephemeral.
 *
 * DO NOT add persistence to this store - it serves as an example of
 * non-persistent state management patterns.
 */
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  function decrement() {
    count.value--
  }

  function reset() {
    count.value = 0
  }

  return {
    // State
    count,

    // Computed
    doubleCount,

    // Actions
    increment,
    decrement,
    reset
  }
})
