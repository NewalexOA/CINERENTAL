# CODING STANDARDS & STYLE GUIDE

**Project**: CINERENTAL Vue3 Frontend Migration
**Document Version**: 1.0
**Date**: 2025-08-29
**Status**: Phase 1 - Development Standards
**Author**: Technical Standards Committee

---

## Executive Summary

This document establishes comprehensive coding standards and style guidelines for the CINERENTAL Vue3 frontend migration project. These standards ensure code consistency, maintainability, and quality across the development team while preserving business logic integrity during migration from Bootstrap + jQuery to Vue3 + TypeScript.

### Core Principles

1. **SLON**: Strive for Simplicity, Lean solutions, doing One clear thing, and No unnecessary overengineering
2. **Occam's Razor**: Every new entity or abstraction must justify its existence
3. **KISS**: Prefer the simplest working design; avoid cleverness that makes code harder to read
4. **DRY**: Don't repeat logic; extract shared parts into reusable components
5. **Root Cause over Symptoms**: Fix fundamental problems at their source

---

## Project Configuration

### TypeScript Configuration

#### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/composables/*": ["./src/composables/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    }
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.vue",
    "tests/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "coverage"
  ]
}
```

### ESLint Configuration

#### .eslintrc.js

```javascript
module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:vue/vue3-recommended',
    '@vue/typescript/recommended',
    '@vue/prettier'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: '@typescript-eslint/parser',
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
    'vue'
  ],
  rules: {
    // TypeScript specific
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/no-floating-promises': 'error',

    // Vue3 specific
    'vue/component-definition-name-casing': ['error', 'PascalCase'],
    'vue/component-name-in-template-casing': ['error', 'kebab-case'],
    'vue/custom-event-name-casing': ['error', 'kebab-case'],
    'vue/define-macros-order': ['error', {
      order: ['defineProps', 'defineEmits', 'defineExpose']
    }],
    'vue/no-unused-refs': 'error',
    'vue/prefer-true-attribute-shorthand': 'error',

    // General code quality
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': 'error'
  },
  overrides: [
    {
      files: ['tests/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off'
      }
    }
  ]
}
```

### Prettier Configuration

#### .prettierrc

```json
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "vueIndentScriptAndStyle": false,
  "htmlWhitespaceSensitivity": "ignore"
}
```

---

## Vue3 Component Standards

### Component Structure

#### Standard Component Template

```vue
<template>
  <!-- Use kebab-case for component names and props -->
  <div class="equipment-card" :class="cardClasses">
    <!-- Semantic HTML with proper accessibility -->
    <header class="equipment-card__header">
      <h3 class="equipment-card__title">{{ equipment.name }}</h3>
      <equipment-status-badge :status="equipment.status" />
    </header>

    <main class="equipment-card__content">
      <!-- Content structure -->
    </main>

    <footer class="equipment-card__actions">
      <!-- Action buttons with clear handlers -->
      <base-button
        variant="primary"
        size="sm"
        :disabled="isLoading"
        @click="handleAddToCart"
      >
        Add to Cart
      </base-button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Equipment, EquipmentStatus } from '@/types/equipment'

// Props interface - always define explicitly
interface Props {
  equipment: Equipment
  variant?: 'default' | 'compact' | 'detailed'
  disabled?: boolean
}

// Props with defaults
const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  disabled: false
})

// Emits - strongly typed
const emit = defineEmits<{
  'add-to-cart': [equipment: Equipment]
  'view-details': [equipmentId: string]
}>()

// Reactive state
const isLoading = ref(false)

// Computed properties
const cardClasses = computed(() => ({
  'equipment-card--compact': props.variant === 'compact',
  'equipment-card--detailed': props.variant === 'detailed',
  'equipment-card--disabled': props.disabled,
  'equipment-card--loading': isLoading.value
}))

