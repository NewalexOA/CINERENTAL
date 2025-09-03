import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { httpClient } from '@/services/api/http-client'
import type { Booking } from './project' // Re-using booking type from project store
import { StorePersistence, createDebouncedSave } from '@/plugins/store-persistence'

export interface BookingFilters {
  query?: string
  status?: string | null
}

export interface PaginationState {
  page: number
  size: number
  total: number
  totalPages: number
}

export const useBookingsStore = defineStore('bookings', () => {
  // --- PERSISTENCE SETUP ---
  const persistence = new StorePersistence({
    key: 'bookings',
    version: 1,
    ttl: 15 * 60 * 1000, // 15 minutes cache for bookings (shorter due to frequent changes)
    compress: true,
    whitelist: ['bookings', 'filters', 'pagination', 'lastFetch'],
    beforeRestore: (data: any) => {
      // Validate restored data structure
      return {
        bookings: Array.isArray(data.bookings) ? data.bookings : [],
        filters: data.filters && typeof data.filters === 'object' ? data.filters : {
          query: '',
          status: null
        },
        pagination: data.pagination && typeof data.pagination === 'object' ? data.pagination : {
          page: 1,
          size: 20,
          total: 0,
          totalPages: 1
        },
        lastFetch: data.lastFetch || null
      }
    },
    onError: (error: Error, operation: string) => {
      console.error(`Bookings store persistence ${operation} error:`, error)
    }
  })

  // --- STATE ---
  const bookings = ref<Booking[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<BookingFilters>({ query: '', status: null });
  const pagination = ref<PaginationState>({ page: 1, size: 20, total: 0, totalPages: 1 });
  const lastFetch = ref<number | null>(null)
  const cacheExpiry = 10 * 60 * 1000 // 10 minutes cache for booking lists

  // --- PERSISTENCE HELPERS ---
  const debouncedSave = createDebouncedSave(persistence, 500)

  function saveToStorage() {
    const stateToSave = {
      bookings: bookings.value,
      filters: filters.value,
      pagination: pagination.value,
      lastFetch: lastFetch.value
    }
    debouncedSave(stateToSave)
  }

  function loadFromStorage() {
    const restored = persistence.loadState()
    if (restored) {
      bookings.value = restored.bookings || []
      filters.value = { ...filters.value, ...restored.filters }
      pagination.value = { ...pagination.value, ...restored.pagination }
      lastFetch.value = restored.lastFetch
      console.log(`📅 Bookings store: Restored ${bookings.value.length} cached bookings`)
    }
  }

  function shouldRefreshCache(): boolean {
    if (!lastFetch.value) return true
    return (Date.now() - lastFetch.value) > cacheExpiry
  }

  // --- COMPUTED ---
  const isDataStale = computed(() => shouldRefreshCache())

  const cacheInfo = computed(() => {
    const metadata = persistence.getMetadata()
    return {
      hasCache: !!metadata,
      lastUpdate: lastFetch.value ? new Date(lastFetch.value).toLocaleString() : null,
      isStale: isDataStale.value,
      bookingCount: bookings.value.length,
      ...metadata
    }
  })

  // --- ACTIONS ---
  async function fetchBookings(force = false) {
    // Use cached data if available and not stale (unless forced)
    if (!force && !shouldRefreshCache() && bookings.value.length > 0) {
      console.log('📅 Bookings store: Using cached data')
      return
    }

    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams({
        page: pagination.value.page.toString(),
        size: pagination.value.size.toString(),
      });

      if (filters.value.query) {
        params.append('query', filters.value.query);
      }
      if (filters.value.status) {
        params.append('status', filters.value.status);
      }

      const response = await httpClient.get<{ items: Booking[], total: number, pages: number }>(`/bookings/paginated?${params.toString()}`);
      bookings.value = response.items;
      pagination.value.total = response.total;
      pagination.value.totalPages = response.pages;
      lastFetch.value = Date.now()

      // Save to storage after successful fetch
      saveToStorage()
    } catch (e) {
      error.value = 'Failed to fetch bookings';
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  function setFilters(newFilters: Partial<BookingFilters>) {
    filters.value = { ...filters.value, ...newFilters };
    pagination.value.page = 1;
    fetchBookings(true); // Force refresh when filters change
    saveToStorage(); // Save filter changes
  }

  function setPage(page: number) {
    pagination.value.page = page;
    fetchBookings();
    saveToStorage(); // Save pagination changes
  }

  function clearCache() {
    persistence.clearState()
    bookings.value = []
    lastFetch.value = null
    console.log('🗑️ Bookings store: Cache cleared')
  }

  function refreshData() {
    return fetchBookings(true) // Force refresh
  }

  // --- INITIALIZATION ---
  // Load persisted state on store creation
  loadFromStorage()

  // Watch for state changes to save automatically
  watch(
    [filters, pagination],
    () => {
      saveToStorage()
    },
    { deep: true }
  )

  return {
    // State
    bookings,
    loading,
    error,
    filters,
    pagination,
    lastFetch,

    // Computed
    isDataStale,
    cacheInfo,

    // Actions
    fetchBookings,
    setFilters,
    setPage,
    refreshData,
    clearCache
  };
});
