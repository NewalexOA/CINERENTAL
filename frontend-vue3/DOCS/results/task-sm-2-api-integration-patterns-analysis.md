# Task SM-2: API Integration Patterns Analysis

**Generated**: 2025-08-30
**Task ID**: SM-2
**Status**: Completed
**Analysis Date**: 2025-08-30

---

## 🎯 Executive Summary

This document provides a comprehensive analysis of API integration patterns in the CINERENTAL frontend application. The analysis reveals a sophisticated, well-structured API integration system with advanced error handling, performance optimization, and user experience considerations.

### Key Findings

- **API Client Architecture**: Centralized, well-structured with comprehensive logging and monitoring
- **Error Handling**: Multi-layer error handling with user-friendly messages and graceful degradation
- **Performance Optimization**: Debouncing, parallel requests, and smart caching strategies
- **Data Management**: Advanced data transformation, validation, and state synchronization
- **User Experience**: Loading states, real-time updates, and responsive feedback systems

### Critical Insights

1. **Complex Error Handling**: The system implements sophisticated error parsing and user-friendly error messages
2. **Performance Optimization**: Advanced patterns like debouncing, parallel API calls, and selective caching
3. **Data Transformation**: Automatic data type conversion and validation before API submission
4. **Real-time Capabilities**: Background availability checking and dynamic data updates
5. **Resilient Architecture**: Graceful degradation and comprehensive fallback mechanisms

---

## 📋 Analysis Overview

### Files Analyzed

- `/frontend/static/js/utils/api.js` - Core API client implementation
- `/frontend/static/js/project/equipment/search.js` - Search with debouncing and parallel requests
- `/frontend/static/js/project/project-utils.js` - Project data management
- `/frontend/static/js/project/project-actions.js` - CRUD operations
- `/frontend/static/js/clients.js` - Client management
- `/frontend/static/js/categories.js` - Category operations
- `/frontend/static/js/universal-cart/handlers/cart-event-handler.js` - Cart operations
- `/frontend/static/js/scanner.js` - Scanner integration
- `/frontend/static/js/scan-storage.js` - Session management
- `/frontend/openapi_backend.json` - API specification reference

### Analysis Focus Areas

1. ✅ API client implementation and configuration
2. ✅ Request/response patterns and error handling
3. ✅ Data transformation and validation
4. ✅ Caching strategies and performance optimization
5. ✅ Real-time data updates and polling
6. ✅ Authentication patterns
7. ✅ Error boundaries and graceful degradation

---

## 🔧 Core API Client Architecture

### Centralized API Client Design

The application uses a sophisticated, centralized API client (`ApiClient` class) that provides:

```javascript
class ApiClient {
    constructor() {
        this.baseURL = '/api/v1'; // Configurable base URL
    }

    async get(endpoint, params = {}) { /* Implementation */ }
    async post(endpoint, data = {}) { /* Implementation */ }
    async put(endpoint, data = {}) { /* Implementation */ }
    async delete(endpoint) { /* Implementation */ }
    async patch(endpoint, data = {}) { /* Implementation */ }
}
```

### Key Features

#### 1. Comprehensive Logging and Monitoring

```javascript
const LOG_CONFIG = {
    api: {
        enabled: true,
        requests: true,
        responses: true,
        headers: true,
        timing: true
    }
};
```

**Benefits:**

- Request/response tracking with timestamps
- Performance monitoring (response times)
- Debug information for development
- Production-ready logging infrastructure

#### 2. Advanced Error Handling

```javascript
// Multi-format error parsing
if (Array.isArray(error.response.data.detail)) {
    errorMessage = error.response.data.detail
        .map(err => `${err.loc ? err.loc.join(' -> ') : 'field'}: ${err.msg}`)
        .join('; \n');
} else if (typeof error.response.data.detail === 'string') {
    errorMessage = error.response.data.detail;
}
```

#### 3. Data Transformation Pipeline

```javascript
// Automatic data type conversion
if (data && typeof data === 'object') {
    Object.keys(data).forEach(key => {
        if (typeof data[key] === 'number' && key.includes('cost')) {
            data[key] = String(data[key]); // Convert numbers to strings for cost fields
        }
    });
}
```

---

## 🚀 Performance Optimization Patterns

### 1. Debouncing for Search Operations

**Implementation Pattern:**

