# API Integration Specification for CINERENTAL Vue3 Frontend

## Executive Summary

This document provides comprehensive integration specifications for migrating from the existing jQuery-based frontend to Vue3 + TypeScript while maintaining full compatibility with the existing FastAPI backend. The backend API endpoints remain unchanged, requiring only frontend architectural changes.

**Target Architecture:**

- **Frontend**: Vue3 + TypeScript + Pinia + Axios
- **Backend**: FastAPI (unchanged) with REST endpoints at `/api/v1/*`
- **Authentication**: JWT token-based authentication
- **Data Format**: JSON request/response with Pydantic validation

---

## 1. API Client Architecture

### 1.1 Base HTTP Client Configuration

**File**: `src/services/api/http-client.ts`

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { ApiError, ValidationError } from '@/types/errors'

export interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

export interface ApiErrorResponse {
  detail: string | ValidationError[]
  status?: number
}

class HttpClient {
  private client: AxiosInstance

  constructor(baseURL: string = '/api/v1') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor for JWT token
    this.client.interceptors.request.use(
      (config) => {
        const authStore = useAuthStore()
        const token = authStore.token

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          const authStore = useAuthStore()
          authStore.logout()
        }

        return Promise.reject(this.transformError(error))
      }
    )
  }

  private transformError(error: any): ApiError {
    const response = error.response
    const data = response?.data as ApiErrorResponse

    return new ApiError(
      data?.detail || 'Network error occurred',
      response?.status || 500,
      data
    )
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }
}

export const httpClient = new HttpClient()
```

### 1.2 Error Handling Types

**File**: `src/types/errors.ts`

```typescript
export interface ValidationError {
  loc: string[]
  msg: string
  type: string
}

export class ApiError extends Error {
  public status: number
  public data?: any

  constructor(message: string, status: number = 500, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }

  get isValidationError(): boolean {
    return Array.isArray(this.data?.detail)
  }

  get validationErrors(): ValidationError[] {
    return this.isValidationError ? this.data.detail : []
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message)
    this.name = 'NetworkError'
  }
}
```

---

## 2. TypeScript Interface Definitions

### 2.1 Equipment Domain Types

**File**: `src/types/equipment.ts`

```typescript
export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  MAINTENANCE = 'MAINTENANCE',
  BROKEN = 'BROKEN',
  RETIRED = 'RETIRED',
}

export interface CategoryInfo {
  id: number
  name: string
}

export interface EquipmentBase {
  name: string
  description?: string
  category_id: number
}

export interface EquipmentCreate extends EquipmentBase {
  replacement_cost?: number
  custom_barcode?: string
  validate_barcode?: boolean
  serial_number?: string
  notes?: string
}

export interface EquipmentUpdate {
  name?: string
  description?: string
  replacement_cost?: number
  barcode?: string
  serial_number?: string
  category_id?: number
  status?: EquipmentStatus
}

export interface EquipmentResponse {
  id: number
  name: string
  description?: string
  replacement_cost?: number
  barcode: string
  serial_number?: string
  category_id: number
  status: EquipmentStatus
  created_at: string
  updated_at: string
  notes?: string
  category_name: string
  category?: CategoryInfo
  active_projects: Array<{
    id: number
    name: string
    start_date: string
    end_date: string
  }>
  daily_cost: number // computed field
}

export interface EquipmentAvailabilityResponse {
  equipment_id: number
  is_available: boolean
  conflicts: BookingConflictInfo[]
  available_quantity: number
  total_quantity: number
}

export interface BookingConflictInfo {
  booking_id: number
  project_name: string
  start_date: string
  end_date: string
  quantity: number
}
```

### 2.2 Project Domain Types

**File**: `src/types/project.ts`

```typescript
export enum ProjectStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ProjectBase {
  name: string
  client_id: number
  start_date: string
  end_date: string
  description?: string
  notes?: string
}

export interface ProjectCreate extends ProjectBase {
  status?: ProjectStatus
}

export interface ProjectResponse extends ProjectBase {
  id: number
  status: ProjectStatus
  created_at: string
  updated_at: string
  client_name: string
  total_cost: number
  bookings_count: number
}

export interface BookingCreateForProject {
  equipment_id: number
  start_date: string
  end_date: string
  quantity: number
}

export interface ProjectCreateWithBookings extends ProjectCreate {
  bookings: BookingCreateForProject[]
}

export interface ProjectWithBookings extends ProjectResponse {
  bookings: BookingResponse[]
  client: ClientInfo
}
```

### 2.3 Client Domain Types

**File**: `src/types/client.ts`

```typescript
export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export interface ClientBase {
  name: string
  email: string
  phone?: string
  address?: string
  company_name?: string
  tax_id?: string
  notes?: string
}

export interface ClientCreate extends ClientBase {
  status?: ClientStatus
}

export interface ClientUpdate extends Partial<ClientBase> {
  status?: ClientStatus
}

export interface ClientResponse extends ClientBase {
  id: number
  status: ClientStatus
  created_at: string
  updated_at: string
  projects_count: number
  total_bookings: number
  last_project_date?: string
}

export interface ClientInfo {
  id: number
  name: string
  email: string
  company_name?: string
}
```

### 2.4 Booking Domain Types

**File**: `src/types/booking.ts`

```typescript
export enum BookingStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface BookingBase {
  equipment_id: number
  project_id: number
  start_date: string
  end_date: string
  quantity: number
  daily_cost: number
  notes?: string
}

