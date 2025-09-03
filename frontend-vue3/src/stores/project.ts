import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { httpClient } from '@/services/api/http-client'
import { StorePersistence, createDebouncedSave } from '@/plugins/store-persistence'
import type { EquipmentResponse } from '@/types/equipment' // Assuming this will be expanded

// Placeholder types for Project and Booking
export interface Booking {
  id: number;
  equipment: EquipmentResponse;
  quantity: number;
  start_date: string;
  end_date: string;
}

export interface Project {
  id: number;
  name: string;
  client_name: string;
  status: string;
  bookings: Booking[];
}

export const useProjectStore = defineStore('project', () => {
  // --- PERSISTENCE SETUP ---
  const persistence = new StorePersistence({
    key: 'project',
    version: 1,
    ttl: 60 * 60 * 1000, // 60 minutes for active project context
    compress: true, // Compress project data since it can be large
    enableTabSync: true, // Sync active project across tabs
    whitelist: ['currentProject', 'lastProjectFetch'],
    beforeRestore: (data: any) => {
      // Validate and sanitize restored project data
      return {
        currentProject: data.currentProject && typeof data.currentProject === 'object' ? {
          id: data.currentProject.id || null,
          name: data.currentProject.name || '',
          client_name: data.currentProject.client_name || '',
          status: data.currentProject.status || '',
          bookings: Array.isArray(data.currentProject.bookings) ? data.currentProject.bookings : []
        } : null,
        lastProjectFetch: typeof data.lastProjectFetch === 'number' ? data.lastProjectFetch : null
      }
    },
    onError: (error: Error, operation: string) => {
      console.error(`Project store persistence ${operation} error:`, error)
      if (operation === 'load') {
        // Don't break app if persistence fails
        console.warn('Using fresh project state due to persistence error')
      }
    },
    onTabSync: (syncedState: any) => {
      // Handle cross-tab synchronization for project context
      if (syncedState.currentProject &&
          (!currentProject.value || syncedState.currentProject.id !== currentProject.value.id)) {
        currentProject.value = syncedState.currentProject
        lastProjectFetch.value = syncedState.lastProjectFetch || null

        if (import.meta.env.DEV) {
          console.log('🔄 Project synced from other tab:', syncedState.currentProject.name)
        }
      }
    }
  })

  const debouncedSave = createDebouncedSave(persistence, 500)

  // --- STATE ---
  const initialState = persistence.loadState() || {}
  const currentProject = ref<Project | null>(initialState.currentProject || null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastProjectFetch = ref<number | null>(initialState.lastProjectFetch || null);

  // --- PERSISTENCE WATCHERS ---
  watch(
    () => ({
      currentProject: currentProject.value,
      lastProjectFetch: lastProjectFetch.value
    }),
    (state) => {
      debouncedSave(state)
    },
    { deep: true }
  )

  // --- ACTIONS ---
  async function fetchProject(projectId: number, forceRefresh: boolean = false) {
    // Check if we have recent cached data (within 5 minutes)
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    const hasRecentData = lastProjectFetch.value &&
                         currentProject.value?.id === projectId &&
                         (now - lastProjectFetch.value) < fiveMinutes

    if (!forceRefresh && hasRecentData) {
      console.log('Using cached project data')
      return
    }

    loading.value = true;
    error.value = null;
    try {
      // The actual endpoint might be different, this is based on analysis docs
      const projectData = await httpClient.get<Project>(`/projects/${projectId}`);
      currentProject.value = projectData;
      lastProjectFetch.value = now;
    } catch (e) {
      error.value = `Failed to fetch project ${projectId}`;
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  // Action to add equipment (booking) to the current project with optimistic updates
  async function addEquipmentToProject(bookingData: Omit<Booking, 'id'>) {
    if (!currentProject.value) {
      throw new Error('No current project selected')
    }

    // Store original state for rollback
    const originalBookings = [...currentProject.value.bookings]

    try {
      // Optimistic update: add temporary booking with negative ID
      const tempBooking: Booking = {
        id: -Date.now(), // Temporary negative ID
        ...bookingData
      }
      currentProject.value.bookings.push(tempBooking)

      // Make API call
      const newBooking = await httpClient.post<Booking>(
        `/projects/${currentProject.value.id}/bookings`,
        bookingData
      );

      // Replace temp booking with real one
      const tempIndex = currentProject.value.bookings.findIndex(b => b.id === tempBooking.id)
      if (tempIndex !== -1) {
        currentProject.value.bookings[tempIndex] = newBooking
      }

      // Update fetch timestamp to mark data as fresh
      lastProjectFetch.value = Date.now()

    } catch (e) {
      // Rollback optimistic update
      currentProject.value.bookings = originalBookings
      console.error('Failed to add equipment to project', e);
      throw e; // Re-throw for caller to handle
    }
  }

  // Clear persisted project data
  function clearProjectData(): void {
    currentProject.value = null
    lastProjectFetch.value = null
    error.value = null
    persistence.clearState()
  }

  // Check if project data is stale
  function isProjectDataStale(): boolean {
    if (!lastProjectFetch.value || !currentProject.value) return true
    const now = Date.now()
    const fifteenMinutes = 15 * 60 * 1000
    return (now - lastProjectFetch.value) > fifteenMinutes
  }

  // --- COMPUTED PROPERTIES ---
  const hasCurrentProject = computed(() => currentProject.value !== null)
  const currentProjectBookings = computed(() => currentProject.value?.bookings || [])
  const projectBookingCount = computed(() => currentProjectBookings.value.length)

  return {
    // State
    currentProject,
    loading,
    error,
    lastProjectFetch,

    // Computed
    hasCurrentProject,
    currentProjectBookings,
    projectBookingCount,

    // Actions
    fetchProject,
    addEquipmentToProject,
    clearProjectData,

    // Utilities
    isProjectDataStale,
  };
});
