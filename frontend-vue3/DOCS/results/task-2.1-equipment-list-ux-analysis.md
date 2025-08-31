# Equipment List Page UX Analysis - Task 2.1

**Date**: 2025-08-29
**Analyst**: Frontend UX Analyzer
**System**: CINERENTAL Equipment Rental Management
**Test URL**: localhost:8000/equipment (845 items, 43 pages)

---

## Overview

The Equipment List page represents the core equipment catalog interface, handling massive datasets (845+ items) with sophisticated filtering, real-time search, and advanced pagination. This page serves as the primary equipment discovery and management interface for all user roles.

### Key Functions

- **Equipment catalog browsing** with advanced filtering and search
- **Large dataset pagination** (20/50/100 items per page, 43+ pages total)
- **Real-time equipment status** display with rental project information
- **Quick equipment actions** (view details, print barcode, add to scan session)
- **Equipment creation modal** with barcode generation
- **Universal cart integration** (floating mode)

### User Scenarios

- **Rental Managers**: Browse catalog, check availability, add equipment to projects
- **Warehouse Staff**: Find equipment by barcode/serial, update status, print labels
- **Booking Coordinators**: Search available equipment, resolve conflicts

---

## Current Implementation Analysis

### Architectural Patterns

#### 1. **Advanced Pagination System**

```javascript
// Custom pagination class with localStorage persistence
class Pagination {
    constructor(config) {
        // Page size persistence: URL → localStorage → defaults
        this.state = {
            currentPage: 1,
            pageSize: this._getInitialPageSize(), // 20/50/100
            totalItems: 0,
            totalPages: 1,
            isLoading: false
        };
    }
}

// Dual pagination (top/bottom) with perfect synchronization
equipmentTopPagination = new Pagination({
    selectors: { /* top elements */ },
    callbacks: { onDataLoad: loadEquipmentData }
});

equipmentBottomPagination = new Pagination({
    selectors: { /* bottom elements */ },
    callbacks: { onDataLoad: loadEquipmentData }
});
```

**Strengths**:

- ✅ **State persistence** across page refreshes via localStorage
- ✅ **URL parameter integration** for bookmarkable filtered views
- ✅ **Dual pagination sync** prevents UI inconsistencies
- ✅ **Loading state management** with disabled controls during requests

**Technical Issues**:

- ⚠️ **Complex synchronization** between dual pagination instances
- ⚠️ **Manual DOM element caching** prone to stale references
- ⚠️ **Callback-based architecture** creates tight coupling

#### 2. **Real-Time Search with Debouncing**

```javascript
// 300ms debounced search with visual feedback
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        currentFilters.query = e.target.value;
        if (equipmentTopPagination) {
            equipmentTopPagination.reset(); // Back to page 1
        }
    }, 300);
});

// Search spinner for immediate user feedback
const searchSpinner = document.getElementById('search-spinner');
if (searchSpinner) {
    searchSpinner.classList.remove('d-none');
}
```

**UX Strengths**:

- ✅ **Immediate visual feedback** with spinner
- ✅ **Optimal debounce timing** (300ms)
- ✅ **Auto-reset to page 1** on new search
- ✅ **Minimum 3 characters** prevents excessive API calls

#### 3. **Equipment Status System**

```javascript
// Complex rental status with project information
function generateRentalStatusBadge(item) {
    const rentalStatus = item.rental_status || 'available';

    if (rentalStatus === 'on-project' && item.active_projects) {
        return `<span class="badge bg-primary rental-status-interactive"
                      data-projects='${JSON.stringify(item.active_projects)}'
                      data-bs-toggle="popover">
                    ${displayText} <i class="fas fa-info-circle"></i>
                </span>`;
    }
    // ... other status types
}

// Bootstrap popovers with project timeline color coding
function generatePopoverContent(projects) {
    const sortedProjects = projects.sort((a, b) =>
        new Date(a.start_date) - new Date(b.start_date)
    );

    return sortedProjects.map(project => {
        // Color coding: past=gray, current=blue, future=black
        let cssClass = startDate > now ? 'project-future'
                     : endDate < now ? 'project-past'
                     : 'project-current';

        return `<li class="rental-project-item ${cssClass}">
                    <a href="/projects/${project.id}">${project.name}</a>
                    <small>${project.dates}</small>
                </li>`;
    });
}
```

**UX Innovation**:

- ✅ **Interactive status badges** with hover/focus tooltips
- ✅ **Project timeline visualization** with color coding
- ✅ **Direct project navigation** from equipment view
- ✅ **Keyboard accessibility** (tabindex, ARIA labels)

### Technical Solutions

#### 1. **Table Layout Protection**

```css
/* Aggressive CSS protection against JavaScript layout corruption */
.table {
    min-width: 800px;
    table-layout: fixed !important;
}

.col-actions,
.table td:last-child {
    white-space: nowrap !important;
    width: 180px !important;
    min-width: 180px !important;
    max-width: 180px !important;
}

/* JavaScript cleanup function */
function cleanAllInlineStyles() {
    const tableElements = document.querySelectorAll('.table td, .table th');
    tableElements.forEach(el => {
        if (el.hasAttribute('style')) {
            console.warn('Removing inline style from:', el);
            el.removeAttribute('style');
        }
    });
}
```

#### 2. **Modal Workflow Management**

```javascript
// Focus management for accessibility
let lastFocusedElementBeforeModal = null;

function addToScanSession(equipmentId, name) {
    // Save focus state before modal
    lastFocusedElementBeforeModal = document.activeElement;

    // Restore focus after modal closes
    modalElement.addEventListener('hidden.bs.modal', function() {
        if (lastFocusedElementBeforeModal) {
            lastFocusedElementBeforeModal.focus();
        }
        lastFocusedElementBeforeModal = null;
    });
}
```

#### 3. **Barcode Generation System**

