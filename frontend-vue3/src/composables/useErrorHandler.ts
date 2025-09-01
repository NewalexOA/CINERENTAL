import { ref, readonly } from 'vue'
import { ApiError, ValidationError } from '@/types/errors'

export interface FormValidationErrors {
  [field: string]: string[]
}

/**
 * A composable for handling and transforming API errors, especially for forms.
 * @returns An object with reactive error states and handler functions.
 */
export function useErrorHandler() {
  const globalError = ref<string | null>(null)
  const validationErrors = ref<FormValidationErrors>({})

  /**
   * Processes an error, updating the global and validation error states.
   * @param {any} error The error to handle, typically from a catch block.
   */
  const handleError = (error: any) => {
    console.error('Error occurred:', error)

    if (error instanceof ApiError) {
      if (error.isValidationError) {
        // Handle validation errors
        validationErrors.value = transformValidationErrors(error.validationErrors)
        globalError.value = 'Please correct the validation errors below'
      } else {
        // Handle other API errors
        globalError.value = error.message
        validationErrors.value = {}
      }
    } else {
      // Handle unexpected errors
      globalError.value = 'An unexpected error occurred. Please try again.'
      validationErrors.value = {}
    }
  }

  /**
   * Transforms a FastAPI validation error array into a more usable object.
   * @param {ValidationError[]} errors The array of validation errors.
   * @returns {FormValidationErrors} An object mapping field names to error messages.
   */
  const transformValidationErrors = (errors: ValidationError[]): FormValidationErrors => {
    const result: FormValidationErrors = {}

    errors.forEach(error => {
      const field = error.loc.join('.')
      if (!result[field]) {
        result[field] = []
      }
      result[field].push(error.msg)
    })

    return result
  }

  /**
   * Clears all global and validation errors.
   */
  const clearErrors = () => {
    globalError.value = null
    validationErrors.value = {}
  }

  /**
   * Clears validation errors for a specific field.
   * @param {string} field The field name to clear errors for.
   */
  const clearFieldError = (field: string) => {
    if (validationErrors.value[field]) {
      delete validationErrors.value[field]
    }
  }

  return {
    globalError: readonly(globalError),
    validationErrors: readonly(validationErrors),
    handleError,
    clearErrors,
    clearFieldError,
  }
}