// Methods
const handleAddToCart = async (): Promise<void> => {
  if (props.disabled || isLoading.value) return

  isLoading.value = true

  try {
    emit('add-to-cart', props.equipment)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* BEM-style CSS classes */
.equipment-card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-4;

  &--compact {
    @apply p-2;
  }

  &--disabled {
    @apply opacity-50 pointer-events-none;
  }

  &__header {
    @apply flex justify-between items-start mb-3;
  }

  &__title {
    @apply text-lg font-semibold text-gray-900 m-0;
  }

  &__content {
    @apply mb-4;
  }

  &__actions {
    @apply flex justify-end gap-2;
  }
}
</style>
```

### Component Naming Conventions

#### File and Component Names

```text
✅ Good Examples:
- EquipmentCard.vue
- ProjectDetailView.vue
- UniversalCartModal.vue
- ScannerInterface.vue
- BaseButton.vue

❌ Avoid:
- equipmentcard.vue
- project_detail_view.vue
- universalcart-modal.vue
- scanner.vue
- button.vue
```

#### Component Categories

**Base Components** (Prefix: `Base`):

- `BaseButton.vue`
- `BaseInput.vue`
- `BaseModal.vue`
- `BaseTable.vue`

**Business Components** (Domain-specific):

- `EquipmentCard.vue`
- `ProjectHeader.vue`
- `ScannerSession.vue`
- `CartItem.vue`

**Layout Components** (Prefix: `Layout`):

- `LayoutMain.vue`
- `LayoutSidebar.vue`
- `LayoutNavigation.vue`

**View Components** (Suffix: `View`):

- `DashboardView.vue`
- `EquipmentListView.vue`
- `ProjectDetailView.vue`

---

## TypeScript Standards

### Type Definitions

#### Interface Naming and Structure

```typescript
// types/equipment.ts

// Use PascalCase for interfaces
export interface Equipment {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly subcategory: string | null
  readonly serialNumber: string | null
  readonly barcode: string
  readonly status: EquipmentStatus
  readonly isUnique: boolean
  readonly dailyRate: number
  readonly replacementCost: number
  readonly createdAt: string
  readonly updatedAt: string
}

// Use discriminated unions for status types
export type EquipmentStatus =
  | 'AVAILABLE'
  | 'RENTED'
  | 'MAINTENANCE'
  | 'BROKEN'
  | 'RETIRED'

// Generic types for API responses
export interface PaginatedResponse<T> {
  readonly items: ReadonlyArray<T>
  readonly total: number
  readonly page: number
  readonly size: number
  readonly totalPages: number
}

// API request/response types
export interface EquipmentCreateRequest {
  name: string
  categoryId: string
  subcategoryId?: string
  serialNumber?: string
  dailyRate: number
  replacementCost: number
}

export interface EquipmentSearchQuery {
  query?: string
  categoryId?: string
  status?: EquipmentStatus
  page?: number
  size?: number
}
```

#### Function Type Definitions

```typescript
// Use explicit return types for all functions
export const fetchEquipment = async (
  params: EquipmentSearchQuery
): Promise<PaginatedResponse<Equipment>> => {
  const response = await apiClient.get<PaginatedResponse<Equipment>>('/api/v1/equipment/', {
    params
  })

  return response.data
}

// Use generics for reusable functions
export const createApiService = <T, K extends keyof T>(
  baseUrl: string,
  resourceName: string
): ApiService<T, K> => {
  return new ApiService(baseUrl, resourceName)
}

// Use function overloads for complex scenarios
export function useEquipmentFilter(): EquipmentFilterComposable
export function useEquipmentFilter(initialQuery: EquipmentSearchQuery): EquipmentFilterComposable
export function useEquipmentFilter(
  initialQuery?: EquipmentSearchQuery
): EquipmentFilterComposable {
  // Implementation
}
```

### Error Handling

#### Custom Error Classes

```typescript
// types/errors.ts

export abstract class AppError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number

  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ApiError extends AppError {
  readonly code = 'API_ERROR'

  constructor(
    public readonly statusCode: number,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, context)
  }
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR'
  readonly statusCode = 400

  constructor(
    message: string,
    public readonly field: string,
    context?: Record<string, unknown>
  ) {
    super(message, context)
  }
}

export class BusinessError extends AppError {
  readonly code = 'BUSINESS_ERROR'
  readonly statusCode = 422

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context)
  }
}
```

#### Error Handling Patterns

```typescript
// Use Result pattern for operations that can fail
export type Result<T, E = Error> = {
  success: true
  data: T
} | {
  success: false
  error: E
}