```javascript
// Equipment creation with flexible barcode handling
const formData = new FormData(form);
const data = Object.fromEntries(formData.entries());

if (data.generate_barcode) {
    delete data.barcode; // Server generates
} else if (!formData.get('barcode')?.trim()) {
    data.barcode = null; // Manual but empty
} else {
    data.custom_barcode = formData.get('barcode').trim();
    data.validate_barcode = false; // Skip format validation
}
```

---

## UX Interaction Patterns

### 1. **Equipment Discovery Workflow**

#### Primary Path: Filter → Search → Browse → Action

```text
1. User selects category filter (instant update)
2. User enters search query (300ms debounced)
3. Results update with loading spinner
4. User browses paginated results
5. User performs quick action (view/print/scan)
```

#### Filter Interaction Patterns

- **Category Filter**: Hierarchical tree structure with indentation
- **Status Filter**: Equipment operational status (Available/Rented/Maintenance/Broken)
- **Search Input**: Cross-field search (name, description, barcode, serial)
- **Combined Filters**: All filters work together, reset pagination to page 1

#### Search UX Design

```html
<div class="position-relative">
    <input type="text" class="form-control" id="searchInput"
           placeholder="Поиск по названию, описанию, штрих-коду или серийному номеру..."
           minlength="3">
    <div id="search-spinner" class="spinner-border spinner-border-sm d-none"
         style="right: 10px; top: 50%; transform: translateY(-50%)">
    </div>
</div>
```

**UX Strengths**:

- ✅ **Clear placeholder** explains search scope
- ✅ **Minimum length requirement** shown in UI
- ✅ **Loading indicator** positioned inside input
- ✅ **Responsive design** with proper mobile layout

### 2. **Large Dataset Pagination UX**

#### Dual Pagination Strategy

- **Top pagination**: Quick access without scrolling
- **Bottom pagination**: Natural position after content
- **Perfect synchronization**: State changes sync both instances
- **Page size options**: 20, 50, 100 items with localStorage persistence

#### Page Size Selection UX

```html
<select class="form-select form-select-sm" id="equipmentTopPageSize">
    <option value="20" selected>20</option>
    <option value="50">50</option>
    <option value="100">100</option>
</select>
```

**User Mental Model**:

- Small lists (20): Default, good for mobile
- Medium lists (50): Balance of performance and browsing
- Large lists (100): Power users, fewer page loads

### 3. **Equipment Status Visualization**

#### Status Badge System

```javascript
// Visual hierarchy with Bootstrap semantic colors
const statusBadges = {
    'available': 'bg-success',    // Green - ready to rent
    'on-project': 'bg-primary',   // Blue - currently rented (interactive)
    'maintenance': 'bg-warning',  // Yellow - being serviced
    'broken': 'bg-danger',        // Red - needs repair
    'retired': 'bg-secondary'     // Gray - end of life
};
```

#### Interactive Project Information

- **Hover/Focus Trigger**: Bootstrap popovers on status badges
- **Timeline Color Coding**: Past projects (gray), current (blue), future (black)
- **Direct Navigation**: Click project name to open project detail
- **Accessibility**: Keyboard navigation, screen reader support

### 4. **Quick Action Buttons**

#### Button Group Design

```html
<div class="btn-group" role="group">
    <a href="/equipment/123" class="btn btn-sm btn-outline-primary" title="Просмотр">
        <i class="fas fa-info-circle"></i>
    </a>
    <button class="btn btn-sm btn-outline-secondary btn-print-barcode" title="Печать">
        <i class="fas fa-print"></i>
    </button>
    <button class="btn btn-sm btn-outline-success btn-add-to-scan" title="Сканирование">
        <i class="fas fa-qrcode"></i>
    </button>
</div>
```

**UX Design Principles**:

- ✅ **Visual hierarchy**: Primary action (view) vs secondary actions
- ✅ **Icon-only buttons** with tooltips for space efficiency
- ✅ **Consistent sizing** with Bootstrap small variants
- ✅ **Color semantics**: Blue (view), Gray (print), Green (scan)

### 5. **Equipment Creation Modal**

#### Multi-Step Form Workflow

```text
1. Basic Information (name, category, description)
2. Serial Number (optional, pattern validated)
3. Barcode Generation (auto vs manual toggle)
4. Financial Information (replacement cost)
5. Form Validation & Submission
```

#### Barcode Generation UX

- **Default**: Auto-generation enabled, input readonly
- **Manual Mode**: Toggle unchecked, input becomes editable
- **Preview Function**: Generate barcode before form submission
- **Format Flexibility**: Custom barcodes skip format validation

---

## Business Logic Requirements

### 1. **Equipment Data Structure**

```typescript
interface EquipmentItem {
    id: number;
    name: string;
    description: string | null;
    category_id: number;
    category_name: string;
    serial_number: string | null;
    barcode: string;
    rental_status: 'available' | 'on-project' | 'maintenance' | 'broken' | 'retired';
    rental_status_display: string;
    active_projects: ProjectInfo[] | null;
    replacement_cost: number;
    created_at: string;
    updated_at: string;
}

interface ProjectInfo {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    dates: string; // Formatted date range
}
```

### 2. **Search and Filter Logic**

```typescript
interface EquipmentFilters {
    query?: string;           // Cross-field text search
    category_id?: number;     // Equipment category filter
    status?: EquipmentStatus; // Operational status filter
    include_deleted?: boolean; // Admin function
}

interface PaginationParams {
    page: number;        // 1-based page number
    size: number;        // Items per page (20/50/100)
    filters: EquipmentFilters;
}

interface PaginationResponse<T> {
    items: T[];         // Current page items
    total: number;      // Total item count
    page: number;       // Current page
    pages: number;      // Total page count
    size: number;       // Items per page
}
```

### 3. **API Integration Points**

- **`GET /api/v1/equipment/paginated-with-rental-status`**: Main listing endpoint
- **`GET /api/v1/categories`**: Category filter options
- **`POST /api/v1/equipment/`**: Create new equipment
- **`POST /api/v1/barcodes/generate`**: Generate barcode
- **`GET /api/v1/barcodes/{barcode}/image`**: Barcode image for printing