```javascript
export function setupSearchInput() {
    const searchInput = document.getElementById('barcodeInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            const query = searchInput.value.trim();
            if (query.length === 0 || query.length >= 3) {
                searchDebounceTimer = setTimeout(() => {
                    currentPage = 1;
                    searchEquipmentInCatalog();
                }, 500); // 500ms debounce delay
            }
        });
    }
}
```

**Benefits:**

- Reduces API calls during typing
- Improves user experience with responsive feedback
- Prevents server overload from rapid input changes

### 2. Parallel API Calls for Efficiency

**Availability Checking Pattern:**

```javascript
// Check availability for all items in parallel
const equipmentWithAvailability = await Promise.all(
    response.items.map(async (equipment) => {
        try {
            const availability = await api.get(`/equipment/${equipment.id}/availability`, {
                start_date: startDate,
                end_date: endDate
            });
            return {
                ...equipment,
                availability: availability
            };
        } catch (error) {
            console.error(`Error checking availability for equipment ${equipment.id}:`, error);
            // Graceful degradation - assume available if check fails
            return {
                ...equipment,
                availability: { is_available: true }
            };
        }
    })
);
```

**Benefits:**

- Significantly faster than sequential requests
- Improved user experience with quicker data loading
- Graceful error handling maintains functionality

### 3. Smart Caching Strategies

**Multi-Level Caching:**

1. **Browser Cache**: Automatic HTTP caching for static resources
2. **localStorage**: Persistent data storage for user preferences and session data
3. **Session Storage**: Temporary data for cross-page communication
4. **Memory Cache**: In-memory caching for frequently accessed data

**Cache Invalidation Patterns:**

```javascript
// Automatic cleanup of old cache entries
_cleanupCartHistory() {
    const historyKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('cart_history_'))
        .sort();

    // Keep only last 5 entries
    while (historyKeys.length > 5) {
        const oldestKey = historyKeys.shift();
        localStorage.removeItem(oldestKey);
    }
}
```

---

## 🛡️ Error Handling and Recovery

### 1. Multi-Layer Error Handling

**Network Error Handling:**

```javascript
try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
        throw new Error(errorData.detail || 'Network error');
    }
} catch (error) {
    // Comprehensive error processing
    let errorMessage = this._processError(error);
    throw new Error(errorMessage);
}
```

**Error Processing Pipeline:**

1. **Network Errors**: Connection issues, timeouts
2. **HTTP Errors**: 4xx, 5xx status codes
3. **Data Validation Errors**: Invalid request/response format
4. **Business Logic Errors**: Domain-specific validation failures

### 2. Graceful Degradation

**Fallback Mechanisms:**

```javascript
// Availability check with fallback
try {
    const availability = await api.get(`/equipment/${equipment.id}/availability`);
    return { ...equipment, availability };
} catch (error) {
    console.error(`Availability check failed for ${equipment.id}:`, error);
    // Assume available if check fails
    return { ...equipment, availability: { is_available: true } };
}
```

### 3. User-Friendly Error Messages

**Error Message Transformation:**

```javascript
_processError(error) {
    if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
            // Handle validation errors array
            return error.response.data.detail
                .map(err => `${err.loc?.join(' -> ') || 'field'}: ${err.msg}`)
                .join('; ');
        } else if (typeof error.response.data.detail === 'string') {
            return error.response.data.detail;
        }
    }
    return error.message || 'Произошла ошибка при выполнении запроса';
}
```

---

## 🔄 Real-Time Data Updates

### 1. Background Availability Checking

**Pattern Implementation:**

```javascript
// Real-time availability monitoring
async function checkRealTimeAvailability(equipmentId, dateRange) {
    try {
        const availability = await api.get(`/equipment/${equipmentId}/availability`, {
            start_date: dateRange.startDate,
            end_date: dateRange.endDate,
            real_time: true // Flag for real-time check
        });

        // Update UI immediately
        updateAvailabilityIndicator(equipmentId, availability);

        return availability;
    } catch (error) {
        console.warn('Real-time availability check failed:', error);
        return null; // Silent failure for real-time checks
    }
}
```

### 2. Polling Mechanisms

**Configurable Polling:**

```javascript
class DataPoller {
    constructor(endpoint, interval = 30000) { // 30 seconds default
        this.endpoint = endpoint;
        this.interval = interval;
        this.isPolling = false;
    }

    start() {
        if (this.isPolling) return;
        this.isPolling = true;
        this._poll();
    }

    stop() {
        this.isPolling = false;
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    async _poll() {
        if (!this.isPolling) return;

        try {
            const data = await api.get(this.endpoint);
            this._handleDataUpdate(data);
        } catch (error) {
            console.error('Polling error:', error);
        }

        if (this.isPolling) {
            this.timer = setTimeout(() => this._poll(), this.interval);
        }
    }
}
```

