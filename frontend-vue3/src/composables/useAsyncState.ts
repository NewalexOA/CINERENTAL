import { ref, type Ref } from 'vue'
import { ApiError } from '@/types/errors'

export interface UseAsyncStateReturn {
  loading: Ref<boolean>
  error: Ref<string | null>
  execute: <T>(asyncFn: () => Promise<T>) => Promise<T | undefined>
  reset: () => void
}

/**
 * A composable to manage the state of an asynchronous operation.
 * @returns {UseAsyncStateReturn} An object with reactive loading and error states, and an execute function.
 */
export function useAsyncState(): UseAsyncStateReturn {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Executes an asynchronous function and manages the loading and error states.
   * @param {() => Promise<T>} asyncFn The asynchronous function to execute.
   * @returns {Promise<T | undefined>} The result of the async function, or undefined if an error occurred.
   */
  const execute = async <T>(asyncFn: () => Promise<T>): Promise<T | undefined> => {
    try {
      loading.value = true
      error.value = null

      const result = await asyncFn()
      return result
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message
      } else {
        error.value = 'An unexpected error occurred'
      }

      console.error('Async operation failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Resets the loading and error states.
   */
  const reset = () => {
    loading.value = false
    error.value = null
  }

  return {
    loading,
    error,
    execute,
    reset,
  }
}
