import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '../project'
import { httpClient } from '@/services/api/http-client'

vi.mock('@/services/api/http-client');

describe('Project Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(httpClient.get).mockClear();
    vi.mocked(httpClient.post).mockClear();
  });

  it('fetches a single project successfully', async () => {
    const projectStore = useProjectStore();
    const mockProject = { id: 1, name: 'Test Project', bookings: [] };
    vi.mocked(httpClient.get).mockResolvedValue(mockProject);

    await projectStore.fetchProject(1);

    expect(projectStore.loading).toBe(false);
    expect(projectStore.currentProject).toEqual(mockProject);
    expect(httpClient.get).toHaveBeenCalledWith('/projects/1');
  });

  it('handles fetch project failure', async () => {
    const projectStore = useProjectStore();
    vi.mocked(httpClient.get).mockRejectedValue(new Error('Fetch failed'));

    await projectStore.fetchProject(1);

    expect(projectStore.loading).toBe(false);
    expect(projectStore.error).toBe('Failed to fetch project 1');
    expect(projectStore.currentProject).toBe(null);
  });

  it('adds equipment to a project', async () => {
    const projectStore = useProjectStore();
    // First, set a current project
    projectStore.currentProject = { id: 1, name: 'Test Project', bookings: [] };

    const newBookingData = { equipment: { id: 101 }, quantity: 1 };
    const mockBookingResponse = { id: 201, ...newBookingData };
    vi.mocked(httpClient.post).mockResolvedValue(mockBookingResponse);

    await projectStore.addEquipmentToProject(newBookingData as any);

    expect(projectStore.currentProject.bookings).toHaveLength(1);
    expect(projectStore.currentProject.bookings[0]).toEqual(mockBookingResponse);
    expect(httpClient.post).toHaveBeenCalledWith('/projects/1/bookings', newBookingData);
  });
});