export const safeApiCall = async <T>(
  apiCall: () => Promise<T>
): Promise<Result<T, ApiError>> => {
  try {
    const data = await apiCall()
    return { success: true, data }
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error }
    }

    return {
      success: false,
      error: new ApiError(500, 'Unknown API error', { originalError: error })
    }
  }
}

// Usage in components
const handleSubmit = async (): Promise<void> => {
  const result = await safeApiCall(() => equipmentApi.create(formData.value))

  if (result.success) {
    notificationStore.success('Equipment created successfully')
    router.push(`/equipment/${result.data.id}`)
  } else {
    notificationStore.error(result.error.message)
  }
}
```

---

## Pinia Store Standards

### Store Structure

#### Standard Store Template

```typescript
// stores/equipment.ts

export interface EquipmentState {
  readonly equipment: Map<string, Equipment>
  readonly categories: ReadonlyArray<Category>
  readonly filters: EquipmentFilters
  readonly pagination: PaginationState
  readonly loading: LoadingState
  readonly errors: ErrorState
}

export const useEquipmentStore = defineStore('equipment', {
  state: (): EquipmentState => ({
    equipment: new Map(),
    categories: [],
    filters: {
      query: '',
      categoryId: null,
      status: null
    },
    pagination: {
      page: 1,
      size: 20,
      total: 0,
      totalPages: 0
    },
    loading: {
      equipment: false,
      categories: false,
      create: false,
      update: false,
      delete: false
    },
    errors: {
      equipment: null,
      categories: null,
      create: null,
      update: null,
      delete: null
    }
  }),

  getters: {
    // Use explicit return types for getters
    equipmentArray: (state): ReadonlyArray<Equipment> => {
      return Array.from(state.equipment.values())
    },

    filteredEquipment: (state): ReadonlyArray<Equipment> => {
      const equipment = Array.from(state.equipment.values())

      return equipment.filter(item => {
        if (state.filters.query && !item.name.toLowerCase().includes(state.filters.query.toLowerCase())) {
          return false
        }

        if (state.filters.categoryId && item.category !== state.filters.categoryId) {
          return false
        }

        if (state.filters.status && item.status !== state.filters.status) {
          return false
        }

        return true
      })
    },

    availableEquipment: (state): ReadonlyArray<Equipment> => {
      return Array.from(state.equipment.values()).filter(item => item.status === 'AVAILABLE')
    },

    // Computed properties for UI state
    hasEquipment: (state): boolean => state.equipment.size > 0,
    isLoading: (state): boolean => Object.values(state.loading).some(Boolean),
    hasErrors: (state): boolean => Object.values(state.errors).some(Boolean)
  },

  actions: {
    // Use explicit return types and error handling
    async fetchEquipment(params?: EquipmentSearchQuery): Promise<void> {
      this.loading.equipment = true
      this.errors.equipment = null

      try {
        const response = await equipmentApi.getEquipment(params)

        // Clear and repopulate equipment map
        this.equipment.clear()
        response.items.forEach(item => {
          this.equipment.set(item.id, item)
        })

        this.pagination = {
          page: response.page,
          size: response.size,
          total: response.total,
          totalPages: response.totalPages
        }
      } catch (error) {
        this.errors.equipment = error instanceof Error ? error.message : 'Failed to fetch equipment'
        throw error
      } finally {
        this.loading.equipment = false
      }
    },

    async createEquipment(data: EquipmentCreateRequest): Promise<Equipment> {
      this.loading.create = true
      this.errors.create = null

      try {
        const equipment = await equipmentApi.create(data)
        this.equipment.set(equipment.id, equipment)
        return equipment
      } catch (error) {
        this.errors.create = error instanceof Error ? error.message : 'Failed to create equipment'
        throw error
      } finally {
        this.loading.create = false
      }
    },

    // Optimistic updates for better UX
    async updateEquipment(id: string, data: Partial<Equipment>): Promise<void> {
      const originalEquipment = this.equipment.get(id)
      if (!originalEquipment) {
        throw new Error(`Equipment with id ${id} not found`)
      }

      // Optimistic update
      const updatedEquipment = { ...originalEquipment, ...data }
      this.equipment.set(id, updatedEquipment)

      this.loading.update = true
      this.errors.update = null

      try {
        const serverEquipment = await equipmentApi.update(id, data)
        this.equipment.set(id, serverEquipment)
      } catch (error) {
        // Revert optimistic update
        this.equipment.set(id, originalEquipment)
        this.errors.update = error instanceof Error ? error.message : 'Failed to update equipment'
        throw error
      } finally {
        this.loading.update = false
      }
    },

    // Filter management
    setFilters(filters: Partial<EquipmentFilters>): void {
      this.filters = { ...this.filters, ...filters }
    },

    clearFilters(): void {
      this.filters = {
        query: '',
        categoryId: null,
        status: null
      }
    },

    // Utility actions
    getEquipmentById(id: string): Equipment | undefined {
      return this.equipment.get(id)
    },

    hasEquipmentById(id: string): boolean {
      return this.equipment.has(id)
    }
  },

  // Persist cart and user preferences
  persist: {
    storage: localStorage,
    key: 'equipment-store',
    paths: ['filters'] // Only persist filters, not equipment data
  }
})
```

### Store Composition Patterns

#### Store Composables

```typescript
// composables/useEquipmentStore.ts

