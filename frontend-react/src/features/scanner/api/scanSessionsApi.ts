/**
 * Scan Sessions API
 * TanStack Query hooks for managing scan sessions on the server
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import api from '@/lib/axios';
import { ServerScanSession, ScanSessionPayload } from '../types/scanner.types';

// ============================================================================
// API Service Functions
// ============================================================================

const scanSessionsApi = {
  /**
   * Get all scan sessions (optionally filtered by user_id)
   */
  getAll: async (userId?: number) => {
    const response = await api.get<ServerScanSession[]>('/scan-sessions/', {
      params: userId ? { user_id: userId } : undefined
    });
    return response.data;
  },

  /**
   * Get single scan session by ID
   */
  getById: async (sessionId: number) => {
    const response = await api.get<ServerScanSession>(`/scan-sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Create new scan session
   */
  create: async (payload: ScanSessionPayload) => {
    const response = await api.post<ServerScanSession>('/scan-sessions/', payload);
    return response.data;
  },

  /**
   * Update existing scan session
   */
  update: async (sessionId: number, payload: ScanSessionPayload) => {
    const response = await api.put<ServerScanSession>(`/scan-sessions/${sessionId}`, payload);
    return response.data;
  },

  /**
   * Delete scan session
   */
  delete: async (sessionId: number) => {
    await api.delete(`/scan-sessions/${sessionId}`);
  },

  /**
   * Clean expired sessions
   */
  cleanExpired: async () => {
    const response = await api.post<{ deleted_count: number }>('/scan-sessions/clean-expired');
    return response.data;
  }
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Query hook to fetch all scan sessions (optionally filtered by user)
 *
 * @param userId - Optional user ID to filter sessions
 * @param options - Additional query options
 *
 * @example
 * const { data: sessions, isLoading } = useScanSessions();
 * const { data: mySessions } = useScanSessions(currentUserId);
 */
export function useScanSessions(
  userId?: number,
  options?: Omit<UseQueryOptions<ServerScanSession[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userId ? ['scan-sessions', { userId }] : ['scan-sessions'],
    queryFn: () => scanSessionsApi.getAll(userId),
    ...options
  });
}

/**
 * Query hook to fetch a single scan session by ID
 *
 * @param sessionId - Scan session ID
 * @param options - Additional query options
 *
 * @example
 * const { data: session, isLoading } = useScanSession(123);
 */
export function useScanSession(
  sessionId: number,
  options?: Omit<UseQueryOptions<ServerScanSession, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['scan-sessions', sessionId],
    queryFn: () => scanSessionsApi.getById(sessionId),
    enabled: !!sessionId,
    ...options
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Mutation hook to create a new scan session
 *
 * @example
 * const createSession = useCreateScanSession();
 *
 * createSession.mutate({
 *   name: 'My Session',
 *   items: [...],
 *   user_id: 1
 * }, {
 *   onSuccess: (session) => console.log('Created:', session.id)
 * });
 */
export function useCreateScanSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ScanSessionPayload) => scanSessionsApi.create(payload),
    onSuccess: () => {
      // Invalidate all scan-sessions queries to refetch
      queryClient.invalidateQueries({ queryKey: ['scan-sessions'] });
    }
  });
}

/**
 * Mutation hook to update an existing scan session
 *
 * @example
 * const updateSession = useUpdateScanSession();
 *
 * updateSession.mutate({
 *   sessionId: 123,
 *   payload: { name: 'Updated Name', items: [...] }
 * });
 */
export function useUpdateScanSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, payload }: { sessionId: number; payload: ScanSessionPayload }) =>
      scanSessionsApi.update(sessionId, payload),
    onSuccess: (data) => {
      // Invalidate specific session and list queries
      queryClient.invalidateQueries({ queryKey: ['scan-sessions', data.id] });
      queryClient.invalidateQueries({ queryKey: ['scan-sessions'] });
    }
  });
}

/**
 * Mutation hook to delete a scan session
 *
 * @example
 * const deleteSession = useDeleteScanSession();
 *
 * deleteSession.mutate(123, {
 *   onSuccess: () => toast.success('Session deleted')
 * });
 */
export function useDeleteScanSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: number) => scanSessionsApi.delete(sessionId),
    onSuccess: () => {
      // Invalidate list to refetch without deleted item
      queryClient.invalidateQueries({ queryKey: ['scan-sessions'] });
    }
  });
}

/**
 * Mutation hook to clean expired sessions
 *
 * @example
 * const cleanExpired = useCleanExpiredSessions();
 *
 * cleanExpired.mutate(undefined, {
 *   onSuccess: (data) => console.log(`Deleted ${data.deleted_count} expired sessions`)
 * });
 */
export function useCleanExpiredSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => scanSessionsApi.cleanExpired(),
    onSuccess: () => {
      // Invalidate to refetch list after cleanup
      queryClient.invalidateQueries({ queryKey: ['scan-sessions'] });
    }
  });
}