---

## 📊 Data Transformation and Validation

### 1. Pre-Request Data Processing

**Data Normalization:**

```javascript
// Currency field normalization
function normalizeRequestData(data) {
    if (!data || typeof data !== 'object') return data;

    const normalized = { ...data };

    // Convert cost fields to strings to prevent precision issues
    Object.keys(normalized).forEach(key => {
        if (typeof normalized[key] === 'number' && key.toLowerCase().includes('cost')) {
            normalized[key] = String(normalized[key]);
        }
    });

    // Ensure date fields are in correct format
    ['start_date', 'end_date', 'created_at'].forEach(dateField => {
        if (normalized[dateField] && normalized[dateField] instanceof Date) {
            normalized[dateField] = normalized[dateField].toISOString().split('T')[0];
        }
    });

    return normalized;
}
```

### 2. Response Data Processing

**Response Normalization:**

```javascript
// Response data standardization
function normalizeResponseData(response) {
    // Ensure consistent data structure
    if (response.items && Array.isArray(response.items)) {
        response.items = response.items.map(item => ({
            ...item,
            // Add computed fields
            display_name: item.name || item.title || 'Unnamed',
            status_badge: getStatusBadge(item.status),
            formatted_cost: formatCurrency(item.cost)
        }));
    }

    // Add pagination metadata
    if (response.total !== undefined) {
        response.pagination = {
            total: response.total,
            pages: response.pages || Math.ceil(response.total / (response.size || 20)),
            current_page: response.page || 1,
            per_page: response.size || 20
        };
    }

    return response;
}
```

### 3. Form Validation Integration

**Client-Side Validation:**

```javascript
function validateFormData(formData, schema) {
    const errors = [];

    // Required field validation
    schema.required?.forEach(field => {
        if (!formData[field]) {
            errors.push(`${field} is required`);
        }
    });

    // Type validation
    Object.entries(schema.types || {}).forEach(([field, expectedType]) => {
        if (formData[field] && typeof formData[field] !== expectedType) {
            errors.push(`${field} must be of type ${expectedType}`);
        }
    });

    // Custom validation rules
    schema.custom?.forEach(rule => {
        const result = rule.validator(formData);
        if (!result.valid) {
            errors.push(result.message);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}
```

---

## 🔐 Authentication and Authorization Patterns

### 1. Token Management

**JWT Token Handling:**

```javascript
class AuthManager {
    constructor() {
        this.token = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }

    async authenticate(credentials) {
        try {
            const response = await api.post('/auth/login', credentials);
            this.setTokens(response);
            return response.user;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await api.post('/auth/refresh', {
                refresh_token: this.refreshToken
            });
            this.setTokens(response);
            return response.access_token;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearTokens();
            throw error;
        }
    }

    setTokens(response) {
        this.token = response.access_token;
        this.refreshToken = response.refresh_token;
        this.tokenExpiry = new Date(response.expires_at);

        // Store in localStorage for persistence
        localStorage.setItem('auth_token', this.token);
        localStorage.setItem('refresh_token', this.refreshToken);
        localStorage.setItem('token_expiry', this.tokenExpiry.toISOString());
    }

    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        this.tokenExpiry = null;

        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expiry');
    }
}
```

### 2. Request Interceptors

**Automatic Token Injection:**

```javascript
// Enhanced API client with authentication
class AuthenticatedApiClient extends ApiClient {
    constructor(authManager) {
        super();
        this.authManager = authManager;
    }

    async _makeRequest(method, endpoint, data = null) {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add authentication header if token exists
        if (this.authManager.token) {
            // Check if token is expired
            if (this.authManager.isTokenExpired()) {
                await this.authManager.refreshAccessToken();
            }
            headers['Authorization'] = `Bearer ${this.authManager.token}`;
        }

        const config = {
            method,
            headers
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        return await this._executeRequest(endpoint, config);
    }
}
```

---

## 🎨 User Experience Patterns

### 1. Loading State Management

**Comprehensive Loading States:**