export const useEquipmentOperations = () => {
  const equipmentStore = useEquipmentStore()

  const searchEquipment = async (query: string): Promise<void> => {
    equipmentStore.setFilters({ query })
    await equipmentStore.fetchEquipment({
      query,
      page: 1,
      size: equipmentStore.pagination.size
    })
  }

  const filterByCategory = async (categoryId: string): Promise<void> => {
    equipmentStore.setFilters({ categoryId, page: 1 })
    await equipmentStore.fetchEquipment({
      categoryId,
      page: 1,
      size: equipmentStore.pagination.size
    })
  }

  const resetAndRefresh = async (): Promise<void> => {
    equipmentStore.clearFilters()
    await equipmentStore.fetchEquipment()
  }

  return {
    searchEquipment,
    filterByCategory,
    resetAndRefresh,

    // Reactive refs
    equipment: computed(() => equipmentStore.filteredEquipment),
    isLoading: computed(() => equipmentStore.isLoading),
    hasErrors: computed(() => equipmentStore.hasErrors)
  }
}
```

---

## Composable Standards

### Composable Structure

#### Standard Composable Template

```typescript
// composables/useEquipmentSearch.ts

export interface UseEquipmentSearchOptions {
  debounceMs?: number
  minQueryLength?: number
  autoSearch?: boolean
}

export interface UseEquipmentSearchReturn {
  readonly query: Ref<string>
  readonly results: ComputedRef<ReadonlyArray<Equipment>>
  readonly isSearching: ComputedRef<boolean>
  readonly error: ComputedRef<string | null>
  readonly hasResults: ComputedRef<boolean>
  readonly search: (query: string) => Promise<void>
  readonly clearResults: () => void
  readonly reset: () => void
}

export const useEquipmentSearch = (
  options: UseEquipmentSearchOptions = {}
): UseEquipmentSearchReturn => {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    autoSearch = true
  } = options

  // State
  const query = ref('')
  const results = ref<Equipment[]>([])
  const isSearching = ref(false)
  const error = ref<string | null>(null)

  // Computed properties
  const hasResults = computed(() => results.value.length > 0)
  const computedResults = computed(() => results.value as ReadonlyArray<Equipment>)
  const computedIsSearching = computed(() => isSearching.value)
  const computedError = computed(() => error.value)

  // Search function with error handling
  const search = async (searchQuery: string): Promise<void> => {
    if (searchQuery.length < minQueryLength) {
      results.value = []
      return
    }

    isSearching.value = true
    error.value = null

    try {
      const searchResults = await equipmentApi.search(searchQuery)
      results.value = searchResults
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Search failed'
      results.value = []
    } finally {
      isSearching.value = false
    }
  }

  // Debounced search
  const debouncedSearch = useDebounceFn(search, debounceMs)

  // Watch for automatic search
  if (autoSearch) {
    watch(query, (newQuery) => {
      if (newQuery.trim()) {
        void debouncedSearch(newQuery)
      } else {
        clearResults()
      }
    })
  }

  // Utility functions
  const clearResults = (): void => {
    results.value = []
    error.value = null
  }

  const reset = (): void => {
    query.value = ''
    clearResults()
  }

  // Cleanup on unmount
  onBeforeUnmount(() => {
    debouncedSearch.cancel()
  })

  return {
    query: readonly(query),
    results: computedResults,
    isSearching: computedIsSearching,
    error: computedError,
    hasResults,
    search,
    clearResults,
    reset
  }
}
```

### Composable Naming Conventions

#### Function Names

```text
✅ Good Examples:
- useEquipmentSearch()
- useCartOperations()
- useScannerSession()
- useApiClient()
- useNotifications()