### 4. **Validation Rules**

- **Name**: Required, 255 character limit
- **Category**: Required, must exist in system
- **Serial Number**: Optional, alphanumeric with limited special characters
- **Barcode**: Auto-generated or custom (11-digit format with checksum)
- **Replacement Cost**: Required, non-negative integer

---

## Vue3 Implementation Specification

### 1. **Component Architecture**

#### Main Component Structure

```vue
<!-- EquipmentListPage.vue -->
<template>
  <div class="equipment-list-container">
    <!-- Page Header with Actions -->
    <EquipmentPageHeader @create-equipment="handleCreateEquipment" />

    <!-- Search and Filter Controls -->
    <EquipmentFilters
      v-model:filters="filters"
      :categories="categories"
      @filters-changed="handleFiltersChanged" />

    <!-- Pagination Controls (Top) -->
    <PaginationControls
      v-model="paginationState"
      position="top"
      @page-changed="loadEquipment"
      @page-size-changed="handlePageSizeChanged" />

    <!-- Equipment Table -->
    <EquipmentTable
      :items="equipmentItems"
      :loading="loading"
      @action-clicked="handleEquipmentAction" />

    <!-- Pagination Controls (Bottom) -->
    <PaginationControls
      v-model="paginationState"
      position="bottom" />

    <!-- Modals -->
    <EquipmentCreateModal
      v-model:visible="createModalVisible"
      @equipment-created="handleEquipmentCreated" />

    <BarcodePreviewModal v-model:visible="barcodeModalVisible" />

    <ScanSessionModal v-model:visible="scanModalVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useEquipmentStore } from '@/stores/equipment'
import { useCategoryStore } from '@/stores/categories'
import { usePaginationStore } from '@/stores/pagination'
import { debounce } from '@/utils/debounce'

// Store instances
const equipmentStore = useEquipmentStore()
const categoryStore = useCategoryStore()
const paginationStore = usePaginationStore('equipment-list')

// Component state
const filters = reactive<EquipmentFilters>({
  query: '',
  category_id: null,
  status: null
})

const paginationState = reactive({
  currentPage: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 1
})

const loading = ref(false)
const createModalVisible = ref(false)

// Computed properties
const equipmentItems = computed(() => equipmentStore.items)
const categories = computed(() => categoryStore.hierarchicalCategories)

// Debounced search handler
const debouncedSearch = debounce((newFilters: EquipmentFilters) => {
  paginationState.currentPage = 1 // Reset to first page
  loadEquipment()
}, 300)

// Event handlers
function handleFiltersChanged(newFilters: EquipmentFilters) {
  Object.assign(filters, newFilters)
  debouncedSearch(newFilters)
}

async function loadEquipment() {
  loading.value = true
  try {
    const result = await equipmentStore.loadPaginated({
      page: paginationState.currentPage,
      size: paginationState.pageSize,
      filters
    })

    // Update pagination state
    Object.assign(paginationState, {
      totalItems: result.total,
      totalPages: result.pages
    })

    // Persist page size
    paginationStore.savePageSize(paginationState.pageSize)

  } catch (error) {
    // Error handling
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  // Load categories for filter
  await categoryStore.loadCategories()

  // Restore pagination state from URL/localStorage
  const savedState = paginationStore.restoreState()
  Object.assign(paginationState, savedState)

  // Initial data load
  await loadEquipment()
})

// Watch for URL parameter changes
watch(() => route.query, (newQuery) => {
  // Sync filters and pagination with URL
  syncWithUrlParams(newQuery)
}, { immediate: true })
</script>
```

### 2. **Pinia Store Design**

#### Equipment Store

```typescript
// stores/equipment.ts
import { defineStore } from 'pinia'
import type { EquipmentItem, EquipmentFilters, PaginationParams } from '@/types'
import { equipmentApi } from '@/api/equipment'

export const useEquipmentStore = defineStore('equipment', () => {
  // State
  const items = ref<EquipmentItem[]>([])
  const selectedItems = ref<Set<number>>(new Set())
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Cached data for performance
  const itemsById = computed(() =>
    items.value.reduce((acc, item) => ({ ...acc, [item.id]: item }), {})
  )

  // Actions
  async function loadPaginated(params: PaginationParams) {
    loading.value = true
    error.value = null

    try {
      const response = await equipmentApi.getPaginated(params)
      items.value = response.items
      return response
    } catch (err) {
      error.value = 'Failed to load equipment'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createEquipment(data: EquipmentCreateData) {
    try {
      const newItem = await equipmentApi.create(data)

      // Optimistic update - add to current list if it matches filters
      if (wouldItemMatchCurrentFilters(newItem)) {
        items.value.unshift(newItem)
      }

      return newItem
    } catch (err) {
      error.value = 'Failed to create equipment'
      throw err
    }
  }

  function updateItemStatus(itemId: number, status: EquipmentStatus) {
    const item = itemsById.value[itemId]
    if (item) {
      item.rental_status = status
    }
  }

  // Real-time updates via WebSocket
  function handleRealtimeUpdate(update: EquipmentUpdate) {
    const existingIndex = items.value.findIndex(item => item.id === update.id)

    if (existingIndex >= 0) {
      // Update existing item
      items.value[existingIndex] = { ...items.value[existingIndex], ...update }
    } else if (wouldItemMatchCurrentFilters(update)) {
      // Add new item if it matches current filters
      items.value.unshift(update as EquipmentItem)
    }
  }

  return {
    // State
    items: readonly(items),
    selectedItems: readonly(selectedItems),
    loading: readonly(loading),
    error: readonly(error),

    // Getters
    itemsById,

    // Actions
    loadPaginated,
    createEquipment,
    updateItemStatus,
    handleRealtimeUpdate
  }
})
```

#### Universal Pagination Store

