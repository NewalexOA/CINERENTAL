import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** Enable auto-sync interval */
  enableAutoSync?: boolean;
  /** Enable beforeunload sync */
  enableBeforeUnload?: boolean;
}

/**
 * API functions placeholder - will be implemented by another agent
 * These functions should be imported from '../api/scanSessionsApi'
 */
interface ScanSessionsApi {
  createScanSession: (payload: ScanSessionPayload) => Promise<ServerScanSession>;
  updateScanSession: (id: number, payload: ScanSessionPayload) => Promise<ServerScanSession>;
}

// Placeholder API - replace with actual import when available
const scanSessionsApi: ScanSessionsApi = {
  createScanSession: async () => {
    throw new Error('API not implemented');
  },
  updateScanSession: async () => {
    throw new Error('API not implemented');
  },
};

/**
 * Convert local session to server payload
 */
function sessionToPayload(session: ScanSession): ScanSessionPayload {
  return {
    name: session.name,
    items: session.items.map((item) => ({
      equipment_id: item.equipment_id,
      barcode: item.barcode,
      name: item.name,
      category_id: item.category_id,
      category_name: item.category_name,
      serial_number: item.serial_number || null,
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
 * - Auto-sync interval using AUTO_SYNC_INTERVAL_MS constant
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
 *     console.log('Synced:', serverSession.id);
 *   },
 * });
 *
 * // Manual sync
 * await syncNow();
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

  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  const syncStatus = calculateSyncStatus(session, isSyncing, syncError);

  /**
   * Perform sync operation
   */
  const performSync = useCallback(async (): Promise<void> => {
    if (!session) {
      return;
    }

    // Prevent concurrent syncs
    if (isSyncingRef.current) {
      return;
    }

    // Only sync if session has changes or never synced
    if (!session.dirty && session.syncedWithServer) {
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const payload = sessionToPayload(session);
      let serverSession: ServerScanSession;

      if (session.serverSessionId) {
        // Update existing server session
        serverSession = await scanSessionsApi.updateScanSession(
          session.serverSessionId,
          payload
        );
      } else {
        // Create new server session
        serverSession = await scanSessionsApi.createScanSession(payload);
      }

      // Update local session with server details
      if (onSyncSuccess) {
        onSyncSuccess(serverSession);
      }

      setLastSyncedAt(new Date());
      setSyncError(null);
    } catch (error) {
      const syncError = error instanceof Error ? error : new Error('Sync failed');
      setSyncError(syncError);

      if (onSyncError) {
        onSyncError(syncError);
      }

      console.error('Session sync failed:', syncError);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [session, onSyncSuccess, onSyncError]);

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async (): Promise<void> => {
    await performSync();
  }, [performSync]);

  /**
   * Setup auto-sync interval
   */
  useEffect(() => {
    if (!enableAutoSync || !session) {
      return;
    }

    // Clear existing interval
    if (autoSyncIntervalRef.current) {
      clearInterval(autoSyncIntervalRef.current);
    }

    // Setup new interval
    autoSyncIntervalRef.current = setInterval(() => {
      performSync();
    }, SCANNER_CONSTANTS.AUTO_SYNC_INTERVAL_MS);

    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
        autoSyncIntervalRef.current = null;
      }
    };
  }, [enableAutoSync, session, performSync]);

  /**
   * Sync on beforeunload
   */
  useEffect(() => {
    if (!enableBeforeUnload || !session) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only prompt if session has unsaved changes
      if (session.dirty) {
        e.preventDefault();
        e.returnValue = '';

        // Attempt sync (may not complete in time)
        performSync();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enableBeforeUnload, session, performSync]);

  /**
   * Initial sync when session becomes available
   */
  useEffect(() => {
    if (session && session.dirty) {
      // Debounce initial sync
      const timeoutId = setTimeout(() => {
        performSync();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [session?.id]); // Only trigger on session ID change

  return {
    isSyncing,
    lastSyncedAt,
    syncError,
    syncNow,
    syncStatus,
  };
}

/**
 * Update this export when API is implemented:
 * export { scanSessionsApi } from '../api/scanSessionsApi';
 */
export { scanSessionsApi };
