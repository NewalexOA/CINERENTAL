import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEquipmentStore } from '../equipment'
import { httpClient } from '@/services/api/http-client'

vi.mock('@/services/api/http-client');

describe('Equipment Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(httpClient.get).mockClear();
  });

  it('fetches equipment successfully', async () => {
    const equipmentStore = useEquipmentStore();
    const mockResponse = {
      items: [{ id: 1, name: 'Test Equipment' }],
      total: 1,
      pages: 1,
    };
    vi.mocked(httpClient.get).mockResolvedValue(mockResponse);

    await equipmentStore.fetchEquipment();

    expect(equipmentStore.loading).toBe(false);
    expect(equipmentStore.items).toEqual(mockResponse.items);
    expect(equipmentStore.pagination.total).toBe(1);
    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });

  it('handles fetch equipment failure', async () => {
    const equipmentStore = useEquipmentStore();
    vi.mocked(httpClient.get).mockRejectedValue(new Error('Fetch failed'));

    await equipmentStore.fetchEquipment();

    expect(equipmentStore.loading).toBe(false);
    expect(equipmentStore.error).toBe('Failed to fetch equipment');
    expect(equipmentStore.items).toEqual([]);
  });

  it('sets filters and resets pagination', async () => {
    const equipmentStore = useEquipmentStore();
    vi.mocked(httpClient.get).mockResolvedValue({ items: [], total: 0, pages: 1 });

    equipmentStore.setFilters({ query: 'test' });

    expect(equipmentStore.filters.query).toBe('test');
    expect(equipmentStore.pagination.page).toBe(1);
    expect(httpClient.get).toHaveBeenCalledTimes(1); // fetchEquipment is called
  });

  it('sets page and fetches equipment', async () => {
    const equipmentStore = useEquipmentStore();
    vi.mocked(httpClient.get).mockResolvedValue({ items: [], total: 0, pages: 1 });

    equipmentStore.setPage(2);

    expect(equipmentStore.pagination.page).toBe(2);
    expect(httpClient.get).toHaveBeenCalledTimes(1); // fetchEquipment is called
  });
});