```typescript
// stores/pagination.ts
export const usePaginationStore = defineStore('pagination', () => {
  // Multi-instance pagination state
  const instances = ref<Map<string, PaginationState>>(new Map())

  function createInstance(key: string, options: PaginationOptions = {}) {
    const state: PaginationState = {
      currentPage: 1,
      pageSize: options.defaultPageSize || 20,
      totalItems: 0,
      totalPages: 1,
      pageSizes: options.pageSizes || [20, 50, 100]
    }

    // Restore from localStorage
    const saved = getPersistedState(key)
    if (saved) {
      Object.assign(state, saved)
    }

    instances.value.set(key, state)
    return state
  }

  function savePageSize(key: string, pageSize: number) {
    const state = instances.value.get(key)
    if (state) {
      state.pageSize = pageSize
      persistState(key, state)
    }
  }

  function updateState(key: string, updates: Partial<PaginationState>) {
    const state = instances.value.get(key)
    if (state) {
      Object.assign(state, updates)
    }
  }

  return {
    createInstance,
    savePageSize,
    updateState,
    getInstance: (key: string) => instances.value.get(key)
  }
})
```

### 3. **Component Specifications**

#### EquipmentFilters Component

```vue
<template>
  <div class="card mb-3">
    <div class="card-header">
      <div class="row g-3 align-items-center">
        <!-- Search Input -->
        <div class="col-md-6">
          <div class="position-relative">
            <input
              v-model="localFilters.query"
              type="text"
              class="form-control"
              placeholder="Поиск по названию, описанию, штрих-коду..."
              :minlength="3"
              @input="handleSearchInput"
            />
            <div v-if="loading" class="search-spinner">
              <div class="spinner-border spinner-border-sm"></div>
            </div>
          </div>
        </div>

        <!-- Category Filter -->
        <div class="col-md-3">
          <select
            v-model="localFilters.category_id"
            class="form-select"
            @change="emitFiltersChanged"
          >
            <option value="">Все категории</option>
            <CategoryOption
              v-for="category in categories"
              :key="category.id"
              :category="category"
              :level="0"
            />
          </select>
        </div>

        <!-- Status Filter -->
        <div class="col-md-3">
          <select
            v-model="localFilters.status"
            class="form-select"
            @change="emitFiltersChanged"
          >
            <option value="">Все статусы</option>
            <option value="AVAILABLE">Доступно</option>
            <option value="RENTED">В аренде</option>
            <option value="MAINTENANCE">В ремонте</option>
            <option value="BROKEN">Неисправно</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  filters: EquipmentFilters
  categories: CategoryItem[]
  loading?: boolean
}

interface Emits {
  (e: 'filters-changed', filters: EquipmentFilters): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// Local reactive copy for v-model
const localFilters = reactive({ ...props.filters })

// Debounced search emission
const debouncedEmit = debounce(() => {
  emit('filters-changed', { ...localFilters })
}, 300)

function handleSearchInput() {
  if (localFilters.query.length >= 3 || localFilters.query.length === 0) {
    debouncedEmit()
  }
}

function emitFiltersChanged() {
  emit('filters-changed', { ...localFilters })
}

// Sync props changes back to local state
watch(() => props.filters, (newFilters) => {
  Object.assign(localFilters, newFilters)
}, { deep: true })
</script>
```

#### EquipmentTable Component

```vue
<template>
  <div class="card">
    <div class="card-body">
      <div class="table-responsive">
        <table class="table table-hover equipment-table">
          <thead>
            <tr>
              <th class="col-name">Название</th>
              <th class="col-category">Категория</th>
              <th class="col-serial">Серийный номер</th>
              <th class="col-rental-status text-center">Статус аренды</th>
              <th class="col-actions text-center">Действия</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading State -->
            <tr v-if="loading">
              <td colspan="5" class="text-center py-4">
                <div class="spinner-border text-primary"></div>
                <div class="mt-2">Загрузка оборудования...</div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-else-if="items.length === 0">
              <td colspan="5" class="text-center py-4 text-muted">
                <i class="fas fa-search fa-2x mb-3"></i>
                <br>Оборудование не найдено
              </td>
            </tr>

            <!-- Equipment Items -->
            <EquipmentTableRow
              v-for="item in items"
              :key="item.id"
              :item="item"
              @action-clicked="handleActionClicked"
            />
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  items: EquipmentItem[]
  loading?: boolean
}

interface Emits {
  (e: 'action-clicked', action: string, item: EquipmentItem): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

function handleActionClicked(action: string, item: EquipmentItem) {
  emit('action-clicked', action, item)
}
</script>

<style scoped>
.equipment-table {
  table-layout: fixed;
  min-width: 800px;
}

.col-name { width: 30%; min-width: 180px; }
.col-category { width: 15%; min-width: 100px; }
.col-serial { width: 10%; min-width: 60px; }
.col-rental-status { width: 12%; min-width: 120px; }
.col-actions { width: 33%; min-width: 180px; }

@media (max-width: 768px) {
  .equipment-table {
    min-width: 600px;
  }
}
</style>
```

#### EquipmentTableRow Component

```vue
<template>
  <tr class="equipment-row">
    <td class="col-name">
      <div class="fw-bold">{{ item.name }}</div>
      <small v-if="item.description" class="text-muted">
        {{ item.description }}
      </small>
    </td>

    <td class="col-category" :title="item.category_name">
      {{ item.category_name }}
    </td>

    <td class="col-serial" :title="item.serial_number || '-'">
      {{ item.serial_number || '-' }}
    </td>

    <td class="col-rental-status text-center">
      <RentalStatusBadge
        :status="item.rental_status"
        :display-text="item.rental_status_display"
        :active-projects="item.active_projects"
      />
    </td>

    <td class="col-actions text-center">
      <div class="btn-group" role="group">
        <router-link
          :to="`/equipment/${item.id}`"
          class="btn btn-sm btn-outline-primary"
          title="Просмотр"
        >
          <i class="fas fa-info-circle"></i>
        </router-link>

        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          title="Печать штрих-кода"
          @click="$emit('action-clicked', 'print-barcode', item)"
        >
          <i class="fas fa-print"></i>
        </button>

        <button
          type="button"
          class="btn btn-sm btn-outline-success"
          title="Добавить в сессию сканирования"
          @click="$emit('action-clicked', 'add-to-scan', item)"
        >
          <i class="fas fa-qrcode"></i>
        </button>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
interface Props {
  item: EquipmentItem
}

interface Emits {
  (e: 'action-clicked', action: string, item: EquipmentItem): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>
```

