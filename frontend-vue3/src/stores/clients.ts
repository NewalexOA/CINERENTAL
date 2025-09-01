import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { httpClient } from '@/services/api/http-client'

// This is a placeholder, a real Client type should be defined
export interface Client {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
}

export interface ClientFilters {
  query?: string
}

export interface PaginationState {
  page: number
  size: number
  total: number
  totalPages: number
}

export const useClientsStore = defineStore('clients', () => {
  // --- STATE ---
  const clients = ref<Client[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<ClientFilters>({ query: '' });
  const pagination = ref<PaginationState>({ page: 1, size: 20, total: 0, totalPages: 1 });

  // --- ACTIONS ---
  async function fetchClients() {
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

      const response = await httpClient.get<{ items: Client[], total: number, pages: number }>(`/clients/paginated?${params.toString()}`);
      clients.value = response.items;
      pagination.value.total = response.total;
      pagination.value.totalPages = response.pages;
    } catch (e) {
      error.value = 'Failed to fetch clients';
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  function setFilters(newFilters: Partial<ClientFilters>) {
    filters.value = { ...filters.value, ...newFilters };
    pagination.value.page = 1;
    fetchClients();
  }

  function setPage(page: number) {
    pagination.value.page = page;
    fetchClients();
  }

  return {
    clients,
    loading,
    error,
    filters,
    pagination,
    fetchClients,
    setFilters,
    setPage,
  };
});