export interface BookingCreate extends BookingBase {
  status?: BookingStatus
  payment_status?: PaymentStatus
}

export interface BookingResponse extends BookingBase {
  id: number
  status: BookingStatus
  payment_status: PaymentStatus
  created_at: string
  updated_at: string
  total_cost: number
  equipment_name: string
  project_name: string
  client_name: string
}
```

---

## 3. API Service Layer

### 3.1 Equipment Service

**File**: `src/services/api/equipment.service.ts`

```typescript
import { httpClient } from './http-client'
import type {
  EquipmentResponse,
  EquipmentCreate,
  EquipmentUpdate,
  EquipmentAvailabilityResponse,
} from '@/types/equipment'

export interface EquipmentListParams {
  limit?: number
  offset?: number
  status?: string
  category_id?: number
  query?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface EquipmentAvailabilityParams {
  equipment_id: number
  start_date: string
  end_date: string
  exclude_booking_id?: number
}

export class EquipmentService {
  private readonly baseUrl = '/equipment'

  async getEquipmentList(params: EquipmentListParams = {}): Promise<EquipmentResponse[]> {
    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    const url = `${this.baseUrl}/?${queryParams.toString()}`
    return httpClient.get<EquipmentResponse[]>(url)
  }

  async getEquipment(id: number): Promise<EquipmentResponse> {
    return httpClient.get<EquipmentResponse>(`${this.baseUrl}/${id}`)
  }

  async createEquipment(data: EquipmentCreate): Promise<EquipmentResponse> {
    return httpClient.post<EquipmentResponse>(`${this.baseUrl}/`, data)
  }

  async updateEquipment(id: number, data: EquipmentUpdate): Promise<EquipmentResponse> {
    return httpClient.put<EquipmentResponse>(`${this.baseUrl}/${id}`, data)
  }

  async deleteEquipment(id: number): Promise<void> {
    return httpClient.delete<void>(`${this.baseUrl}/${id}`)
  }

  async checkAvailability(params: EquipmentAvailabilityParams): Promise<EquipmentAvailabilityResponse> {
    const queryParams = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
    })

    if (params.exclude_booking_id) {
      queryParams.append('exclude_booking_id', String(params.exclude_booking_id))
    }

    const url = `${this.baseUrl}/${params.equipment_id}/availability?${queryParams.toString()}`
    return httpClient.get<EquipmentAvailabilityResponse>(url)
  }

  async regenerateBarcode(equipmentId: number): Promise<EquipmentResponse> {
    return httpClient.post<EquipmentResponse>(`${this.baseUrl}/${equipmentId}/regenerate-barcode`)
  }

  async searchByBarcode(barcode: string): Promise<EquipmentResponse | null> {
    try {
      return await httpClient.get<EquipmentResponse>(`/barcode/search?barcode=${encodeURIComponent(barcode)}`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null
      }
      throw error
    }
  }
}

export const equipmentService = new EquipmentService()
```

### 3.2 Project Service

**File**: `src/services/api/project.service.ts`

```typescript
import { httpClient } from './http-client'
import type {
  ProjectResponse,
  ProjectCreate,
  ProjectUpdate,
  ProjectCreateWithBookings,
  ProjectWithBookings,
} from '@/types/project'

export interface ProjectListParams {
  limit?: number
  offset?: number
  client_id?: number
  project_status?: string
  start_date?: string
  end_date?: string
  query?: string
}

export class ProjectService {
  private readonly baseUrl = '/projects'

  async getProjects(params: ProjectListParams = {}): Promise<ProjectResponse[]> {
    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    const url = `${this.baseUrl}/?${queryParams.toString()}`
    return httpClient.get<ProjectResponse[]>(url)
  }

  async getProject(id: number): Promise<ProjectWithBookings> {
    return httpClient.get<ProjectWithBookings>(`${this.baseUrl}/${id}`)
  }

  async createProject(data: ProjectCreate): Promise<ProjectResponse> {
    return httpClient.post<ProjectResponse>(`${this.baseUrl}/`, data)
  }

  async createProjectWithBookings(data: ProjectCreateWithBookings): Promise<ProjectResponse> {
    return httpClient.post<ProjectResponse>(`${this.baseUrl}/with-bookings`, data)
  }

  async updateProject(id: number, data: ProjectUpdate): Promise<ProjectResponse> {
    return httpClient.put<ProjectResponse>(`${this.baseUrl}/${id}`, data)
  }

  async deleteProject(id: number): Promise<void> {
    return httpClient.delete<void>(`${this.baseUrl}/${id}`)
  }

  async duplicateProject(id: number): Promise<ProjectResponse> {
    return httpClient.post<ProjectResponse>(`${this.baseUrl}/${id}/duplicate`)
  }

  async getProjectPrintData(id: number): Promise<any> {
    return httpClient.get(`${this.baseUrl}/${id}/print`)
  }
}

export const projectService = new ProjectService()
```

### 3.3 Client Service

**File**: `src/services/api/client.service.ts`

```typescript
import { httpClient } from './http-client'
import type { ClientResponse, ClientCreate, ClientUpdate } from '@/types/client'

export interface ClientListParams {
  skip?: number
  limit?: number
  query?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export class ClientService {
  private readonly baseUrl = '/clients'

  async getClients(params: ClientListParams = {}): Promise<ClientResponse[]> {
    const queryParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })

    const url = `${this.baseUrl}/?${queryParams.toString()}`
    return httpClient.get<ClientResponse[]>(url)
  }

  async getClient(id: number): Promise<ClientResponse> {
    return httpClient.get<ClientResponse>(`${this.baseUrl}/${id}`)
  }

  async createClient(data: ClientCreate): Promise<ClientResponse> {
    return httpClient.post<ClientResponse>(`${this.baseUrl}/`, data)
  }

  async updateClient(id: number, data: ClientUpdate): Promise<ClientResponse> {
    return httpClient.put<ClientResponse>(`${this.baseUrl}/${id}`, data)
  }

  async deleteClient(id: number): Promise<void> {
    return httpClient.delete<void>(`${this.baseUrl}/${id}`)
  }

  async getClientBookings(id: number): Promise<any[]> {
    return httpClient.get<any[]>(`${this.baseUrl}/${id}/bookings`)
  }
}

export const clientService = new ClientService()
```

---

## 4. Vue3 Composables for API Integration

### 4.1 Equipment Composable

**File**: `src/composables/useEquipment.ts`

```typescript
import { ref, computed, type Ref } from 'vue'
import { equipmentService } from '@/services/api/equipment.service'
import { useAsyncState } from './useAsyncState'
import type { EquipmentResponse, EquipmentCreate, EquipmentUpdate } from '@/types/equipment'

export function useEquipment() {
  const equipment: Ref<EquipmentResponse[]> = ref([])
  const selectedEquipment: Ref<EquipmentResponse | null> = ref(null)

  const {
    loading: equipmentLoading,
    error: equipmentError,
    execute: executeEquipmentAction
  } = useAsyncState()

  // Get equipment list with filters
  const fetchEquipment = async (params = {}) => {
    return executeEquipmentAction(async () => {
      const result = await equipmentService.getEquipmentList(params)
      equipment.value = result
      return result
    })
  }

  // Get single equipment item
  const fetchEquipmentById = async (id: number) => {
    return executeEquipmentAction(async () => {
      const result = await equipmentService.getEquipment(id)
      selectedEquipment.value = result
      return result
    })
  }

  // Create new equipment
  const createEquipment = async (data: EquipmentCreate) => {
    return executeEquipmentAction(async () => {
      const result = await equipmentService.createEquipment(data)
      equipment.value.push(result)
      return result
    })
  }

  // Update equipment
  const updateEquipment = async (id: number, data: EquipmentUpdate) => {
    return executeEquipmentAction(async () => {
      const result = await equipmentService.updateEquipment(id, data)

      // Update in local state
      const index = equipment.value.findIndex(item => item.id === id)
      if (index !== -1) {
        equipment.value[index] = result
      }
      if (selectedEquipment.value?.id === id) {
        selectedEquipment.value = result
      }

      return result
    })
  }

  // Delete equipment
  const deleteEquipment = async (id: number) => {
    return executeEquipmentAction(async () => {
      await equipmentService.deleteEquipment(id)
      equipment.value = equipment.value.filter(item => item.id !== id)
      if (selectedEquipment.value?.id === id) {
        selectedEquipment.value = null
      }
    })
  }

  // Check availability
  const checkAvailability = async (params: any) => {
    return executeEquipmentAction(async () => {
      return await equipmentService.checkAvailability(params)
    })
  }

  // Search by barcode
  const searchByBarcode = async (barcode: string) => {
    return executeEquipmentAction(async () => {
      return await equipmentService.searchByBarcode(barcode)
    })
  }

  // Computed properties
  const availableEquipment = computed(() =>
    equipment.value.filter(item => item.status === 'AVAILABLE')
  )

  const equipmentByCategory = computed(() => {
    return equipment.value.reduce((acc, item) => {
      const category = item.category_name || 'Other'
      if (!acc[category]) acc[category] = []
      acc[category].push(item)
      return acc
    }, {} as Record<string, EquipmentResponse[]>)
  })

  return {
    // State
    equipment,
    selectedEquipment,
    equipmentLoading,
    equipmentError,

    // Actions
    fetchEquipment,
    fetchEquipmentById,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    checkAvailability,
    searchByBarcode,

    // Computed
    availableEquipment,
    equipmentByCategory,
  }
}
```

### 4.2 Async State Management Composable

**File**: `src/composables/useAsyncState.ts`

```typescript
import { ref, type Ref } from 'vue'
import { ApiError } from '@/types/errors'

export interface UseAsyncStateReturn {
  loading: Ref<boolean>
  error: Ref<string | null>
  execute: <T>(asyncFn: () => Promise<T>) => Promise<T | undefined>
  reset: () => void
}