#### RentalStatusBadge Component

```vue
<template>
  <component
    :is="hasActiveProjects ? 'button' : 'span'"
    :class="badgeClasses"
    :tabindex="hasActiveProjects ? 0 : undefined"
    :role="hasActiveProjects ? 'button' : undefined"
    :aria-label="hasActiveProjects ? 'На проекте. Нажмите для просмотра списка проектов' : undefined"
    @click="hasActiveProjects && togglePopover()"
    @keydown.enter="hasActiveProjects && togglePopover()"
    @keydown.space="hasActiveProjects && (preventDefault($event), togglePopover())"
  >
    {{ displayText }}
    <i v-if="hasActiveProjects" class="fas fa-info-circle ms-1" aria-hidden="true"></i>

    <!-- Popover Content -->
    <Teleport to="body">
      <div
        v-if="showPopover && hasActiveProjects"
        ref="popoverRef"
        class="rental-projects-popover"
        :style="popoverStyle"
      >
        <div class="fw-bold mb-2">Активные проекты:</div>
        <ul class="list-unstyled mb-0">
          <li
            v-for="project in sortedProjects"
            :key="project.id"
            :class="getProjectClass(project)"
            class="rental-project-item"
          >
            <router-link
              :to="`/projects/${project.id}`"
              class="text-decoration-none"
              :style="getProjectLinkStyle(project)"
            >
              <strong>{{ project.name }}</strong><br>
              <small class="text-muted">{{ project.dates }}</small>
            </router-link>
          </li>
        </ul>
      </div>
    </Teleport>
  </component>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

interface Props {
  status: EquipmentStatus
  displayText: string
  activeProjects?: ProjectInfo[]
}

const props = defineProps<Props>()

const showPopover = ref(false)
const popoverRef = ref<HTMLElement>()
const popoverStyle = ref({})

const hasActiveProjects = computed(() =>
  props.activeProjects && props.activeProjects.length > 0
)

const badgeClasses = computed(() => [
  'badge',
  'rental-status-badge',
  {
    'bg-success': props.status === 'available',
    'bg-primary': props.status === 'on-project',
    'bg-warning': props.status === 'maintenance',
    'bg-danger': props.status === 'broken',
    'bg-secondary': props.status === 'retired',
    'rental-status-interactive': hasActiveProjects.value
  }
])

const sortedProjects = computed(() => {
  if (!props.activeProjects) return []

  return [...props.activeProjects].sort((a, b) =>
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  )
})

function getProjectClass(project: ProjectInfo): string {
  const now = new Date()
  const startDate = new Date(project.start_date)
  const endDate = new Date(project.end_date)

  if (startDate > now) return 'project-future'
  if (endDate < now) return 'project-past'
  return 'project-current'
}

async function togglePopover() {
  if (!hasActiveProjects.value) return

  showPopover.value = !showPopover.value

  if (showPopover.value) {
    await nextTick()
    // Position popover logic here
  }
}

function preventDefault(event: Event) {
  event.preventDefault()
}
</script>

<style scoped>
.rental-status-interactive {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.rental-status-interactive:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.rental-status-interactive:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
}

.rental-projects-popover {
  position: fixed;
  z-index: 1060;
  max-width: 280px;
  padding: 0.5rem 0.75rem;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  font-size: 0.875rem;
}

.rental-project-item {
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #e9ecef;
}

.rental-project-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
</style>
```

### 4. **Performance Optimizations**

#### Virtual Scrolling for Large Lists

```vue
<!-- For 100+ items per page, implement virtual scrolling -->
<template>
  <RecycleScroller
    class="equipment-scroller"
    :items="equipmentItems"
    :item-size="60"
    key-field="id"
    v-slot="{ item }"
  >
    <EquipmentTableRow :item="item" @action-clicked="handleActionClicked" />
  </RecycleScroller>
</template>

<script setup lang="ts">
import { RecycleScroller } from 'vue-virtual-scroller'

// Only use virtual scrolling for large page sizes
const useVirtualScrolling = computed(() =>
  paginationState.pageSize >= 100 && equipmentItems.value.length > 50
)
</script>
```

#### Intelligent Data Loading

```typescript
// stores/equipment.ts - Enhanced with caching
export const useEquipmentStore = defineStore('equipment', () => {
  // Cache for different filter combinations
  const cache = ref(new Map<string, CacheEntry>())
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  async function loadPaginated(params: PaginationParams) {
    const cacheKey = getCacheKey(params)
    const cached = cache.value.get(cacheKey)

    // Return cached data if still fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      items.value = cached.items
      return cached.response
    }

    // Load fresh data
    const response = await equipmentApi.getPaginated(params)

    // Cache the result
    cache.value.set(cacheKey, {
      items: response.items,
      response,
      timestamp: Date.now()
    })

    items.value = response.items
    return response
  }

  // Optimistic updates
  function optimisticUpdate(itemId: number, updates: Partial<EquipmentItem>) {
    const index = items.value.findIndex(item => item.id === itemId)
    if (index >= 0) {
      items.value[index] = { ...items.value[index], ...updates }
    }
  }
})
```

---

## Integration Requirements

### 1. **Universal Cart Integration**

#### Floating Cart Mode