❌ Avoid:
- equipmentSearch()
- cartOps()
- scanner()
- api()
- notify()
```

#### Return Object Structure

```typescript
// Always return an object with named properties
return {
  // State (readonly refs)
  items: readonly(items),
  isLoading: readonly(isLoading),
  error: readonly(error),

  // Computed properties
  hasItems: computed(() => items.value.length > 0),

  // Actions
  fetchItems,
  addItem,
  removeItem,

  // Utilities
  reset,
  refresh
}
```

---

## API Integration Standards

### API Service Structure

#### Base API Client

```typescript
// services/api/client.ts

export interface ApiClientConfig {
  baseURL: string
  timeout: number
  retryCount: number
  retryDelay: number
}

export class ApiClient {
  private readonly config: ApiClientConfig
  private readonly interceptors: Map<string, RequestInterceptor> = new Map()

  constructor(config: ApiClientConfig) {
    this.config = config
    this.setupInterceptors()
  }

  async request<T>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const requestConfig: RequestConfig = {
      method,
      url: `${this.config.baseURL}${url}`,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options?.headers
      }
    }

    // Apply interceptors
    for (const interceptor of this.interceptors.values()) {
      await interceptor(requestConfig)
    }

    // Add request data
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestConfig.body = JSON.stringify(data)
    }

    // Execute request with retry logic
    let lastError: Error
    for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
      try {
        const response = await fetch(requestConfig.url, requestConfig)

        if (!response.ok) {
          throw new ApiError(response.status, await response.text())
        }

        const result = await response.json() as T
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        if (attempt < this.config.retryCount && this.shouldRetry(error)) {
          await this.delay(this.config.retryDelay * (attempt + 1))
          continue
        }

        throw lastError
      }
    }

    throw lastError!
  }

  private setupInterceptors(): void {
    // Auth interceptor
    this.interceptors.set('auth', async (config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Request ID interceptor
    this.interceptors.set('requestId', async (config) => {
      config.headers = {
        ...config.headers,
        'X-Request-ID': crypto.randomUUID()
      }
    })
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof ApiError) {
      return error.statusCode >= 500 || error.statusCode === 429
    }
    return true // Retry network errors
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

#### Resource-Specific Services

```typescript
// services/api/equipment.ts

export class EquipmentApiService {
  constructor(private readonly client: ApiClient) {}

  async getEquipment(params?: EquipmentSearchQuery): Promise<PaginatedResponse<Equipment>> {
    const searchParams = this.buildSearchParams(params)
    const url = `/api/v1/equipment/?${searchParams.toString()}`

    return this.client.request<PaginatedResponse<Equipment>>('GET', url)
  }

  async getById(id: string): Promise<Equipment> {
    return this.client.request<Equipment>('GET', `/api/v1/equipment/${id}`)
  }

  async create(data: EquipmentCreateRequest): Promise<Equipment> {
    // Validate data before sending
    this.validateCreateRequest(data)

    return this.client.request<Equipment>('POST', '/api/v1/equipment/', data)
  }

  async update(id: string, data: Partial<Equipment>): Promise<Equipment> {
    return this.client.request<Equipment>('PATCH', `/api/v1/equipment/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await this.client.request<void>('DELETE', `/api/v1/equipment/${id}`)
  }

  async search(query: string): Promise<Equipment[]> {
    const params = new URLSearchParams({ q: query })
    return this.client.request<Equipment[]>('GET', `/api/v1/equipment/search?${params}`)
  }

  async searchByBarcode(barcode: string): Promise<Equipment | null> {
    try {
      return await this.client.request<Equipment>('GET', `/api/v1/equipment/barcode/${barcode}`)
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  private buildSearchParams(params?: EquipmentSearchQuery): URLSearchParams {
    const searchParams = new URLSearchParams()

    if (params?.query) searchParams.set('q', params.query)
    if (params?.categoryId) searchParams.set('category', params.categoryId)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.size) searchParams.set('size', params.size.toString())

    return searchParams
  }

  private validateCreateRequest(data: EquipmentCreateRequest): void {
    if (!data.name?.trim()) {
      throw new ValidationError('Equipment name is required', 'name')
    }

    if (!data.categoryId) {
      throw new ValidationError('Category is required', 'categoryId')
    }

    if (data.dailyRate <= 0) {
      throw new ValidationError('Daily rate must be positive', 'dailyRate')
    }
  }
}
```

---

## Testing Standards

### Unit Testing

#### Component Testing Template

```typescript
// tests/unit/components/EquipmentCard.spec.ts

describe('EquipmentCard', () => {
  // Test data factory
  const createMockEquipment = (overrides?: Partial<Equipment>): Equipment => ({
    id: '1',
    name: 'Professional Camera',
    category: 'Cameras',
    subcategory: 'DSLR',
    serialNumber: 'CAM-001',
    barcode: '123456789012',
    status: 'AVAILABLE',
    isUnique: true,
    dailyRate: 100.00,
    replacementCost: 5000.00,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides
  })

  // Test setup
  const createWrapper = (props?: Partial<ComponentProps<typeof EquipmentCard>>) => {
    return mount(EquipmentCard, {
      props: {
        equipment: createMockEquipment(),
        ...props
      },
      global: {
        plugins: [createTestingPinia()]
      }
    })
  }

  describe('Rendering', () => {
    it('should render equipment information correctly', () => {
      const equipment = createMockEquipment({
        name: 'Test Camera',
        category: 'Video Equipment'
      })

      const wrapper = createWrapper({ equipment })

      expect(wrapper.find('[data-test="equipment-name"]').text()).toBe('Test Camera')
      expect(wrapper.find('[data-test="equipment-category"]').text()).toBe('Video Equipment')
    })

    it('should render status badge with correct variant', () => {
      const equipment = createMockEquipment({ status: 'RENTED' })
      const wrapper = createWrapper({ equipment })

      const statusBadge = wrapper.findComponent('[data-test="status-badge"]')
      expect(statusBadge.props('status')).toBe('RENTED')
    })
  })

  describe('Interactions', () => {
    it('should emit add-to-cart event when button clicked', async () => {
      const equipment = createMockEquipment()
      const wrapper = createWrapper({ equipment })

      await wrapper.find('[data-test="add-to-cart-button"]').trigger('click')

      expect(wrapper.emitted('add-to-cart')).toBeTruthy()
      expect(wrapper.emitted('add-to-cart')?.[0]).toEqual([equipment])
    })

    it('should disable button when equipment is unavailable', () => {
      const equipment = createMockEquipment({ status: 'RENTED' })
      const wrapper = createWrapper({ equipment })

      const button = wrapper.find('[data-test="add-to-cart-button"]')
      expect(button.attributes('disabled')).toBeDefined()
    })
  })

  describe('Loading States', () => {
    it('should show loading state during async operations', async () => {
      const wrapper = createWrapper()

      // Mock loading state
      await wrapper.setData({ isLoading: true })

      expect(wrapper.find('[data-test="loading-spinner"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="add-to-cart-button"]').attributes('disabled')).toBeDefined()
    })
  })
})
```

#### Store Testing Template

```typescript
// tests/unit/stores/equipment.spec.ts

describe('useEquipmentStore', () => {
  let store: ReturnType<typeof useEquipmentStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useEquipmentStore()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('State Management', () => {
    it('should initialize with empty state', () => {
      expect(store.equipment.size).toBe(0)
      expect(store.equipmentArray).toEqual([])
      expect(store.hasEquipment).toBe(false)
    })

    it('should add equipment to store', () => {
      const equipment = createMockEquipment()

      store.equipment.set(equipment.id, equipment)

      expect(store.equipment.size).toBe(1)
      expect(store.hasEquipment).toBe(true)
      expect(store.getEquipmentById(equipment.id)).toEqual(equipment)
    })
  })

  describe('Actions', () => {
    it('should fetch equipment successfully', async () => {
      const mockResponse: PaginatedResponse<Equipment> = {
        items: [createMockEquipment(), createMockEquipment({ id: '2' })],
        total: 2,
        page: 1,
        size: 20,
        totalPages: 1
      }

      vi.mocked(equipmentApi.getEquipment).mockResolvedValue(mockResponse)

      await store.fetchEquipment()

      expect(store.equipment.size).toBe(2)
      expect(store.pagination.total).toBe(2)
      expect(store.loading.equipment).toBe(false)
    })

    it('should handle fetch equipment error', async () => {
      const error = new ApiError(500, 'Server error')
      vi.mocked(equipmentApi.getEquipment).mockRejectedValue(error)

      await expect(store.fetchEquipment()).rejects.toThrow('Server error')

      expect(store.errors.equipment).toBe('Server error')
      expect(store.loading.equipment).toBe(false)
    })
  })

  describe('Getters', () => {
    beforeEach(() => {
      store.equipment.set('1', createMockEquipment({ id: '1', status: 'AVAILABLE' }))
      store.equipment.set('2', createMockEquipment({ id: '2', status: 'RENTED' }))
      store.equipment.set('3', createMockEquipment({ id: '3', status: 'AVAILABLE' }))
    })

    it('should filter available equipment', () => {
      const available = store.availableEquipment

      expect(available).toHaveLength(2)
      expect(available.every(item => item.status === 'AVAILABLE')).toBe(true)
    })

    it('should filter equipment by query', () => {
      store.setFilters({ query: 'Professional' })

      const filtered = store.filteredEquipment

      expect(filtered.every(item =>
        item.name.toLowerCase().includes('professional')
      )).toBe(true)
    })
  })
})
```

### Integration Testing

#### API Integration Tests

```typescript
// tests/integration/api/equipment.spec.ts

describe('Equipment API Integration', () => {
  let apiClient: ApiClient
  let equipmentService: EquipmentApiService

  beforeEach(() => {
    apiClient = new ApiClient({
      baseURL: 'http://localhost:8000',
      timeout: 5000,
      retryCount: 2,
      retryDelay: 100
    })

    equipmentService = new EquipmentApiService(apiClient)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch equipment with pagination', async () => {
    const mockResponse: PaginatedResponse<Equipment> = {
      items: [createMockEquipment()],
      total: 1,
      page: 1,
      size: 20,
      totalPages: 1
    }

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    const result = await equipmentService.getEquipment({ page: 1, size: 20 })

    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/equipment/?page=1&size=20',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    )
  })

  it('should handle API errors gracefully', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 })
    )

    await expect(equipmentService.getEquipment()).rejects.toThrow(ApiError)
  })
})
```

---

## Performance Standards

### Bundle Size Optimization

#### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vue-vendor': ['vue', 'vue-router'],
          'pinia-vendor': ['pinia'],
          'ui-vendor': ['primevue/button', 'primevue/inputtext', 'primevue/dialog'],

          // Business logic chunks
          'equipment': [
            './src/components/equipment/EquipmentCard.vue',
            './src/views/EquipmentListView.vue',
            './src/stores/equipment.ts'
          ],
          'cart': [
            './src/components/cart/UniversalCart.vue',
            './src/stores/cart.ts',
            './src/composables/useCart.ts'
          ]
        }
      }
    },

    // Performance budgets
    chunkSizeWarningLimit: 1000, // 1MB warning
    assetsInlineLimit: 4096, // 4KB inline limit
  }
})
```