export function useAsyncState(): UseAsyncStateReturn {
  const loading = ref(false)
  const error = ref<string | null>(null)

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
```

---

## 5. Pinia Store Integration

### 5.1 Equipment Store

**File**: `src/stores/equipment.ts`

```typescript
import { defineStore } from 'pinia'
import { equipmentService } from '@/services/api/equipment.service'
import type { EquipmentResponse, EquipmentCreate, EquipmentUpdate } from '@/types/equipment'

interface EquipmentState {
  items: EquipmentResponse[]
  selectedItem: EquipmentResponse | null
  loading: boolean
  error: string | null
  filters: {
    status?: string
    category_id?: number
    query?: string
  }
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export const useEquipmentStore = defineStore('equipment', {
  state: (): EquipmentState => ({
    items: [],
    selectedItem: null,
    loading: false,
    error: null,
    filters: {},
    pagination: {
      limit: 20,
      offset: 0,
      total: 0,
    },
  }),

  getters: {
    availableItems: (state) =>
      state.items.filter(item => item.status === 'AVAILABLE'),

    itemsByCategory: (state) => {
      return state.items.reduce((acc, item) => {
        const category = item.category_name || 'Other'
        if (!acc[category]) acc[category] = []
        acc[category].push(item)
        return acc
      }, {} as Record<string, EquipmentResponse[]>)
    },

    hasItems: (state) => state.items.length > 0,

    isLoading: (state) => state.loading,

    hasError: (state) => !!state.error,
  },

  actions: {
    async fetchItems(params = {}) {
      this.loading = true
      this.error = null

      try {
        const mergedParams = { ...this.filters, ...params }
        const items = await equipmentService.getEquipmentList(mergedParams)
        this.items = items
        this.pagination.total = items.length
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch equipment'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchItem(id: number) {
      this.loading = true
      this.error = null

      try {
        const item = await equipmentService.getEquipment(id)
        this.selectedItem = item
        return item
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch equipment'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createItem(data: EquipmentCreate) {
      this.loading = true
      this.error = null

      try {
        const newItem = await equipmentService.createEquipment(data)
        this.items.push(newItem)
        return newItem
      } catch (error: any) {
        this.error = error.message || 'Failed to create equipment'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateItem(id: number, data: EquipmentUpdate) {
      this.loading = true
      this.error = null

      try {
        const updatedItem = await equipmentService.updateEquipment(id, data)

        const index = this.items.findIndex(item => item.id === id)
        if (index !== -1) {
          this.items[index] = updatedItem
        }

        if (this.selectedItem?.id === id) {
          this.selectedItem = updatedItem
        }

        return updatedItem
      } catch (error: any) {
        this.error = error.message || 'Failed to update equipment'
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteItem(id: number) {
      this.loading = true
      this.error = null

      try {
        await equipmentService.deleteEquipment(id)
        this.items = this.items.filter(item => item.id !== id)

        if (this.selectedItem?.id === id) {
          this.selectedItem = null
        }
      } catch (error: any) {
        this.error = error.message || 'Failed to delete equipment'
        throw error
      } finally {
        this.loading = false
      }
    },

    setFilters(filters: Partial<EquipmentState['filters']>) {
      this.filters = { ...this.filters, ...filters }
    },

    clearFilters() {
      this.filters = {}
    },

    setSelectedItem(item: EquipmentResponse | null) {
      this.selectedItem = item
    },

    clearError() {
      this.error = null
    },
  },
})
```

### 5.2 Authentication Store

**File**: `src/stores/auth.ts`

```typescript
import { defineStore } from 'pinia'
import { httpClient } from '@/services/api/http-client'

interface User {
  id: number
  email: string
  name: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: localStorage.getItem('auth_token'),
    isAuthenticated: false,
    loading: false,
  }),

  getters: {
    isLoggedIn: (state) => state.isAuthenticated && !!state.token,
    userRole: (state) => state.user?.role,
  },

  actions: {
    async login(email: string, password: string) {
      this.loading = true

      try {
        const response = await httpClient.post('/auth/login', { email, password })

        this.token = response.access_token
        this.user = response.user
        this.isAuthenticated = true

        localStorage.setItem('auth_token', this.token)

        return response
      } catch (error) {
        this.logout()
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      this.user = null
      this.token = null
      this.isAuthenticated = false

      localStorage.removeItem('auth_token')
    },

    async checkAuth() {
      if (!this.token) {
        return false
      }

      try {
        const user = await httpClient.get('/auth/me')
        this.user = user
        this.isAuthenticated = true
        return true
      } catch (error) {
        this.logout()
        return false
      }
    },
  },
})
```

---

## 6. Error Handling and Loading States

### 6.1 Global Error Handler

**File**: `src/composables/useErrorHandler.ts`

```typescript
import { ref } from 'vue'
import { ApiError, ValidationError } from '@/types/errors'

export interface FormValidationErrors {
  [field: string]: string[]
}

export function useErrorHandler() {
  const globalError = ref<string | null>(null)
  const validationErrors = ref<FormValidationErrors>({})

  const handleError = (error: any) => {
    console.error('Error occurred:', error)

    if (error instanceof ApiError) {
      if (error.isValidationError) {
        // Handle validation errors
        validationErrors.value = transformValidationErrors(error.validationErrors)
        globalError.value = 'Please correct the validation errors below'
      } else {
        // Handle API errors
        globalError.value = error.message
        validationErrors.value = {}
      }
    } else {
      // Handle unexpected errors
      globalError.value = 'An unexpected error occurred. Please try again.'
      validationErrors.value = {}
    }
  }

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

  const clearErrors = () => {
    globalError.value = null
    validationErrors.value = {}
  }

  const clearFieldError = (field: string) => {
    if (validationErrors.value[field]) {
      delete validationErrors.value[field]
    }
  }

  return {
    globalError,
    validationErrors,
    handleError,
    clearErrors,
    clearFieldError,
  }
}
```

### 6.2 Loading State Composable

**File**: `src/composables/useLoadingState.ts`

```typescript
import { ref, computed, type Ref } from 'vue'

export interface UseLoadingStateReturn {
  loading: Ref<boolean>
  loadingStates: Ref<Record<string, boolean>>
  isLoading: (key?: string) => boolean
  setLoading: (key: string, state: boolean) => void
  startLoading: (key: string) => void
  stopLoading: (key: string) => void
  withLoading: <T>(key: string, fn: () => Promise<T>) => Promise<T>
}

export function useLoadingState(): UseLoadingStateReturn {
  const loadingStates = ref<Record<string, boolean>>({})

  const loading = computed(() =>
    Object.values(loadingStates.value).some(Boolean)
  )

  const isLoading = (key?: string) => {
    if (!key) return loading.value
    return loadingStates.value[key] || false
  }

  const setLoading = (key: string, state: boolean) => {
    loadingStates.value[key] = state
  }

  const startLoading = (key: string) => {
    setLoading(key, true)
  }

  const stopLoading = (key: string) => {
    setLoading(key, false)
  }

  const withLoading = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    try {
      startLoading(key)
      return await fn()
    } finally {
      stopLoading(key)
    }
  }

  return {
    loading,
    loadingStates,
    isLoading,
    setLoading,
    startLoading,
    stopLoading,
    withLoading,
  }
}
```

---

## 7. Real-time Updates Integration

### 7.1 WebSocket Integration Pattern

**File**: `src/services/websocket.ts`

```typescript
import { ref, onUnmounted } from 'vue'

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

export function useWebSocket(url: string) {
  const socket = ref<WebSocket | null>(null)
  const connected = ref(false)
  const messages = ref<WebSocketMessage[]>([])
  const error = ref<string | null>(null)

  const connect = () => {
    try {
      socket.value = new WebSocket(url)

      socket.value.onopen = () => {
        connected.value = true
        error.value = null
        console.log('WebSocket connected')
      }

      socket.value.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          messages.value.push(message)
          handleMessage(message)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      socket.value.onclose = () => {
        connected.value = false
        console.log('WebSocket disconnected')
      }

      socket.value.onerror = (err) => {
        error.value = 'WebSocket connection error'
        console.error('WebSocket error:', err)
      }
    } catch (err) {
      error.value = 'Failed to create WebSocket connection'
      console.error('WebSocket creation error:', err)
    }
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.close()
      socket.value = null
    }
  }

  const send = (message: any) => {
    if (socket.value && connected.value) {
      socket.value.send(JSON.stringify(message))
    }
  }

  const handleMessage = (message: WebSocketMessage) => {
    // Handle different message types
    switch (message.type) {
      case 'equipment_status_changed':
        // Update equipment store
        break
      case 'booking_updated':
        // Update booking store
        break
      // Add more cases as needed
    }
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    connected,
    messages,
    error,
    connect,
    disconnect,
    send,
  }
}
```

---

## 8. Pagination and Search Patterns

### 8.1 Pagination Composable

**File**: `src/composables/usePagination.ts`

```typescript
import { ref, computed, watch } from 'vue'

export interface PaginationOptions {
  limit?: number
  defaultLimit?: number
  maxLimit?: number
}

export function usePagination(
  fetchFn: (params: any) => Promise<any>,
  options: PaginationOptions = {}
) {
  const limit = ref(options.defaultLimit || 20)
  const offset = ref(0)
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const currentPage = computed({
    get: () => Math.floor(offset.value / limit.value) + 1,
    set: (page: number) => {
      offset.value = (page - 1) * limit.value
    },
  })

  const totalPages = computed(() => Math.ceil(total.value / limit.value))

  const hasNext = computed(() => currentPage.value < totalPages.value)
  const hasPrev = computed(() => currentPage.value > 1)

  const fetch = async (additionalParams = {}) => {
    loading.value = true
    error.value = null

    try {
      const params = {
        limit: limit.value,
        offset: offset.value,
        ...additionalParams,
      }

      const result = await fetchFn(params)

      // Assuming the API returns total count somehow
      // Adjust based on your actual API response structure
      if (result.total !== undefined) {
        total.value = result.total
      }

      return result
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch data'
      throw err
    } finally {
      loading.value = false
    }
  }

  const goToPage = async (page: number, additionalParams = {}) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
      await fetch(additionalParams)
    }
  }

  const nextPage = async (additionalParams = {}) => {
    if (hasNext.value) {
      await goToPage(currentPage.value + 1, additionalParams)
    }
  }

  const prevPage = async (additionalParams = {}) => {
    if (hasPrev.value) {
      await goToPage(currentPage.value - 1, additionalParams)
    }
  }

  const reset = () => {
    offset.value = 0
    total.value = 0
    error.value = null
  }

  return {
    // State
    limit,
    offset,
    total,
    loading,
    error,
    currentPage,
    totalPages,
    hasNext,
    hasPrev,

    // Actions
    fetch,
    goToPage,
    nextPage,
    prevPage,
    reset,
  }
}
```

### 8.2 Search and Filter Composable

**File**: `src/composables/useSearch.ts`

```typescript
import { ref, watch, computed } from 'vue'
import { debounce } from 'lodash-es'

export interface SearchOptions {
  debounceMs?: number
  minLength?: number
  immediate?: boolean
}

export function useSearch(
  searchFn: (query: string, filters: any) => Promise<any>,
  options: SearchOptions = {}
) {
  const query = ref('')
  const filters = ref<Record<string, any>>({})
  const results = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { debounceMs = 300, minLength = 2, immediate = false } = options

  const hasQuery = computed(() => query.value.length >= minLength)
  const hasFilters = computed(() => Object.keys(filters.value).length > 0)
  const canSearch = computed(() => hasQuery.value || hasFilters.value)

  const performSearch = async () => {
    if (!canSearch.value) {
      results.value = []
      return
    }

    loading.value = true
    error.value = null

    try {
      const result = await searchFn(query.value, filters.value)
      results.value = Array.isArray(result) ? result : []
    } catch (err: any) {
      error.value = err.message || 'Search failed'
      results.value = []
    } finally {
      loading.value = false
    }
  }

  const debouncedSearch = debounce(performSearch, debounceMs)

  const search = (newQuery?: string) => {
    if (newQuery !== undefined) {
      query.value = newQuery
    }
    debouncedSearch()
  }

  const setFilter = (key: string, value: any) => {
    if (value === null || value === undefined || value === '') {
      delete filters.value[key]
    } else {
      filters.value[key] = value
    }
    debouncedSearch()
  }

  const clearFilters = () => {
    filters.value = {}
    debouncedSearch()
  }

  const clearQuery = () => {
    query.value = ''
    debouncedSearch()
  }

  const clear = () => {
    query.value = ''
    filters.value = {}
    results.value = []
    error.value = null
  }

  // Auto-search when query or filters change
  watch([query, filters], () => {
    if (immediate || hasQuery.value || hasFilters.value) {
      debouncedSearch()
    }
  }, { deep: true })

  return {
    // State
    query,
    filters,
    results,
    loading,
    error,
    hasQuery,
    hasFilters,
    canSearch,

    // Actions
    search,
    setFilter,
    clearFilters,
    clearQuery,
    clear,
    performSearch,
  }
}
```

---

## 9. File Upload Integration

### 9.1 File Upload Service

**File**: `src/services/api/upload.service.ts`

```typescript
import { httpClient } from './http-client'

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResult {
  url: string
  filename: string
  size: number
  contentType: string
}

export class UploadService {
  async uploadFile(
    file: File,
    endpoint: string = '/upload',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const formData = new FormData()
    formData.append('file', file)

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          }
          onProgress(progress)
        }
      },
    }

    return httpClient.post<UploadResult>(endpoint, formData, config)
  }

  async uploadMultipleFiles(
    files: File[],
    endpoint: string = '/upload/multiple',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          }
          onProgress(progress)
        }
      },
    }

    return httpClient.post<UploadResult[]>(endpoint, formData, config)
  }
}

