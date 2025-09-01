import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { httpClient } from '@/services/api/http-client'
import type { Booking } from './project' // Re-using booking type from project store

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
  // --- STATE ---
  const bookings = ref<Booking[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<BookingFilters>({ query: '', status: null });
  const pagination = ref<PaginationState>({ page: 1, size: 20, total: 0, totalPages: 1 });

  // --- ACTIONS ---
  async function fetchBookings() {
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
    fetchBookings();
  }

  function setPage(page: number) {
    pagination.value.page = page;
    fetchBookings();
  }

  return {
    bookings,
    loading,
    error,
    filters,
    pagination,
    fetchBookings,
    setFilters,
    setPage,
  };
});