### Component Performance

#### Lazy Loading Implementation

```vue
<template>
  <div class="equipment-list">
    <!-- Synchronous critical content -->
    <equipment-search v-model="searchQuery" />

    <!-- Lazy loaded components -->
    <Suspense>
      <equipment-filters
        v-model="filters"
        :categories="categories"
      />
      <template #fallback>
        <filter-skeleton />
      </template>
    </Suspense>

    <!-- Virtual scrolling for large lists -->
    <virtual-list
      :items="filteredEquipment"
      :item-height="120"
      :buffer-size="10"
      #default="{ item }"
    >
      <equipment-card :equipment="item" />
    </virtual-list>
  </div>
</template>

<script setup lang="ts">
// Lazy load non-critical components
const EquipmentFilters = defineAsyncComponent(() => import('@/components/equipment/EquipmentFilters.vue'))
const FilterSkeleton = defineAsyncComponent(() => import('@/components/common/FilterSkeleton.vue'))
</script>
```

---

## Documentation Standards

### Component Documentation

#### JSDoc Comments

```typescript
/**
 * Universal Cart component supporting dual-mode operation (embedded/floating)
 *
 * @example
 * ```vue
 * <template>
 *   <universal-cart
 *     :config="cartConfig"
 *     @item-added="handleItemAdded"
 *     @action-executed="handleActionExecuted"
 *   />
 * </template>
 * ```
 */
export default defineComponent({
  name: 'UniversalCart',

  props: {
    /**
     * Cart configuration object defining behavior and appearance
     * @see {@link CartConfig} for available options
     */
    config: {
      type: Object as PropType<CartConfig>,
      required: true
    },

    /**
     * Initial visibility state for floating mode
     * @default false
     */
    initialVisible: {
      type: Boolean,
      default: false
    }
  },

  emits: {
    /**
     * Emitted when an item is successfully added to the cart
     * @param item - The equipment item that was added
     */
    'item-added': (item: CartItem) => true,

    /**
     * Emitted when a cart action (e.g., booking creation) is executed
     * @param result - The result of the action execution
     */
    'action-executed': (result: ActionResult) => true
  }
})
```