export const uploadService = new UploadService()
```

---

## 10. Universal Cart Integration

### 10.1 Cart Store

**File**: `src/stores/cart.ts`

```typescript
import { defineStore } from 'pinia'
import type { EquipmentResponse } from '@/types/equipment'

export interface CartItem {
  equipment: EquipmentResponse
  quantity: number
  startDate: string
  endDate: string
  notes?: string
  dailyCost: number
  totalCost: number
}

interface CartState {
  items: CartItem[]
  isVisible: boolean
  mode: 'equipment_add' | 'equipment_remove'
}

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    items: [],
    isVisible: false,
    mode: 'equipment_add',
  }),

  getters: {
    itemCount: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),

    totalCost: (state) => state.items.reduce((sum, item) => sum + item.totalCost, 0),

    hasItems: (state) => state.items.length > 0,

    getItemByEquipmentId: (state) => (equipmentId: number) =>
      state.items.find(item => item.equipment.id === equipmentId),
  },

  actions: {
    addItem(equipment: EquipmentResponse, quantity = 1, startDate: string, endDate: string, notes?: string) {
      const existingItem = this.getItemByEquipmentId(equipment.id)

      if (existingItem) {
        existingItem.quantity += quantity
        existingItem.totalCost = this.calculateTotalCost(
          existingItem.dailyCost,
          existingItem.quantity,
          startDate,
          endDate
        )
      } else {
        const dailyCost = equipment.daily_cost || 0
        const newItem: CartItem = {
          equipment,
          quantity,
          startDate,
          endDate,
          notes,
          dailyCost,
          totalCost: this.calculateTotalCost(dailyCost, quantity, startDate, endDate),
        }
        this.items.push(newItem)
      }

      this.saveToStorage()
    },

    removeItem(equipmentId: number) {
      this.items = this.items.filter(item => item.equipment.id !== equipmentId)
      this.saveToStorage()
    },

    updateItemQuantity(equipmentId: number, quantity: number) {
      const item = this.getItemByEquipmentId(equipmentId)
      if (item) {
        if (quantity <= 0) {
          this.removeItem(equipmentId)
        } else {
          item.quantity = quantity
          item.totalCost = this.calculateTotalCost(
            item.dailyCost,
            quantity,
            item.startDate,
            item.endDate
          )
        }
      }
      this.saveToStorage()
    },

    updateItemDates(equipmentId: number, startDate: string, endDate: string) {
      const item = this.getItemByEquipmentId(equipmentId)
      if (item) {
        item.startDate = startDate
        item.endDate = endDate
        item.totalCost = this.calculateTotalCost(
          item.dailyCost,
          item.quantity,
          startDate,
          endDate
        )
      }
      this.saveToStorage()
    },

    clearCart() {
      this.items = []
      this.saveToStorage()
    },

    toggleVisibility() {
      this.isVisible = !this.isVisible
    },

    show() {
      this.isVisible = true
    },

    hide() {
      this.isVisible = false
    },

    setMode(mode: 'equipment_add' | 'equipment_remove') {
      this.mode = mode
    },

    calculateTotalCost(dailyCost: number, quantity: number, startDate: string, endDate: string): number {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
      return dailyCost * quantity * days
    },

    saveToStorage() {
      try {
        localStorage.setItem('cart_items', JSON.stringify(this.items))
      } catch (error) {
        console.warn('Failed to save cart to localStorage:', error)
      }
    },

    loadFromStorage() {
      try {
        const saved = localStorage.getItem('cart_items')
        if (saved) {
          this.items = JSON.parse(saved)
        }
      } catch (error) {
        console.warn('Failed to load cart from localStorage:', error)
        this.items = []
      }
    },
  },
})
```

---

## 11. Scanner Integration Patterns

### 11.1 Barcode Scanner Composable

**File**: `src/composables/useScanner.ts`

```typescript
import { ref, onMounted, onUnmounted } from 'vue'
import { equipmentService } from '@/services/api/equipment.service'