```vue
<!-- Equipment list uses floating cart mode -->
<template>
  <div class="equipment-list-page">
    <!-- Page content -->

    <!-- Universal Cart in floating mode -->
    <UniversalCart
      mode="floating"
      config-type="equipment_add"
      :max-items="100"
      :enable-storage="true"
      @item-added="handleCartItemAdded"
      @show-cart="handleShowCart"
    />
  </div>
</template>

<script setup lang="ts">
import { useUniversalCartStore } from '@/stores/universal-cart'

const cartStore = useUniversalCartStore()

function handleEquipmentAction(action: string, item: EquipmentItem) {
  if (action === 'add-to-cart') {
    // Add equipment to cart
    cartStore.addItem({
      id: item.id,
      type: 'equipment',
      name: item.name,
      category: item.category_name,
      barcode: item.barcode,
      quantity: 1
    })
  }
  // ... other actions
}
</script>
```

### 2. **HID Scanner Integration**

#### Scanner Event Handling

```typescript
// composables/useHIDScanner.ts
export function useHIDScanner() {
  const isActive = ref(false)
  const lastScanTime = ref(0)
  const scanBuffer = ref('')

  function startScanning() {
    if (!isActive.value) {
      isActive.value = true
      document.addEventListener('keydown', handleKeyDown)
    }
  }

  function stopScanning() {
    isActive.value = false
    document.removeEventListener('keydown', handleKeyDown)
  }

  function handleKeyDown(event: KeyboardEvent) {
    const now = Date.now()

    // Reset buffer if gap > 100ms (indicates human typing vs scanner)
    if (now - lastScanTime.value > 100) {
      scanBuffer.value = ''
    }

    lastScanTime.value = now

    if (event.key === 'Enter') {
      if (scanBuffer.value.length >= 6) {
        // Valid barcode scanned
        handleBarcodeScanned(scanBuffer.value)
      }
      scanBuffer.value = ''
    } else if (event.key.length === 1) {
      scanBuffer.value += event.key
      event.preventDefault() // Prevent input to search field
    }
  }

  return {
    isActive: readonly(isActive),
    startScanning,
    stopScanning
  }
}
```

#### Integration in Equipment List

```vue
<script setup lang="ts">
import { useHIDScanner } from '@/composables/useHIDScanner'

const { isActive: scannerActive, startScanning, stopScanning } = useHIDScanner()

// Auto-start scanner on page mount
onMounted(() => {
  startScanning()
})

onUnmounted(() => {
  stopScanning()
})

// Handle barcode scanned
async function handleBarcodeScanned(barcode: string) {
  try {
    // Find equipment by barcode
    const equipment = await equipmentStore.findByBarcode(barcode)

    if (equipment) {
      // Highlight found equipment in table
      highlightEquipment(equipment.id)

      // Optional: Auto-add to cart or scan session
      if (cartStore.isActive) {
        cartStore.addItem(equipment)
      }
    } else {
      // Show "not found" feedback
      showToast('Оборудование с таким штрих-кодом не найдено', 'warning')
    }
  } catch (error) {
    showToast('Ошибка при поиске оборудования', 'danger')
  }
}
</script>
```

### 3. **Real-time Updates**

#### WebSocket Integration

```typescript
// composables/useWebSocket.ts
export function useWebSocket() {
  const socket = ref<WebSocket | null>(null)
  const connected = ref(false)

  function connect() {
    socket.value = new WebSocket(`ws://${location.host}/ws`)

    socket.value.onopen = () => {
      connected.value = true
      console.log('WebSocket connected')
    }

    socket.value.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleRealtimeUpdate(data)
    }

    socket.value.onclose = () => {
      connected.value = false
      // Auto-reconnect after delay
      setTimeout(connect, 5000)
    }
  }

  function handleRealtimeUpdate(data: any) {
    if (data.type === 'equipment_status_changed') {
      // Update equipment status in store
      equipmentStore.updateItemStatus(data.equipment_id, data.new_status)
    } else if (data.type === 'equipment_created') {
      // Add new equipment to list if it matches current filters
      equipmentStore.handleRealtimeUpdate(data.equipment)
    }
  }

  return { connected: readonly(connected), connect }
}
```

### 4. **API Endpoints**

#### Required Backend Endpoints

```typescript
// API endpoints needed for Vue3 implementation
interface EquipmentAPI {
  // Main listing with rental status
  getPaginated(params: {
    page: number
    size: number
    query?: string
    category_id?: number
    status?: string
    include_deleted?: boolean
  }): Promise<PaginationResponse<EquipmentItem>>

  // Equipment CRUD
  create(data: EquipmentCreateData): Promise<EquipmentItem>
  getById(id: number): Promise<EquipmentItem>
  update(id: number, data: EquipmentUpdateData): Promise<EquipmentItem>
  delete(id: number): Promise<void>

  // Barcode operations
  findByBarcode(barcode: string): Promise<EquipmentItem | null>
  generateBarcode(): Promise<{ barcode: string }>
  getBarcodeImage(barcode: string, type: 'code128' | 'datamatrix'): Promise<Blob>

  // Bulk operations
  bulkUpdateStatus(ids: number[], status: EquipmentStatus): Promise<void>
  bulkDelete(ids: number[]): Promise<void>

  // Export functions
  exportToCSV(filters: EquipmentFilters): Promise<Blob>
  exportToPDF(filters: EquipmentFilters): Promise<Blob>
}
```

---

## Testing Scenarios

### 1. **Core User Workflows**

#### Scenario: Equipment Discovery and Filtering

```gherkin
Feature: Equipment Discovery
  As a rental manager
  I want to find equipment quickly using filters and search
  So that I can add items to projects efficiently

Scenario: Multi-filter equipment search
  Given I am on the equipment list page
  And there are 845+ equipment items
  When I select "Cameras" category
  And I enter "Canon" in the search box
  And I wait 300ms for debounced search
  Then I should see only Canon cameras
  And pagination should reset to page 1
  And URL should update with filter parameters

Scenario: Large dataset pagination
  Given I am viewing equipment with 845+ items
  When I change page size to 100 items
  Then I should see 100 items per page
  And page size should persist in localStorage
  And both top and bottom pagination should sync
  And virtual scrolling should activate for performance
