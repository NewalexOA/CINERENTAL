import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  projectsService,
  type ProjectData,
  type ProjectWithBookings,
  type ProjectCreateData,
  type ProjectUpdateData,
  type ProjectPrintData,
  type ProjectBookingResponse
} from '@/services/api/projects'

export interface ProjectFilters {
  query?: string
  status?: string | null
  client_id?: number
  start_date?: string
  end_date?: string
}

export interface PaginationState {
  page: number
  size: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export const useProjectsStore = defineStore('projects', () => {
  // --- STATE ---
  const projects = ref<ProjectData[]>([])
  const currentProject = ref<ProjectWithBookings | null>(null)
  const projectBookings = ref<ProjectBookingResponse[]>([])
  const printData = ref<ProjectPrintData | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<ProjectFilters>({
    query: '',
    status: null,
    client_id: undefined,
    start_date: undefined,
    end_date: undefined
  })
  const pagination = ref<PaginationState>({
    page: 1,
    size: 100, // Optimized for virtual scrolling performance
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  })
  const bookingsPagination = ref<PaginationState>({
    page: 1,
    size: 50,
    total: 0,
    totalPages: 1
  })

  // --- COMPUTED ---
  const filteredProjects = computed(() => {
    if (!filters.value.query) return projects.value

    const query = filters.value.query.toLowerCase()
    return projects.value.filter(project =>
      project.name.toLowerCase().includes(query) ||
      project.client_name.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
    )
  })

  const totalProjects = computed(() => projects.value.length)
  const hasMore = computed(() => pagination.value.page < pagination.value.totalPages)

  // --- ACTIONS ---
  async function fetchProjects() {
    loading.value = true
    error.value = null

    try {
      const response = await projectsService.getProjectsPaginated({
        page: pagination.value.page,
        size: pagination.value.size,
        query: filters.value.query || undefined,
        project_status: filters.value.status || undefined,
        client_id: filters.value.client_id,
        start_date: filters.value.start_date,
        end_date: filters.value.end_date,
      })

      projects.value = response.items
      pagination.value.total = response.total
      pagination.value.totalPages = Math.ceil(response.total / pagination.value.size)
      pagination.value.hasNextPage = pagination.value.page < pagination.value.totalPages
      pagination.value.hasPreviousPage = pagination.value.page > 1
    } catch (err) {
      console.error('Failed to fetch projects:', err)
      error.value = 'Failed to load projects. Please try again.'
    } finally {
      loading.value = false
    }
  }

  async function fetchProject(projectId: number) {
    loading.value = true
    error.value = null

    try {
      currentProject.value = await projectsService.getProject(projectId)
      return currentProject.value
    } catch (err) {
      console.error('Failed to fetch project:', err)
      error.value = 'Failed to load project details. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createProject(projectData: ProjectCreateData) {
    loading.value = true
    error.value = null

    try {
      const newProject = await projectsService.createProject(projectData)
      projects.value.unshift(newProject)
      pagination.value.total++
      return newProject
    } catch (err) {
      console.error('Failed to create project:', err)
      error.value = 'Failed to create project. Please check the data and try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateProject(projectId: number, projectData: ProjectUpdateData) {
    loading.value = true
    error.value = null

    try {
      const updatedProject = await projectsService.updateProject(projectId, projectData)

      const index = projects.value.findIndex(p => p.id === projectId)
      if (index !== -1) {
        projects.value[index] = updatedProject
      }

      return updatedProject
    } catch (err) {
      console.error('Failed to update project:', err)
      error.value = 'Failed to update project. Please check the data and try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteProject(projectId: number) {
    loading.value = true
    error.value = null

    try {
      await projectsService.deleteProject(projectId)

      projects.value = projects.value.filter(p => p.id !== projectId)
      pagination.value.total--

      if (currentProject.value?.id === projectId) {
        currentProject.value = null
      }
    } catch (err) {
      console.error('Failed to delete project:', err)
      error.value = 'Failed to delete project. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchProjectBookings(projectId: number, bookingFilters: {
    query?: string
    category_id?: number
    date_filter?: 'all' | 'different' | 'matching'
  } = {}) {
    loading.value = true
    error.value = null

    try {
      const response = await projectsService.getProjectBookingsPaginated(projectId, {
        page: bookingsPagination.value.page,
        size: bookingsPagination.value.size,
        ...bookingFilters
      })

      projectBookings.value = response.items
      bookingsPagination.value.total = response.total
      bookingsPagination.value.totalPages = Math.ceil(response.total / bookingsPagination.value.size)
    } catch (err) {
      console.error('Failed to fetch project bookings:', err)
      error.value = 'Failed to load project bookings. Please try again.'
    } finally {
      loading.value = false
    }
  }

  async function fetchProjectPrintData(projectId: number) {
    loading.value = true
    error.value = null

    try {
      printData.value = await projectsService.getProjectPrintData(projectId)
      return printData.value
    } catch (err) {
      console.error('Failed to fetch project print data:', err)
      error.value = 'Failed to load project print data. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  function setFilters(newFilters: Partial<ProjectFilters>) {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.page = 1
    fetchProjects()
  }

  async function loadMore() {
    if (!hasMore.value || loadingMore.value || loading.value) {
      return
    }

    loadingMore.value = true
    error.value = null

    try {
      const nextPage = pagination.value.page + 1
      const response = await projectsService.getProjectsPaginated({
        page: nextPage,
        size: pagination.value.size,
        query: filters.value.query || undefined,
        project_status: filters.value.status || undefined,
        client_id: filters.value.client_id,
        start_date: filters.value.start_date,
        end_date: filters.value.end_date,
      })

      // Append new items to existing list
      const newItems = response.items.filter(newItem =>
        !projects.value.some(existingItem => existingItem.id === newItem.id)
      )
      projects.value.push(...newItems)

      // Update pagination
      pagination.value.page = nextPage
      pagination.value.hasNextPage = nextPage < pagination.value.totalPages
      pagination.value.hasPreviousPage = nextPage > 1
    } catch (err) {
      console.error('Failed to load more projects:', err)
      error.value = 'Failed to load more projects. Please try again.'
    } finally {
      loadingMore.value = false
    }
  }

  function setPage(page: number) {
    pagination.value.page = page
    fetchProjects()
  }

  function setBookingsPage(page: number) {
    bookingsPagination.value.page = page
    if (currentProject.value) {
      fetchProjectBookings(currentProject.value.id)
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    projects,
    currentProject,
    projectBookings,
    printData,
    loading,
    loadingMore,
    error,
    filters,
    pagination,
    bookingsPagination,

    // Computed
    filteredProjects,
    totalProjects,
    hasMore,

    // Actions
    fetchProjects,
    loadMore,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    fetchProjectBookings,
    fetchProjectPrintData,
    setFilters,
    setPage,
    setBookingsPage,
    clearError,
  }
})