export interface ScanResult {
  barcode: string
  equipment?: any
  success: boolean
  error?: string
}

export function useScanner() {
  const isActive = ref(false)
  const lastScanned = ref<string>('')
  const scanBuffer = ref<string>('')
  const scanTimeout = ref<number | null>(null)

  const onScan = ref<((result: ScanResult) => void) | null>(null)

  const SCAN_TIMEOUT = 100 // ms between characters for barcode completion
  const MIN_BARCODE_LENGTH = 8

  const handleKeyPress = async (event: KeyboardEvent) => {
    if (!isActive.value) return

    // Check if this is likely barcode scanner input (rapid keystrokes)
    if (scanTimeout.value) {
      clearTimeout(scanTimeout.value)
    }

    // Add character to buffer
    if (event.key.length === 1) {
      scanBuffer.value += event.key
    }

    // Handle Enter key (end of barcode)
    if (event.key === 'Enter') {
      await processScan()
      return
    }

    // Set timeout to process scan if no more input
    scanTimeout.value = window.setTimeout(async () => {
      if (scanBuffer.value.length >= MIN_BARCODE_LENGTH) {
        await processScan()
      } else {
        // Clear buffer if too short
        scanBuffer.value = ''
      }
    }, SCAN_TIMEOUT)
  }

  const processScan = async () => {
    const barcode = scanBuffer.value.trim()
    scanBuffer.value = ''

    if (!barcode || barcode === lastScanned.value) {
      return
    }

    lastScanned.value = barcode

    try {
      const equipment = await equipmentService.searchByBarcode(barcode)

      const result: ScanResult = {
        barcode,
        equipment,
        success: !!equipment,
        error: equipment ? undefined : 'Equipment not found',
      }

      if (onScan.value) {
        onScan.value(result)
      }
    } catch (error: any) {
      const result: ScanResult = {
        barcode,
        success: false,
        error: error.message || 'Failed to lookup equipment',
      }

      if (onScan.value) {
        onScan.value(result)
      }
    }
  }

  const startScanning = (callback?: (result: ScanResult) => void) => {
    isActive.value = true
    onScan.value = callback || null
    document.addEventListener('keydown', handleKeyPress)
  }

  const stopScanning = () => {
    isActive.value = false
    onScan.value = null
    scanBuffer.value = ''
    lastScanned.value = ''

    if (scanTimeout.value) {
      clearTimeout(scanTimeout.value)
    }

    document.removeEventListener('keydown', handleKeyPress)
  }

  const manualScan = async (barcode: string) => {
    try {
      const equipment = await equipmentService.searchByBarcode(barcode)

      const result: ScanResult = {
        barcode,
        equipment,
        success: !!equipment,
        error: equipment ? undefined : 'Equipment not found',
      }

      if (onScan.value) {
        onScan.value(result)
      }

      return result
    } catch (error: any) {
      const result: ScanResult = {
        barcode,
        success: false,
        error: error.message || 'Failed to lookup equipment',
      }

      if (onScan.value) {
        onScan.value(result)
      }

      return result
    }
  }

  onUnmounted(() => {
    stopScanning()
  })

  return {
    isActive,
    lastScanned,
    startScanning,
    stopScanning,
    manualScan,
  }
}
```

---

## 12. Testing Integration Strategies

### 12.1 API Service Testing Pattern

**File**: `src/services/api/__tests__/equipment.service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { equipmentService } from '../equipment.service'
import { httpClient } from '../http-client'
import type { EquipmentResponse, EquipmentCreate } from '@/types/equipment'