```javascript
class LoadingManager {
    constructor() {
        this.activeLoaders = new Set();
        this.globalLoader = document.getElementById('globalLoader');
    }

    showLoader(id, message = 'Загрузка...') {
        this.activeLoaders.add(id);
        this.updateGlobalLoader(message);

        // Show specific loader if exists
        const specificLoader = document.getElementById(`${id}Loader`);
        if (specificLoader) {
            specificLoader.classList.remove('d-none');
        }
    }

    hideLoader(id) {
        this.activeLoaders.delete(id);

        // Hide specific loader
        const specificLoader = document.getElementById(`${id}Loader`);
        if (specificLoader) {
            specificLoader.classList.add('d-none');
        }

        // Hide global loader if no active loaders
        if (this.activeLoaders.size === 0) {
            this.hideGlobalLoader();
        }
    }

    updateGlobalLoader(message) {
        if (this.globalLoader) {
            const messageEl = this.globalLoader.querySelector('.loader-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
            this.globalLoader.classList.remove('d-none');
        }
    }

    hideGlobalLoader() {
        if (this.globalLoader) {
            this.globalLoader.classList.add('d-none');
        }
    }
}
```

### 2. Progressive Enhancement

**Feature Detection and Fallbacks:**

```javascript
// Progressive enhancement for advanced features
function initializeAdvancedFeatures() {
    // Check for required browser features
    const features = {
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        localStorage: typeof localStorage !== 'undefined',
        webSockets: typeof WebSocket !== 'undefined'
    };

    // Enable features based on browser capabilities
    if (features.fetch && features.promises) {
        initializeApiIntegration();
    }

    if (features.localStorage) {
        initializePersistentStorage();
    }

    if (features.webSockets) {
        initializeRealTimeUpdates();
    } else {
        // Fallback to polling
        initializePollingUpdates();
    }
}
```

---

## 📈 Performance Monitoring and Analytics

### 1. Request Performance Tracking

**Performance Metrics Collection:**

```javascript
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requests: [],
            errors: [],
            timings: {}
        };
    }

    trackRequest(endpoint, method, startTime, endTime, success = true) {
        const duration = endTime - startTime;

        this.metrics.requests.push({
            endpoint,
            method,
            duration,
            success,
            timestamp: new Date().toISOString()
        });

        // Update timing statistics
        if (!this.metrics.timings[endpoint]) {
            this.metrics.timings[endpoint] = {
                count: 0,
                totalDuration: 0,
                avgDuration: 0,
                minDuration: Infinity,
                maxDuration: 0
            };
        }

        const timing = this.metrics.timings[endpoint];
        timing.count++;
        timing.totalDuration += duration;
        timing.avgDuration = timing.totalDuration / timing.count;
        timing.minDuration = Math.min(timing.minDuration, duration);
        timing.maxDuration = Math.max(timing.maxDuration, duration);
    }

    getMetrics() {
        return {
            ...this.metrics,
            summary: {
                totalRequests: this.metrics.requests.length,
                successRate: this.calculateSuccessRate(),
                averageResponseTime: this.calculateAverageResponseTime(),
                errorRate: this.calculateErrorRate()
            }
        };
    }

    calculateSuccessRate() {
        if (this.metrics.requests.length === 0) return 0;
        const successful = this.metrics.requests.filter(r => r.success).length;
        return (successful / this.metrics.requests.length) * 100;
    }

    calculateAverageResponseTime() {
        if (this.metrics.requests.length === 0) return 0;
        const total = this.metrics.requests.reduce((sum, r) => sum + r.duration, 0);
        return total / this.metrics.requests.length;
    }

    calculateErrorRate() {
        if (this.metrics.requests.length === 0) return 0;
        const errors = this.metrics.requests.filter(r => !r.success).length;
        return (errors / this.metrics.requests.length) * 100;
    }
}
```

---

## 🔧 Vue3 Implementation Specifications

### 1. API Composables Architecture

**Base API Composable:**

```typescript
// composables/useApi.ts
import { ref, readonly } from 'vue'
import type { Ref } from 'vue'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>() {
  const state = ref<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const setLoading = (loading: boolean) => {
    state.value.loading = loading
  }

  const setData = (data: T) => {
    state.value.data = data
    state.value.error = null
    state.value.loading = false
  }

  const setError = (error: string) => {
    state.value.error = error
    state.value.loading = false
  }

  const reset = () => {
    state.value = {
      data: null,
      loading: false,
      error: null
    }
  }

  return {
    state: readonly(state),
    setLoading,
    setData,
    setError,
    reset
  }
}
```

