import { defineStore } from 'pinia'
import { ref, computed, shallowRef, watch } from 'vue'
import { useMemoryOptimization } from '@/composables/useMemoryOptimization'
import { StorePersistence, createDebouncedSave } from '@/plugins/store-persistence'
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
  // Memory optimization instance
  const memoryOpt = useMemoryOptimization()

  // --- PERSISTENCE SETUP ---
  const persistence = new StorePersistence({
    key: 'projects',
    version: 1,
    ttl: 30 * 60 * 1000, // 30 minutes cache for projects
    compress: true, // Compress large project datasets
    whitelist: ['projects', 'filters', 'pagination', 'bookingsPagination', 'lastFetch', 'lastProjectFetch'],
    beforeRestore: (data: any) => {
      // Validate restored data structure
      return {
        projects: Array.isArray(data.projects) ? data.projects : [],
        filters: data.filters && typeof data.filters === 'object' ? data.filters : {
          query: '',
          status: null,
          client_id: undefined,
          start_date: undefined,
          end_date: undefined
        },
        pagination: data.pagination && typeof data.pagination === 'object' ? data.pagination : {
          page: 1,
          size: 100,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        },
        bookingsPagination: data.bookingsPagination && typeof data.bookingsPagination === 'object' ? data.bookingsPagination : {
          page: 1,
          size: 50,
          total: 0,
          totalPages: 1
        },
        lastFetch: data.lastFetch || null,
        lastProjectFetch: data.lastProjectFetch || null
      }
    },
    onError: (error: Error, operation: string) => {
      console.error(`Projects store persistence ${operation} error:`, error)
    }
  })

  // --- STATE --- (Using memory-aware refs and shallow refs)
  const projects = memoryOpt.createMemoryAwareRef<ProjectData[]>(
    [],
    60, // 60MB memory limit for projects
    (projects) => {
      if (projects.length > 500) {
        console.log('📊 Projects store: Reducing dataset due to memory pressure')
        return projects.slice(-250) // Keep only most recent 250 projects
      }
      return projects
    }
  )
  const currentProject = shallowRef<ProjectWithBookings | null>(null)
  const projectBookings = memoryOpt.createMemoryAwareRef<ProjectBookingResponse[]>(
    [],
    40, // 40MB limit for bookings
    (bookings) => {
      if (bookings.length > 200) {
        return bookings.slice(-100) // Keep only most recent 100 bookings
      }
      return bookings
    }
  )
  const printData = shallowRef<ProjectPrintData | null>(null)

  // Memory-efficient caching
  const projectsCache = memoryOpt.createWeakCache<string, ProjectData[]>()
  const bookingsCache = new Map<number, { data: ProjectBookingResponse[], timestamp: number }>()
  const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
  const loading = ref(false)
  const lastFetch = ref<number | null>(null)
  const lastProjectFetch = ref<number | null>(null)
  const cacheExpiry = 20 * 60 * 1000 // 20 minutes cache for project lists
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

  // --- PERSISTENCE HELPERS ---
  const debouncedSave = createDebouncedSave(persistence, 500)

  function saveToStorage() {
    const stateToSave = {
      projects: projects.value,
      filters: filters.value,
      pagination: pagination.value,
      bookingsPagination: bookingsPagination.value,
      lastFetch: lastFetch.value,
      lastProjectFetch: lastProjectFetch.value
    }
    debouncedSave(stateToSave)
  }

  function loadFromStorage() {
    const restored = persistence.loadState()
    if (restored) {
      projects.value = restored.projects || []
      filters.value = { ...filters.value, ...restored.filters }
      pagination.value = { ...pagination.value, ...restored.pagination }
      bookingsPagination.value = { ...bookingsPagination.value, ...restored.bookingsPagination }
      lastFetch.value = restored.lastFetch
      lastProjectFetch.value = restored.lastProjectFetch
      console.log(`📊 Projects store: Restored ${projects.value.length} cached projects`)
    }
  }

  function shouldRefreshCache(): boolean {
    if (!lastFetch.value) return true
    return (Date.now() - lastFetch.value) > cacheExpiry
  }

  // --- COMPUTED --- (Memory-optimized with caching)
  const filteredProjects = computed(() => {
    if (!filters.value.query) return projects.value

    const cacheKey = `${filters.value.query}_${filters.value.status}_${filters.value.client_id}`
    const cached = projectsCache.get(cacheKey)

    if (cached) {
      return cached
    }

    const query = filters.value.query.toLowerCase()
    const filtered = projects.value.filter(project =>
      project.name.toLowerCase().includes(query) ||
      project.client_name.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
    )

    // Cache the filtered results
    projectsCache.set(cacheKey, filtered)

    return filtered
  })

  const totalProjects = computed(() => projects.value.length)
  const hasMore = computed(() => pagination.value.page < pagination.value.totalPages)

  const isDataStale = computed(() => shouldRefreshCache())

  const cacheInfo = computed(() => {
    const metadata = persistence.getMetadata()
    return {
      hasCache: !!metadata,
      lastUpdate: lastFetch.value ? new Date(lastFetch.value).toLocaleString() : null,
      isStale: isDataStale.value,
      projectCount: projects.value.length,
      ...metadata
    }
  })

  // --- ACTIONS ---
  async function fetchProjects(force = false) {
    // Use cached data if available and not stale (unless forced)
    if (!force && !shouldRefreshCache() && projects.value.length > 0) {
      console.log('📊 Projects store: Using cached data')
      return
    }

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
      lastFetch.value = Date.now()

      // Save to storage after successful fetch
      saveToStorage()
    } catch (err) {
      console.error('Failed to fetch projects:', err)
      error.value = 'Failed to load projects. Please try again.'
    } finally {
      loading.value = false
    }
  }

  async function fetchProject(projectId: number, force = false) {
    // Check if we already have this project cached and it's recent
    if (!force && currentProject.value?.id === projectId && lastProjectFetch.value) {
      const projectAge = Date.now() - lastProjectFetch.value
      if (projectAge < 5 * 60 * 1000) { // 5 minutes cache for individual projects
        console.log(`📊 Projects store: Using cached project ${projectId}`)
        return currentProject.value
      }
    }

    loading.value = true
    error.value = null

    try {
      currentProject.value = await projectsService.getProject(projectId)
      lastProjectFetch.value = Date.now()
      saveToStorage() // Save current project cache timestamp
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
    fetchProjects(true) // Force refresh when filters change
    saveToStorage() // Save filter changes
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
    saveToStorage() // Save pagination changes
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

  function clearCache() {
    persistence.clearState()
    projects.value = []
    currentProject.value = null
    projectBookings.value = []
    lastFetch.value = null
    lastProjectFetch.value = null
    bookingsCache.clear()
    console.log('🗑️ Projects store: Cache cleared')
  }

  function refreshData() {
    return fetchProjects(true) // Force refresh
  }

  // --- INITIALIZATION ---
  // Load persisted state on store creation
  loadFromStorage()

  // Watch for state changes to save automatically
  watch(
    [filters, pagination, bookingsPagination],
    () => {
      saveToStorage()
    },
    { deep: true }
  )

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
    lastFetch,
    lastProjectFetch,

    // Computed
    filteredProjects,
    totalProjects,
    hasMore,
    isDataStale,
    cacheInfo,

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
    refreshData,
    clearCache
  }
})