// Mock the http client
vi.mock('../http-client', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockHttpClient = vi.mocked(httpClient)

describe('EquipmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEquipmentList', () => {
    it('should fetch equipment list with default parameters', async () => {
      const mockData: EquipmentResponse[] = [
        {
          id: 1,
          name: 'Test Equipment',
          barcode: '12345678901',
          status: 'AVAILABLE',
          category_id: 1,
          category_name: 'Test Category',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          daily_cost: 100,
        },
      ] as EquipmentResponse[]

      mockHttpClient.get.mockResolvedValue(mockData)

      const result = await equipmentService.getEquipmentList()

      expect(mockHttpClient.get).toHaveBeenCalledWith('/equipment/?')
      expect(result).toEqual(mockData)
    })

    it('should fetch equipment list with filters', async () => {
      const params = {
        status: 'AVAILABLE',
        category_id: 1,
        query: 'test',
      }

      mockHttpClient.get.mockResolvedValue([])

      await equipmentService.getEquipmentList(params)

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/equipment/?status=AVAILABLE&category_id=1&query=test'
      )
    })
  })

  describe('createEquipment', () => {
    it('should create new equipment', async () => {
      const createData: EquipmentCreate = {
        name: 'New Equipment',
        description: 'Test description',
        category_id: 1,
        replacement_cost: 1000,
      }

      const mockResponse: EquipmentResponse = {
        id: 1,
        ...createData,
        barcode: '12345678901',
        status: 'AVAILABLE',
        category_name: 'Test Category',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        daily_cost: 10,
      } as EquipmentResponse

      mockHttpClient.post.mockResolvedValue(mockResponse)

      const result = await equipmentService.createEquipment(createData)

      expect(mockHttpClient.post).toHaveBeenCalledWith('/equipment/', createData)
      expect(result).toEqual(mockResponse)
    })
  })
})
```

### 12.2 Component Integration Testing

**File**: `src/components/__tests__/EquipmentList.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EquipmentList from '../EquipmentList.vue'
import { useEquipmentStore } from '@/stores/equipment'