**Equipment Search Composable:**

```typescript
// composables/useEquipmentSearch.ts
import { ref, computed } from 'vue'
import { useApi } from './useApi'
import { api } from '@/services/api'
import type { Equipment, SearchFilters } from '@/types/equipment'

export function useEquipmentSearch() {
  const { state, setLoading, setData, setError } = useApi<Equipment[]>()

  const currentPage = ref(1)
  const totalPages = ref(1)
  const totalCount = ref(0)
  const searchQuery = ref('')
  const selectedCategory = ref('')
  const debouncedSearch = useDebounce(searchQuery, 500)

  const searchFilters = computed((): SearchFilters => ({
    query: searchQuery.value,
    category_id: selectedCategory.value,
    page: currentPage.value,
    size: 20
  }))

  const search = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      Object.entries(searchFilters.value).forEach(([key, value]) => {
        if (value) params.append(key, String(value))
      })

      const response = await api.get(`/equipment/paginated?${params}`)

      // Check availability for all items in parallel
      const equipmentWithAvailability = await Promise.all(
        response.items.map(async (equipment: Equipment) => {
          try {
            const availability = await api.get(`/equipment/${equipment.id}/availability`, {
              start_date: searchFilters.value.startDate,
              end_date: searchFilters.value.endDate
            })
            return { ...equipment, availability }
          } catch (error) {
            console.error(`Availability check failed for ${equipment.id}:`, error)
            return { ...equipment, availability: { is_available: true } }
          }
        })
      )

      setData(equipmentWithAvailability)
      totalCount.value = response.total
      totalPages.value = response.pages
      currentPage.value = response.page

    } catch (error) {
      setError(error.message || 'Ошибка при поиске оборудования')
    }
  }

  // Watch for debounced search changes
  watchEffect(() => {
    if (debouncedSearch.value.length >= 3 || debouncedSearch.value === '') {
      currentPage.value = 1
      search()
    }
  })

  return {
    state: readonly(state),
    currentPage: readonly(currentPage),
    totalPages: readonly(totalPages),
    totalCount: readonly(totalCount),
    searchQuery,
    selectedCategory,
    search,
    nextPage: () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
        search()
      }
    },
    prevPage: () => {
      if (currentPage.value > 1) {
        currentPage.value--
        search()
      }
    }
  }
}
```

### 2. Pinia Store for API State Management

**API Store:**

```typescript
// stores/api.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ApiRequest, ApiResponse } from '@/types/api'

export const useApiStore = defineStore('api', () => {
  const activeRequests = ref<Map<string, ApiRequest>>(new Map())
  const requestHistory = ref<ApiResponse[]>([])
  const globalLoading = ref(false)

  const isLoading = computed(() => activeRequests.value.size > 0 || globalLoading.value)

  const addRequest = (id: string, request: ApiRequest) => {
    activeRequests.value.set(id, request)
  }

  const removeRequest = (id: string) => {
    activeRequests.value.delete(id)
  }

  const addToHistory = (response: ApiResponse) => {
    requestHistory.value.unshift(response)
    // Keep only last 100 requests
    if (requestHistory.value.length > 100) {
      requestHistory.value = requestHistory.value.slice(0, 100)
    }
  }

  const setGlobalLoading = (loading: boolean) => {
    globalLoading.value = loading
  }

  const clearHistory = () => {
    requestHistory.value = []
  }

  const getRequestStats = () => {
    const total = requestHistory.value.length
    const successful = requestHistory.value.filter(r => r.success).length
    const failed = total - successful

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0
    }
  }

  return {
    activeRequests: readonly(activeRequests),
    requestHistory: readonly(requestHistory),
    globalLoading: readonly(globalLoading),
    isLoading,
    addRequest,
    removeRequest,
    addToHistory,
    setGlobalLoading,
    clearHistory,
    getRequestStats
  }
})
```

### 3. Error Handling Composable

**Error Boundary Composable:**

