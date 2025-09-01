import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { httpClient } from '@/services/api/http-client'
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
  // --- STATE ---
  const currentProject = ref<Project | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- ACTIONS ---
  async function fetchProject(projectId: number) {
    loading.value = true;
    error.value = null;
    try {
      // The actual endpoint might be different, this is based on analysis docs
      const projectData = await httpClient.get<Project>(`/projects/${projectId}`);
      currentProject.value = projectData;
    } catch (e) {
      error.value = `Failed to fetch project ${projectId}`;
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  // Action to add equipment (booking) to the current project
  async function addEquipmentToProject(bookingData: Omit<Booking, 'id'>) {
    if (!currentProject.value) return;

    try {
      // This would call a booking creation endpoint
      const newBooking = await httpClient.post<Booking>(
        `/projects/${currentProject.value.id}/bookings`,
        bookingData
      );
      currentProject.value.bookings.push(newBooking);
    } catch (e) {
      console.error('Failed to add equipment to project', e);
      // Handle error appropriately
    }
  }

  return {
    currentProject,
    loading,
    error,
    fetchProject,
    addEquipmentToProject,
  };
});
