import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/axios';
import {
  ScanSession,
  ScanSessionPayload,
  ServerScanSession,
  SyncStatus,
  SCANNER_CONSTANTS,
} from '../types/scanner.types';

/**
 * Hook return interface for session synchronization
 */
interface UseSessionSync {
  /** Whether sync operation is in progress */
  isSyncing: boolean;
  /** Timestamp of last successful sync */
  lastSyncedAt: Date | null;
  /** Error from last sync attempt */
  syncError: Error | null;
  /** Manually trigger sync */
  syncNow: () => Promise<void>;
  /** Current sync status */
  syncStatus: SyncStatus;
}

/**
 * Options for session sync hook
 */
interface UseSessionSyncOptions {
  /** Session to sync with server */
  session: ScanSession | null;
  /** Callback when sync completes successfully */
  onSyncSuccess?: (serverSession: ServerScanSession) => void;
  /** Callback when sync fails */
  onSyncError?: (error: Error) => void;
  /** Enable auto-sync on session changes */
  enableAutoSync?: boolean;
  /** Enable beforeunload sync */
  enableBeforeUnload?: boolean;
}

/**
 * API functions for session sync
 */
const syncApi = {
  create: async (payload: ScanSessionPayload): Promise<ServerScanSession> => {
    const response = await api.post<ServerScanSession>('/scan-sessions/', payload);
    return response.data;
  },
  update: async (id: number, payload: ScanSessionPayload): Promise<ServerScanSession> => {
    const response = await api.put<ServerScanSession>(`/scan-sessions/${id}`, payload);
    return response.data;
  },
};

/**
 * Convert local session to server payload.
 * Only sends equipment_id + quantity — server enriches from current DB state.
 */
function sessionToPayload(session: ScanSession): ScanSessionPayload {
  return {
    name: session.name,
    items: session.items.map((item) => ({
      equipment_id: item.equipment_id,
      quantity: item.quantity,
    })),
  };
}

/**
 * Calculate current sync status
 */
function calculateSyncStatus(
  session: ScanSession | null,
  isSyncing: boolean,
  syncError: Error | null
): SyncStatus {
  if (!session) {
    return 'local_only';
  }

  if (syncError) {
    return 'error';
  }

  if (isSyncing) {
    return 'dirty';
  }

  if (session.dirty) {
    return 'dirty';
  }

  if (session.syncedWithServer && session.serverSessionId) {
    return 'synced';
  }

  return 'local_only';
}

/**
 * Server synchronization hook for scan sessions
 *
 * Features:
 * - Sync session to server (POST if new, PUT if has serverSessionId)
 * - Debounced auto-sync on every session change (updatedAt)
 * - Manual sync trigger
 * - beforeunload sync attempt
 * - Error handling with retry
 * - Updates session with server ID after successful sync
 *
 * @example
 * ```typescript
 * const { isSyncing, syncNow, syncStatus } = useSessionSync({
 *   session: activeSession,
 *   enableAutoSync: true,
 *   onSyncSuccess: (serverSession) => {
 *     markSynced(serverSession.id);
 *   },
 * });
 * ```
 */
export function useSessionSync({
  session,
  onSyncSuccess,
  onSyncError,
  enableAutoSync = true,
  enableBeforeUnload = true,
}: UseSessionSyncOptions): UseSessionSync {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const isSyncingRef = useRef(false);
  // Store latest session in ref so performSync always uses current data
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const onSyncSuccessRef = useRef(onSyncSuccess);
  onSyncSuccessRef.current = onSyncSuccess;

  const onSyncErrorRef = useRef(onSyncError);
  onSyncErrorRef.current = onSyncError;

  const syncStatus = calculateSyncStatus(session, isSyncing, syncError);

  /**
   * Perform sync operation using latest session from ref
   */
  const performSync = useCallback(async (): Promise<void> => {
    const currentSession = sessionRef.current;

    if (!currentSession) {
      return;
    }

    // Prevent concurrent syncs
    if (isSyncingRef.current) {
      return;
    }

    // Only sync if session has changes or never synced
    if (!currentSession.dirty && currentSession.syncedWithServer) {
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const payload = sessionToPayload(currentSession);
      let serverSession: ServerScanSession;

      if (currentSession.serverSessionId) {
        // Update existing server session
        serverSession = await syncApi.update(
          currentSession.serverSessionId,
          payload
        );
      } else {
        // Create new server session
        serverSession = await syncApi.create(payload);
      }

      // Update local session with server details
      onSyncSuccessRef.current?.(serverSession);

      setLastSyncedAt(new Date());
      setSyncError(null);
    } catch (error) {
      const syncErr = error instanceof Error ? error : new Error('Sync failed');
      setSyncError(syncErr);
      onSyncErrorRef.current?.(syncErr);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async (): Promise<void> => {
    try {
      await performSync();
    } catch (error) {
      console.error('Session sync failed:', error);
    }
  }, [performSync]);

  /**
   * Debounced sync on every session change (updatedAt)
   * Triggers after SYNC_DEBOUNCE_MS of inactivity
   */
  useEffect(() => {
    if (!enableAutoSync || !session || !session.dirty) {
      return;
    }

    const timeoutId = setTimeout(() => {
      performSync();
    }, SCANNER_CONSTANTS.SYNC_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [enableAutoSync, session?.updatedAt, performSync]);

  /**
   * Sync on beforeunload
   */
  useEffect(() => {
    if (!enableBeforeUnload || !session) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (session.dirty) {
        e.preventDefault();
        e.returnValue = '';
        performSync();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enableBeforeUnload, session, performSync]);

  return {
    isSyncing,
    lastSyncedAt,
    syncError,
    syncNow,
    syncStatus,
  };
}