```typescript
// composables/useErrorHandler.ts
import { ref, readonly } from 'vue'
import type { Ref } from 'vue'

export interface AppError {
  id: string
  message: string
  type: 'network' | 'validation' | 'server' | 'client'
  timestamp: Date
  context?: any
  retry?: () => Promise<void>
}

export function useErrorHandler() {
  const errors = ref<AppError[]>([])
  const maxErrors = 10

  const addError = (error: Omit<AppError, 'id' | 'timestamp'>) => {
    const appError: AppError = {
      ...error,
      id: generateId(),
      timestamp: new Date()
    }

    errors.value.unshift(appError)

    // Keep only max errors
    if (errors.value.length > maxErrors) {
      errors.value = errors.value.slice(0, maxErrors)
    }

    // Auto-remove after 10 seconds for non-critical errors
    if (error.type !== 'server') {
      setTimeout(() => {
        removeError(appError.id)
      }, 10000)
    }
  }

  const removeError = (id: string) => {
    const index = errors.value.findIndex(error => error.id === id)
    if (index > -1) {
      errors.value.splice(index, 1)
    }
  }

  const clearErrors = () => {
    errors.value = []
  }

  const retryError = async (id: string) => {
    const error = errors.value.find(e => e.id === id)
    if (error?.retry) {
      try {
        await error.retry()
        removeError(id)
      } catch (retryError) {
        console.error('Retry failed:', retryError)
      }
    }
  }

  const handleApiError = (error: any, context?: any, retry?: () => Promise<void>) => {
    let message = 'Произошла ошибка'
    let type: AppError['type'] = 'client'

    if (error.response) {
      type = 'server'
      if (error.response.status >= 400 && error.response.status < 500) {
        type = 'validation'
        message = parseValidationError(error.response.data)
      } else if (error.response.status >= 500) {
        message = 'Ошибка сервера. Попробуйте позже.'
      }
    } else if (error.request) {
      type = 'network'
      message = 'Проблемы с подключением к интернету'
    }

    addError({
      message,
      type,
      context,
      retry
    })
  }

  return {
    errors: readonly(errors),
    addError,
    removeError,
    clearErrors,
    retryError,
    handleApiError
  }
}

function parseValidationError(data: any): string {
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((err: any) => `${err.loc?.join(' -> ') || 'field'}: ${err.msg}`)
      .join('; ')
  } else if (typeof data.detail === 'string') {
    return data.detail
  }
  return 'Ошибка валидации данных'
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}
```

### 4. Performance Monitoring Composable

**Performance Composable:**

```typescript
// composables/usePerformance.ts
import { ref, readonly } from 'vue'
import type { Ref } from 'vue'

export interface PerformanceMetric {
  endpoint: string
  method: string
  duration: number
  success: boolean
  timestamp: string
}

export interface PerformanceStats {
  averageResponseTime: number
  successRate: number
  totalRequests: number
  errorRate: number
  slowestRequests: PerformanceMetric[]
  fastestRequests: PerformanceMetric[]
}

export function usePerformance() {
  const metrics = ref<PerformanceMetric[]>([])
  const maxMetrics = 1000

  const addMetric = (metric: PerformanceMetric) => {
    metrics.value.unshift(metric)

    if (metrics.value.length > maxMetrics) {
      metrics.value = metrics.value.slice(0, maxMetrics)
    }
  }

  const getStats = (): PerformanceStats => {
    if (metrics.value.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 0,
        totalRequests: 0,
        errorRate: 0,
        slowestRequests: [],
        fastestRequests: []
      }
    }

    const totalRequests = metrics.value.length
    const successfulRequests = metrics.value.filter(m => m.success).length
    const totalDuration = metrics.value.reduce((sum, m) => sum + m.duration, 0)

    const sortedByDuration = [...metrics.value].sort((a, b) => b.duration - a.duration)

    return {
      averageResponseTime: totalDuration / totalRequests,
      successRate: (successfulRequests / totalRequests) * 100,
      totalRequests,
      errorRate: ((totalRequests - successfulRequests) / totalRequests) * 100,
      slowestRequests: sortedByDuration.slice(0, 5),
      fastestRequests: sortedByDuration.slice(-5).reverse()
    }
  }

  const getEndpointStats = (endpoint: string) => {
    const endpointMetrics = metrics.value.filter(m => m.endpoint === endpoint)

    if (endpointMetrics.length === 0) return null

    const successful = endpointMetrics.filter(m => m.success).length
    const totalDuration = endpointMetrics.reduce((sum, m) => sum + m.duration, 0)

    return {
      endpoint,
      totalRequests: endpointMetrics.length,
      successRate: (successful / endpointMetrics.length) * 100,
      averageResponseTime: totalDuration / endpointMetrics.length,
      minResponseTime: Math.min(...endpointMetrics.map(m => m.duration)),
      maxResponseTime: Math.max(...endpointMetrics.map(m => m.duration))
    }
  }

  const clearMetrics = () => {
    metrics.value = []
  }

  return {
    metrics: readonly(metrics),
    addMetric,
    getStats,
    getEndpointStats,
    clearMetrics
  }
}
```