// Mock API service
vi.mock('@/services/api/equipment.service', () => ({
  equipmentService: {
    getEquipmentList: vi.fn().mockResolvedValue([]),
  },
}))

describe('EquipmentList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render loading state', async () => {
    const wrapper = mount(EquipmentList)
    const store = useEquipmentStore()

    // Set loading state
    store.loading = true

    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)
  })

  it('should render equipment items', async () => {
    const wrapper = mount(EquipmentList)
    const store = useEquipmentStore()

    // Mock equipment data
    store.items = [
      {
        id: 1,
        name: 'Test Equipment',
        status: 'AVAILABLE',
        barcode: '12345678901',
        category_name: 'Test Category',
      },
    ] as any

    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="equipment-item"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test Equipment')
  })

  it('should handle equipment selection', async () => {
    const wrapper = mount(EquipmentList)
    const store = useEquipmentStore()

    store.items = [
      { id: 1, name: 'Test Equipment' },
    ] as any

    await wrapper.vm.$nextTick()

    const selectButton = wrapper.find('[data-testid="select-equipment"]')
    await selectButton.trigger('click')

    expect(store.selectedItem?.id).toBe(1)
  })
})
```

---

## 13. Performance Optimization Strategies

### 13.1 Request Caching

**File**: `src/services/api/cache.ts`

```typescript
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
      }
    }
  }
}

export const apiCache = new ApiCache()
```

### 13.2 Request Deduplication

**File**: `src/services/api/deduplication.ts`

```typescript
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>()

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key)
    })

    this.pendingRequests.set(key, promise)
    return promise
  }

  cancel(key: string): void {
    this.pendingRequests.delete(key)
  }

  clear(): void {
    this.pendingRequests.clear()
  }
}

export const requestDeduplicator = new RequestDeduplicator()
```

---

## 14. Implementation Guidelines

### 14.1 Migration Checklist

**Phase 1: Setup and Infrastructure**

- [ ] Install Vue3, TypeScript, Pinia, Axios dependencies
- [ ] Configure build tools and TypeScript compiler
- [ ] Set up development environment with hot reload
- [ ] Create basic project structure following Vue3 conventions

**Phase 2: API Integration Foundation**

- [ ] Implement HTTP client with interceptors
- [ ] Create TypeScript interfaces for all API entities
- [ ] Build error handling system with custom error classes
- [ ] Set up authentication store and JWT integration

**Phase 3: Service Layer Implementation**

- [ ] Create API service classes for all domains
- [ ] Implement request/response transformation
- [ ] Add request caching and deduplication
- [ ] Build pagination and search utilities

**Phase 4: State Management**

- [ ] Create Pinia stores for each domain
- [ ] Implement optimistic updates
- [ ] Add loading and error state management
- [ ] Build reactive data synchronization

**Phase 5: Component Integration**

- [ ] Create Vue3 composables for complex logic
- [ ] Build reusable API-connected components
- [ ] Implement Universal Cart integration
- [ ] Add barcode scanner integration

**Phase 6: Testing and Optimization**

- [ ] Write unit tests for services and composables
- [ ] Add integration tests for components
- [ ] Implement performance monitoring
- [ ] Optimize bundle size and loading

### 14.2 Best Practices

1. **Type Safety**: Always use TypeScript interfaces for API data
2. **Error Handling**: Implement comprehensive error boundaries
3. **Loading States**: Provide visual feedback for all async operations
4. **Caching**: Cache frequently accessed data with proper invalidation
5. **Testing**: Write tests for critical API integration paths
6. **Performance**: Use request deduplication and lazy loading
7. **Consistency**: Follow established patterns across all services

### 14.3 Common Pitfalls to Avoid

1. **Direct HTTP calls in components**: Always use service layer
2. **Ignoring error states**: Handle all possible error scenarios
3. **Over-caching**: Don't cache data that changes frequently
4. **Missing loading states**: Always show progress during API calls
5. **Tight coupling**: Keep components loosely coupled to API structure
6. **No request cancellation**: Cancel requests when components unmount

---

## Conclusion

This API Integration Specification provides a complete foundation for migrating the CINERENTAL frontend from jQuery to Vue3 + TypeScript while maintaining full compatibility with the existing FastAPI backend. The patterns and examples shown here enable immediate development start with clear, type-safe, and maintainable code.

All API endpoints remain unchanged, requiring only frontend architectural improvements to achieve modern development practices, better error handling, improved performance, and enhanced developer experience.

**Key Integration Points Summary:**

- **Equipment Management**: Full CRUD operations with barcode scanning
- **Project Management**: Complex booking workflows with availability checking
- **Universal Cart**: Reactive state management for equipment selection
- **Real-time Updates**: WebSocket integration for live data synchronization
- **Error Handling**: Comprehensive validation and user feedback
- **Performance**: Caching, pagination, and request optimization

The implementation should prioritize type safety, error resilience, and developer experience while maintaining the existing business logic and API contracts.
