import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { httpClient } from '@/services/api/http-client'
import type { Project } from './project'; // Re-use the single project type

export interface ProjectFilters {
  query?: string
  status?: string | null
}

export interface PaginationState {
  page: number
  size: number
  total: number
  totalPages: number
}

export const useProjectsStore = defineStore('projects', () => {
  // --- STATE ---
  const projects = ref<Project[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<ProjectFilters>({ query: '', status: null });
  const pagination = ref<PaginationState>({ page: 1, size: 20, total: 0, totalPages: 1 });

  // --- ACTIONS ---
  async function fetchProjects() {
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

      const response = await httpClient.get<{ items: Project[], total: number, pages: number }>(`/projects/paginated?${params.toString()}`);
      projects.value = response.items;
      pagination.value.total = response.total;
      pagination.value.totalPages = response.pages;
    } catch (e) {
      error.value = 'Failed to fetch projects';
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  function setFilters(newFilters: Partial<ProjectFilters>) {
    filters.value = { ...filters.value, ...newFilters };
    pagination.value.page = 1; // Reset to first page on filter change
    fetchProjects();
  }

  function setPage(page: number) {
    pagination.value.page = page;
    fetchProjects();
  }

  return {
    projects,
    loading,
    error,
    filters,
    pagination,
    fetchProjects,
    setFilters,
    setPage,
  };
});