---

## 📊 Integration Requirements

### 1. API Service Layer

**Axios-based API Service:**

```typescript
// services/api.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios'
import type { ApiResponse, ApiError } from '@/types/api'

class ApiService {
  private client: AxiosInstance
  private authManager: AuthManager

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token
        const token = this.authManager.getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Log request
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)

        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response
        console.log(`API Response: ${response.status} ${response.config.url}`)

        // Transform response
        return this.transformResponse(response)
      },
      (error) => {
        // Handle errors
        return this.handleError(error)
      }
    )
  }

  private transformResponse(response: AxiosResponse): ApiResponse {
    // Apply response transformations
    const transformed = { ...response.data }

    // Add metadata
    transformed._metadata = {
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString(),
      duration: Date.now() - (response.config as any).startTime
    }

    return transformed
  }

  private handleError(error: any): Promise<never> {
    if (error.response) {
      // Server error
      const apiError: ApiError = {
        message: this.parseErrorMessage(error.response.data),
        status: error.response.status,
        data: error.response.data
      }
      return Promise.reject(apiError)
    } else if (error.request) {
      // Network error
      return Promise.reject({
        message: 'Network error - please check your connection',
        status: 0,
        data: null
      })
    } else {
      // Other error
      return Promise.reject({
        message: error.message || 'Unknown error occurred',
        status: -1,
        data: null
      })
    }
  }

  private parseErrorMessage(data: any): string {
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((err: any) => `${err.loc?.join(' -> ') || 'field'}: ${err.msg}`)
        .join('; ')
    } else if (typeof data.detail === 'string') {
      return data.detail
    }
    return data.message || 'An error occurred'
  }

  // CRUD methods
  async get<T>(endpoint: string, params?: any): Promise<T> {
    const response = await this.client.get(endpoint, { params })
    return response.data
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.client.post(endpoint, data)
    return response.data
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.client.put(endpoint, data)
    return response.data
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.client.patch(endpoint, data)
    return response.data
  }

  async delete(endpoint: string): Promise<void> {
    await this.client.delete(endpoint)
  }
}

// Create and export singleton instance
export const api = new ApiService('/api/v1')
```

### 2. Plugin System for Vue3

**API Plugin:**

```typescript
// plugins/api.ts
import type { App } from 'vue'
import { api } from '@/services/api'
import { useApiStore } from '@/stores/api'
import { usePerformance } from '@/composables/usePerformance'
import type { ApiResponse } from '@/types/api'

export function createApiPlugin() {
  return {
    install(app: App) {
      // Make API service globally available
      app.config.globalProperties.$api = api

      // Provide API service for composition API
      app.provide('api', api)

      // Setup global error handler
      app.config.errorHandler = (error, instance, info) => {
        console.error('Global error:', error)
        console.error('Component instance:', instance)
        console.error('Error info:', info)

        // Handle API errors globally
        if (error.response) {
          // Handle HTTP errors
          const apiStore = useApiStore()
          apiStore.addToHistory({
            endpoint: error.config?.url || 'unknown',
            method: error.config?.method || 'unknown',
            status: error.response.status,
            success: false,
            timestamp: new Date().toISOString(),
            error: error.message
          })
        }
      }

      // Setup performance monitoring
      const { addMetric } = usePerformance()

      // Monkey patch axios to track performance
      const originalRequest = api.client.request
      api.client.request = async function(config: any) {
        const startTime = Date.now()
        try {
          const response = await originalRequest.call(this, config)
          const endTime = Date.now()

          addMetric({
            endpoint: config.url,
            method: config.method?.toUpperCase(),
            duration: endTime - startTime,
            success: true,
            timestamp: new Date().toISOString()
          })

          return response
        } catch (error) {
          const endTime = Date.now()

          addMetric({
            endpoint: config.url,
            method: config.method?.toUpperCase(),
            duration: endTime - startTime,
            success: false,
            timestamp: new Date().toISOString()
          })

          throw error
        }
      }
    }
  }
}
```

---

## 🎯 Migration Strategy

### Phase 1: Foundation (Week 1-2)