### README Templates

#### Component README Template

```markdown
# EquipmentCard

Equipment card component for displaying equipment information with actions.

## Usage

```vue
<template>
  <equipment-card
    :equipment="equipment"
    variant="compact"
    @add-to-cart="handleAddToCart"
    @view-details="handleViewDetails"
  />
</template>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `equipment` | `Equipment` | - | Equipment object to display |
| `variant` | `'default' \| 'compact' \| 'detailed'` | `'default'` | Display variant |
| `disabled` | `boolean` | `false` | Disable all interactions |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `add-to-cart` | `Equipment` | Emitted when add to cart button is clicked |
| `view-details` | `string` | Emitted when view details is clicked |

## Slots

| Slot | Description |
|------|-------------|
| `actions` | Custom action buttons |

## Examples

### Basic Usage

```vue
<equipment-card :equipment="equipment" />
```

### Compact Variant

```vue
<equipment-card :equipment="equipment" variant="compact" />
```

### Custom Actions

```vue
<equipment-card :equipment="equipment">
  <template #actions>
    <base-button @click="customAction">Custom Action</base-button>
  </template>
</equipment-card>
```

---

## Quality Gates

### Pre-Commit Checks

#### Husky Configuration

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,vue}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.vue": [
      "vue-tsc --noEmit"
    ]
  }
}
```

#### Commit Message Convention

```text
feat: add universal cart dual-mode support
fix: resolve scanner session persistence issue
docs: update component documentation for EquipmentCard
style: improve responsive design for mobile devices
refactor: optimize equipment search performance
test: add integration tests for cart operations
chore: update dependencies to latest versions