```

#### Scenario: Equipment Status Management

```gherkin
Scenario: Interactive rental status badges
  Given I am viewing equipment list
  And an equipment item is "on-project" status
  When I hover over the status badge
  Then I should see a popover with active projects
  And projects should be color-coded by timeline
  When I click on a project name
  Then I should navigate to the project detail page

Scenario: Real-time status updates
  Given I am viewing equipment list
  When equipment status changes on another session
  Then the status badge should update automatically
  And no page refresh should be required
```

### 2. **Performance Testing**

#### Load Testing Scenarios

```typescript
describe('Equipment List Performance', () => {
  test('should handle 1000+ items pagination smoothly', async () => {
    // Mock 1000 equipment items
    const mockData = generateMockEquipment(1000)

    // Render with 100 items per page
    const { getByTestId } = render(EquipmentListPage, {
      props: { initialPageSize: 100 }
    })

    // Check virtual scrolling activates
    expect(getByTestId('virtual-scroller')).toBeInTheDocument()

    // Measure scroll performance
    const scrollContainer = getByTestId('equipment-table')
    const startTime = performance.now()

    fireEvent.scroll(scrollContainer, { target: { scrollTop: 5000 } })

    const endTime = performance.now()
    expect(endTime - startTime).toBeLessThan(100) // < 100ms
  })

  test('should debounce search requests properly', async () => {
    const mockApi = jest.fn()

    const { getByPlaceholderText } = render(EquipmentFilters, {
      props: { onFiltersChanged: mockApi }
    })

    const searchInput = getByPlaceholderText(/Поиск по названию/)

    // Type quickly (simulate user typing)
    fireEvent.input(searchInput, { target: { value: 'c' } })
    fireEvent.input(searchInput, { target: { value: 'ca' } })
    fireEvent.input(searchInput, { target: { value: 'cam' } })

    // Should not call API until 300ms after last keystroke
    expect(mockApi).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledTimes(1)
    }, { timeout: 400 })
  })
})
```

### 3. **Accessibility Testing**

#### Keyboard Navigation

```typescript
describe('Equipment List Accessibility', () => {
  test('should support full keyboard navigation', async () => {
    const { container } = render(EquipmentListPage)

    // Tab through filters
    fireEvent.keyDown(document.body, { key: 'Tab' })
    expect(document.activeElement).toHaveAttribute('placeholder', /Поиск/)

    fireEvent.keyDown(document.activeElement, { key: 'Tab' })
    expect(document.activeElement?.tagName).toBe('SELECT') // Category filter

    // Tab to table and navigate
    // ... continue through all focusable elements

    // Test status badge keyboard interaction
    const statusBadge = container.querySelector('.rental-status-interactive')
    fireEvent.keyDown(statusBadge, { key: 'Enter' })

    expect(container.querySelector('.rental-projects-popover')).toBeVisible()
  })

  test('should have proper ARIA labels and roles', () => {
    const { container } = render(EquipmentTable, {
      props: { items: mockEquipmentItems }
    })

    // Check table semantics
    expect(container.querySelector('table')).toHaveAttribute('role', 'table')

    // Check action button groups
    const actionGroups = container.querySelectorAll('.btn-group')
    actionGroups.forEach(group => {
      expect(group).toHaveAttribute('role', 'group')
    })

    // Check interactive status badges
    const interactiveBadges = container.querySelectorAll('.rental-status-interactive')
    interactiveBadges.forEach(badge => {
      expect(badge).toHaveAttribute('role', 'button')
      expect(badge).toHaveAttribute('aria-label')
      expect(badge).toHaveAttribute('tabindex', '0')
    })
  })
})
```

### 4. **Mobile Responsiveness**

#### Touch Interaction Testing

```typescript
describe('Mobile Equipment List', () => {
  beforeEach(() => {
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375 })
    Object.defineProperty(window, 'innerHeight', { value: 667 })
  })

  test('should adapt table layout for mobile', () => {
    const { container } = render(EquipmentListPage)

    const table = container.querySelector('.equipment-table')
    const computedStyle = getComputedStyle(table)

    // Check mobile styles applied
    expect(computedStyle.minWidth).toBe('600px') // Reduced from 800px

    // Check horizontal scroll enabled
    const scrollContainer = table.parentElement
    expect(scrollContainer).toHaveClass('table-responsive')
  })

  test('should support touch interactions on status badges', async () => {
    const { container } = render(RentalStatusBadge, {
      props: {
        status: 'on-project',
        displayText: 'На проекте',
        activeProjects: mockProjects
      }
    })

    const badge = container.querySelector('.rental-status-interactive')

    // Simulate touch tap
    fireEvent.touchStart(badge)
    fireEvent.touchEnd(badge)

    await waitFor(() => {
      expect(container.querySelector('.rental-projects-popover')).toBeVisible()
    })
  })
})
```

### 5. **Edge Cases and Error Scenarios**

#### Error Handling Testing

```typescript
describe('Equipment List Error Scenarios', () => {
  test('should handle API failures gracefully', async () => {
    // Mock API failure
    jest.spyOn(equipmentApi, 'getPaginated').mockRejectedValue(
      new Error('Network error')
    )

    const { container } = render(EquipmentListPage)

    await waitFor(() => {
      expect(container.querySelector('.alert-danger')).toBeInTheDocument()
      expect(container.textContent).toContain('Ошибка при загрузке')
    })

    // Should show retry option
    const retryButton = container.querySelector('[data-testid="retry-button"]')
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)

    // Should attempt to reload data
    expect(equipmentApi.getPaginated).toHaveBeenCalledTimes(2)
  })

  test('should handle empty search results', async () => {
    const { container } = render(EquipmentListPage)

    // Mock empty response
    jest.spyOn(equipmentApi, 'getPaginated').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pages: 1,
      size: 20
    })

    const searchInput = container.querySelector('[placeholder*="Поиск"]')
    fireEvent.input(searchInput, { target: { value: 'nonexistent' } })

    await waitFor(() => {
      expect(container.textContent).toContain('Оборудование не найдено')
    })

    // Should show helpful empty state
    expect(container.querySelector('.fas.fa-search')).toBeInTheDocument()
  })
})
```

---

## Migration Notes

### 1. **Critical Migration Challenges**

#### Pagination Complexity

- **Challenge**: Current dual pagination with perfect sync
- **Solution**: Single Pinia store managing multiple pagination instances
- **Risk**: State management complexity could cause sync issues
- **Mitigation**: Comprehensive testing of pagination state changes

#### Table Layout Protection

- **Challenge**: CSS-JS battle against inline styles
- **Solution**: Vue reactive classes eliminate need for DOM manipulation
- **Risk**: Loss of fine-grained control over table rendering
- **Mitigation**: CSS-in-JS or scoped styles for precise control

#### Real-time Updates

- **Challenge**: Current manual DOM updates for status changes
- **Solution**: Reactive stores with WebSocket integration
- **Risk**: Potential memory leaks from persistent connections
- **Mitigation**: Proper cleanup in component lifecycle hooks

### 2. **Implementation Recommendations**

#### Phase 1: Core Components (Week 1-2)

```typescript
// Priority order for component development
const migrationPhases = [
  // Phase 1: Foundation
  'EquipmentFilters',      // Search and filter UI
  'PaginationControls',    // Universal pagination
  'EquipmentTable',        // Core table structure

  // Phase 2: Interactions
  'EquipmentTableRow',     // Individual row rendering
  'RentalStatusBadge',     // Status display with popovers
  'EquipmentActions',      // Action buttons

  // Phase 3: Modals
  'EquipmentCreateModal',  // Create new equipment
  'BarcodePreviewModal',   // Barcode generation
  'ScanSessionModal',      // Scanner integration

  // Phase 4: Integration
  'UniversalCart',         // Cart system integration
  'HIDScanner',           // Hardware scanner
  'WebSocketUpdates'       // Real-time updates
]
```

#### Phase 2: Store Integration (Week 2-3)

```typescript
// Store development priority
const storeMigration = [
  'equipment',      // Core equipment data management
  'categories',     // Category hierarchy
  'pagination',     // Universal pagination state
  'universal-cart', // Cart system
  'scanner',        // Scanner sessions
  'websocket'       // Real-time updates
]
```

#### Phase 3: Performance Optimization (Week 3-4)

```typescript
// Performance enhancements
const optimizations = [
  'virtual-scrolling',     // For 100+ item pages
  'intelligent-caching',   // Smart data cache
  'optimistic-updates',    // Immediate UI feedback
  'websocket-batching',    // Batch real-time updates
  'image-lazy-loading',    // Barcode images
  'component-lazy-loading' // Modal components
]
```

### 3. **Data Migration Strategy**

#### API Endpoint Compatibility

```typescript
// Ensure backward compatibility during transition
interface MigrationAPI {
  // Legacy endpoint (keep during migration)
  '/equipment/': LegacyEquipmentList

