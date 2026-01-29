/**
 * Equipment API (Scanner Context)
 * TanStack Query hooks for equipment operations within the scanner feature
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Equipment, EquipmentStatus } from '@/types/equipment';
import { EquipmentTimelineEntry, EquipmentBooking } from '../types/scanner.types';

// ============================================================================
// API Service Functions
// ============================================================================

const equipmentApi = {
  /**
   * Lookup equipment by barcode
   */
  getByBarcode: async (barcode: string) => {
    const response = await api.get<Equipment>(`/equipment/barcode/${barcode}`);
    return response.data;
  },

  /**
   * Update equipment status
   */
  updateStatus: async (equipmentId: number, status: EquipmentStatus) => {
    const response = await api.put<Equipment>(
      `/equipment/${equipmentId}/status`,
      null,
      { params: { status } }
    );
    return response.data;
  },

  /**
   * Get equipment status history timeline
   */
  getTimeline: async (equipmentId: number) => {
    const response = await api.get<EquipmentTimelineEntry[]>(`/equipment/${equipmentId}/timeline`);
    return response.data;
  },

  /**
   * Get equipment booking history
   */
  getBookings: async (equipmentId: number) => {
    const response = await api.get<EquipmentBooking[]>(`/equipment/${equipmentId}/bookings`);
    return response.data;
  }
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Query hook to lookup equipment by barcode
 *
 * @param barcode - Equipment barcode to search
 * @param options - Additional query options (especially `enabled` for conditional fetching)
 *
 * @example
 * // Auto-fetch on barcode change
 * const { data: equipment, isLoading } = useEquipmentByBarcode('12345678901');
 *
 * // Manual trigger with enabled flag
 * const [barcode, setBarcode] = useState('');
 * const { data, refetch } = useEquipmentByBarcode(barcode, { enabled: false });
 */
export function useEquipmentByBarcode(
  barcode: string,
  options?: Omit<UseQueryOptions<Equipment, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['equipment', 'barcode', barcode],
    queryFn: () => equipmentApi.getByBarcode(barcode),
    enabled: !!barcode && barcode.length >= 3, // Require minimum barcode length
    retry: false, // Don't retry on not found
    ...options
  });
}

/**
 * Query hook to fetch equipment status timeline
 *
 * @param equipmentId - Equipment ID
 * @param options - Additional query options
 *
 * @example
 * const { data: timeline } = useEquipmentTimeline(equipmentId);
 * // timeline = [{ id, status, previous_status, changed_at, changed_by, notes }, ...]
 */
export function useEquipmentTimeline(
  equipmentId: number,
  options?: Omit<UseQueryOptions<EquipmentTimelineEntry[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['equipment', equipmentId, 'timeline'],
    queryFn: () => equipmentApi.getTimeline(equipmentId),
    enabled: !!equipmentId,
    ...options
  });
}

/**
 * Query hook to fetch equipment booking history
 *
 * @param equipmentId - Equipment ID
 * @param options - Additional query options
 *
 * @example
 * const { data: bookings } = useEquipmentBookings(equipmentId);
 * // bookings = [{ id, project_id, project_name, client_name, start_date, end_date, status }, ...]
 */
export function useEquipmentBookings(
  equipmentId: number,
  options?: Omit<UseQueryOptions<EquipmentBooking[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['equipment', equipmentId, 'bookings'],
    queryFn: () => equipmentApi.getBookings(equipmentId),
    enabled: !!equipmentId,
    ...options
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Mutation hook to update equipment status
 *
 * @example
 * const updateStatus = useUpdateEquipmentStatus();
 *
 * updateStatus.mutate({
 *   equipmentId: 123,
 *   status: EquipmentStatus.AVAILABLE
 * }, {
 *   onSuccess: (equipment) => {
 *     toast.success(`Status updated to ${equipment.status}`);
 *   },
 *   onError: (error) => {
 *     toast.error(`Failed: ${error.message}`);
 *   }
 * });
 */
export function useUpdateEquipmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ equipmentId, status }: { equipmentId: number; status: EquipmentStatus }) =>
      equipmentApi.updateStatus(equipmentId, status),
    onSuccess: (_data, variables) => {
      // Invalidate equipment detail queries
      queryClient.invalidateQueries({ queryKey: ['equipment', variables.equipmentId] });
      // Invalidate equipment list queries (status may affect filtering)
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      // Invalidate timeline to show new status change
      queryClient.invalidateQueries({ queryKey: ['equipment', variables.equipmentId, 'timeline'] });
    }
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Prefetch equipment by barcode (useful for optimistic UX)
 *
 * @example
 * const queryClient = useQueryClient();
 *
 * // Prefetch on barcode input complete
 * if (barcode.length === 11) {
 *   prefetchEquipmentByBarcode(queryClient, barcode);
 * }
 */
export async function prefetchEquipmentByBarcode(
  queryClient: ReturnType<typeof useQueryClient>,
  barcode: string
) {
  await queryClient.prefetchQuery({
    queryKey: ['equipment', 'barcode', barcode],
    queryFn: () => equipmentApi.getByBarcode(barcode)
  });
}