1. **Setup Vue3 Project Structure**
   - Create composables directory
   - Setup Pinia stores
   - Configure API service layer
   - Implement base error handling

2. **Core API Integration**
   - Migrate ApiClient to TypeScript
   - Implement authentication handling
   - Setup request/response interceptors
   - Create base API composables

### Phase 2: Feature Migration (Week 3-6)

1. **Equipment Management**
   - Migrate search functionality with debouncing
   - Implement real-time availability checking
   - Setup pagination composables
   - Migrate filter system

2. **Project Management**
   - Implement project CRUD operations
   - Setup form validation
   - Migrate project status management
   - Implement date range handling

3. **Cart System**
   - Migrate Universal Cart to Pinia store
   - Implement cart persistence
   - Setup cart event handling
   - Migrate cart validation

### Phase 3: Advanced Features (Week 7-8)

1. **Real-time Updates**
   - Implement WebSocket connections
   - Setup polling mechanisms
   - Create real-time composables
   - Handle connection failures

2. **Performance Optimization**
   - Implement caching strategies
   - Setup lazy loading
   - Optimize bundle size
   - Add performance monitoring

### Phase 4: Testing and Polish (Week 9-10)

1. **Testing**
   - Unit tests for composables
   - Integration tests for API calls
   - E2E tests for critical flows
   - Performance testing

2. **Documentation and Training**
   - Update component documentation
   - Create migration guide
   - Train development team
   - Setup monitoring and alerting

---

## 📋 Success Metrics

### Performance Targets

- **API Response Time**: < 200ms for cached requests, < 500ms for fresh requests
- **Search Debounce**: 300-500ms delay for optimal UX
- **Parallel Requests**: 50% reduction in total loading time for list views
- **Error Recovery**: 95% of transient errors handled gracefully
- **Cache Hit Rate**: > 80% for frequently accessed data

### User Experience Targets

- **Loading States**: All API calls show appropriate loading indicators
- **Error Messages**: 100% of errors show user-friendly messages
- **Offline Capability**: Graceful degradation when network is unavailable
- **Real-time Updates**: < 5 second delay for critical data updates

### Code Quality Targets

- **TypeScript Coverage**: 100% for API-related code
- **Test Coverage**: > 90% for API integration code
- **Error Handling**: Comprehensive error boundaries for all API calls
- **Performance Monitoring**: Real-time performance metrics collection

---

## 🔗 Related Documentation

- [Task SM-1: Current State Management Analysis](./task-sm-1-current-state-management-analysis.md)
- [Task EM-1: Equipment Search and Filter System Analysis](./task-em-1-equipment-search-and-filter-system-analysis.md)
- [Task EM-2: Equipment Availability and Conflict Detection](./task-em-2-equipment-availability-and-conflict-detection-analysis.md)
- [Task AP-1: Pagination Engine Analysis](./task-ap-1-pagination-engine-analysis.md)
- [Task HS-1: Scanner Hardware Integration Analysis](./task-hs-1-scanner-hardware-integration-analysis.md)
- [FRONTEND_ANALYSIS_AND_MIGRATION_PLAN.md](../FRONTEND_ANALYSIS_AND_MIGRATION_PLAN.md)

---

## 📝 Notes

### Key Migration Considerations

1. **API Client Migration**: The existing ApiClient class provides excellent patterns for error handling, logging, and data transformation that should be preserved in the Vue3 implementation.

2. **Performance Patterns**: The debouncing, parallel requests, and caching strategies identified should be implemented as composables for reuse across components.

3. **Error Handling**: The sophisticated error parsing and user-friendly message system should be maintained and potentially enhanced in Vue3.

4. **Real-time Features**: The real-time availability checking and background updates are critical for user experience and should be prioritized in the migration.

5. **Type Safety**: The migration provides an opportunity to add comprehensive TypeScript types for better development experience and runtime safety.

### Technical Debt Opportunities

1. **Centralized Configuration**: Move hardcoded values to environment variables and configuration files.
2. **Retry Logic**: Implement exponential backoff for failed requests.
3. **Request Caching**: Add intelligent caching with invalidation strategies.
4. **WebSocket Integration**: Replace polling with WebSocket connections where appropriate.
5. **API Versioning**: Implement API versioning strategy for future compatibility.

This analysis provides a comprehensive foundation for migrating the CINERENTAL frontend API integration patterns to Vue3 with Pinia, maintaining the sophisticated error handling, performance optimizations, and user experience patterns while modernizing the architecture.