  // New Vue3-optimized endpoint
  '/api/v2/equipment/paginated': OptimizedEquipmentList

  // Gradual migration approach
  useNewAPI: boolean // Feature flag
}
```

#### LocalStorage Migration

```typescript
// Migrate existing localStorage data
function migrateLocalStorage() {
  // Old pagination format
  const oldPageSize = localStorage.getItem('equipment_pagination_size')

  if (oldPageSize && !localStorage.getItem('equipment_list_pagesize')) {
    localStorage.setItem('equipment_list_pagesize', oldPageSize)
    localStorage.removeItem('equipment_pagination_size')
  }

  // Migrate other stored preferences
  migrateFilterPreferences()
  migrateCartState()
}
```

### 4. **Testing Migration Strategy**

#### Parallel Testing Environment

```bash
# Run both implementations simultaneously
npm run serve:legacy  # Original Bootstrap/jQuery version
npm run serve:vue3    # New Vue3 version

# Automated comparison testing
npm run test:migration-compare
```

#### User Acceptance Testing

```typescript
// A/B testing during migration
const EquipmentListPageWrapper = {
  setup() {
    const useVue3Version = useFeatureFlag('equipment-list-vue3')

    return () => useVue3Version.value
      ? h(VueEquipmentListPage)
      : h(LegacyEquipmentListPage)
  }
}
```

---

## Conclusion

The Equipment List page represents one of the most complex interfaces in the CINERENTAL system, successfully handling 845+ items across 43 pages with sophisticated filtering, real-time updates, and multiple integration points. The current implementation demonstrates several innovative UX patterns:

### Strengths to Preserve

- ✅ **Advanced pagination** with state persistence and dual synchronization
- ✅ **Intelligent search** with debouncing and visual feedback
- ✅ **Interactive status system** with project timeline visualization
- ✅ **Comprehensive accessibility** support with keyboard navigation
- ✅ **Mobile responsiveness** with adaptive table layouts

### Vue3 Migration Benefits

- 🚀 **Reactive state management** eliminates DOM manipulation complexity
- 🚀 **Component modularity** improves maintainability and testing
- 🚀 **Performance optimizations** with virtual scrolling and intelligent caching
- 🚀 **Type safety** with TypeScript throughout the stack
- 🚀 **Better developer experience** with Vue DevTools and hot reload

### Critical Success Factors

1. **Preserve UX patterns** that users already understand and rely on
2. **Maintain performance** for large datasets (845+ items) with optimization strategies
3. **Ensure accessibility** through proper ARIA labels and keyboard navigation
4. **Implement comprehensive testing** to prevent regression during migration
5. **Plan gradual rollout** with feature flags and parallel testing

The proposed Vue3 implementation maintains all existing functionality while providing a solid foundation for future enhancements, improved performance, and better maintainability.

---

**Analysis Complete**: 2025-08-29
**Next Steps**: Proceed with Phase 1 component development following migration roadmap