Breaking Changes:
BREAKING CHANGE: cart API now requires explicit configuration object
```

### CI/CD Quality Checks

#### GitHub Actions Workflow

```yaml
name: Quality Checks

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run bundle-analyzer
```

---

## Conclusion

These coding standards and style guidelines ensure consistent, maintainable, and high-quality Vue3 code for the CINERENTAL frontend migration. By following these standards, the development team can:

1. **Maintain Code Quality**: TypeScript strict mode and comprehensive linting
2. **Ensure Consistency**: Standardized naming conventions and component patterns
3. **Enable Collaboration**: Clear documentation and testing requirements
4. **Optimize Performance**: Bundle size management and lazy loading strategies
5. **Facilitate Maintenance**: Clean architecture and error handling patterns

### Next Steps

1. **Set up development environment** with all configuration files
2. **Create component library** following established patterns
3. **Implement testing framework** with coverage requirements
4. **Begin migration** of critical business components
5. **Establish code review process** with quality gates

These standards will be enforced through automated tooling and regular code reviews to ensure the Vue3 migration maintains the high quality standards expected for cinema equipment rental management operations.

---

*This Coding Standards & Style Guide serves as the authoritative reference for all Vue3 frontend development on the CINERENTAL project, ensuring consistent, maintainable, and high-quality code throughout the migration process.*
