import { useCallback, useEffect, useState } from 'react';
import {
  ScanSession,
  SessionItem,
  AddEquipmentResult,
  STORAGE_KEYS,
} from '../types/scanner.types';

/**
 * Hook return interface for scan session management
 */
interface UseScanSession {
  /** Current active session or null */
  activeSession: ScanSession | null;
  /** All stored sessions */
  sessions: ScanSession[];
  /** Get all sessions from localStorage */
  getSessions: () => ScanSession[];
  /** Get currently active session */
  getActiveSession: () => ScanSession | null;
  /** Set active session by ID */
  setActiveSession: (id: string) => void;
  /** Create new session with given name and optional initial items */
  createSession: (name: string, items?: SessionItem[]) => ScanSession;
  /** Add equipment to current session */
  addEquipment: (equipment: SessionItem) => AddEquipmentResult;
  /** Remove equipment from current session */
  removeEquipment: (equipmentId: number, serialNumber?: string) => void;
  /** Decrement quantity for non-serialized equipment */
  decrementQuantity: (equipmentId: number) => void;
  /** Update quantity for non-serialized equipment */
  updateQuantity: (equipmentId: number, quantity: number) => void;
  /** Clear all items from current session */
  clearSession: () => void;
  /** Delete session by ID */
  deleteSession: (id: string) => void;
  /** Rename current session */
  renameSession: (name: string) => void;
  /** Mark session as having unsaved changes */
  markDirty: () => void;
  /** Mark session as saved */
  markClean: () => void;
  /** Mark session as synced with server */
  markSynced: (serverSessionId: number) => void;
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `local_${Date.now()}`;
}

/**
 * Load sessions from localStorage
 */
function loadSessions(): ScanSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load sessions from localStorage:', error);
    return [];
  }
}

/**
 * Save sessions to localStorage
 */
function saveSessions(sessions: ScanSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save sessions to localStorage:', error);
  }
}

/**
 * Load active session ID from localStorage
 */
function loadActiveSessionId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
  } catch (error) {
    console.error('Failed to load active session ID:', error);
    return null;
  }
}

/**
 * Save active session ID to localStorage
 */
function saveActiveSessionId(id: string | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, id);
    }
  } catch (error) {
    console.error('Failed to save active session ID:', error);
  }
}

/**
 * Scan session management hook with localStorage
 *
 * Features:
 * - CRUD operations for sessions stored in localStorage
 * - Duplicate detection logic:
 *   - Serialized (has serial_number): block exact duplicates by equipment_id + serial_number
 *   - Non-serialized (no serial_number): increment quantity
 * - Auto-save to localStorage on every operation
 * - Active session tracking
 *
 * @example
 * ```typescript
 * const { activeSession, createSession, addEquipment } = useScanSession();
 *
 * // Create new session
 * const session = createSession('Morning Scan');
 *
 * // Add equipment
 * const result = addEquipment({
 *   equipment_id: 1,
 *   name: 'Camera A',
 *   barcode: '12345',
 *   serial_number: 'SN001',
 *   category_id: 1,
 *   category_name: 'Cameras',
 *   quantity: 1,
 * });
 * ```
 */
export function useScanSession(): UseScanSession {
  const [sessions, setSessions] = useState<ScanSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(loadActiveSessionId);

  // Find active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  /**
   * Get all sessions
   */
  const getSessions = useCallback((): ScanSession[] => {
    return loadSessions();
  }, []);

  /**
   * Get active session
   */
  const getActiveSession = useCallback((): ScanSession | null => {
    const id = loadActiveSessionId();
    if (!id) return null;
    const allSessions = loadSessions();
    return allSessions.find((s) => s.id === id) || null;
  }, []);

  /**
   * Set active session
   */
  const setActiveSession = useCallback((id: string) => {
    saveActiveSessionId(id);
    setActiveSessionId(id);
  }, []);

  /**
   * Create new session
   */
  const createSession = useCallback((name: string, initialItems?: SessionItem[]): ScanSession => {
    const newSession: ScanSession = {
      id: generateSessionId(),
      name,
      items: initialItems ? initialItems.map((item) => ({ ...item, addedAt: new Date().toISOString() })) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncedWithServer: false,
      serverSessionId: null,
      dirty: initialItems ? true : false,
    };

    const allSessions = loadSessions();
    const updatedSessions = [...allSessions, newSession];
    saveSessions(updatedSessions);
    setSessions(updatedSessions);

    // Set as active session
    saveActiveSessionId(newSession.id);
    setActiveSessionId(newSession.id);

    return newSession;
  }, []);

  /**
   * Add equipment to active session with duplicate detection
   */
  const addEquipment = useCallback(
    (equipment: SessionItem): AddEquipmentResult => {
      if (!activeSessionId) {
        throw new Error('No active session');
      }

      const allSessions = loadSessions();
      const sessionIndex = allSessions.findIndex((s) => s.id === activeSessionId);

      if (sessionIndex === -1) {
        throw new Error('Active session not found');
      }

      const session = allSessions[sessionIndex];

      // Check for duplicates
      if (equipment.serial_number) {
        // Serialized equipment - check for exact duplicate
        const duplicate = session.items.find(
          (item) =>
            item.equipment_id === equipment.equipment_id &&
            item.serial_number === equipment.serial_number
        );

        if (duplicate) {
          return 'duplicate';
        }

        // Add new serialized item
        session.items.push({ ...equipment, quantity: 1, addedAt: new Date().toISOString() });
        session.updatedAt = new Date().toISOString();
        session.dirty = true;

        allSessions[sessionIndex] = session;
        saveSessions(allSessions);
        setSessions([...allSessions]);

        return 'added';
      } else {
        // Non-serialized equipment - increment quantity if exists
        const existingIndex = session.items.findIndex(
          (item) => item.equipment_id === equipment.equipment_id && !item.serial_number
        );

        if (existingIndex !== -1) {
          session.items[existingIndex].quantity += equipment.quantity || 1;
          session.items[existingIndex].addedAt = new Date().toISOString();
          session.updatedAt = new Date().toISOString();
          session.dirty = true;

          allSessions[sessionIndex] = session;
          saveSessions(allSessions);
          setSessions([...allSessions]);

          return 'incremented';
        }

        // Add new non-serialized item
        session.items.push({ ...equipment, quantity: equipment.quantity || 1, addedAt: new Date().toISOString() });
        session.updatedAt = new Date().toISOString();
        session.dirty = true;

        allSessions[sessionIndex] = session;
        saveSessions(allSessions);
        setSessions([...allSessions]);

        return 'added';
      }
    },
    [activeSessionId]
  );

  /**
   * Remove equipment from active session
   */
  const removeEquipment = useCallback(
    (equipmentId: number, serialNumber?: string) => {
      if (!activeSessionId) return;

      const allSessions = loadSessions();
      const sessionIndex = allSessions.findIndex((s) => s.id === activeSessionId);

      if (sessionIndex === -1) return;

      const session = allSessions[sessionIndex];

      // Filter out matching item
      session.items = session.items.filter((item) => {
        if (serialNumber) {
          // Serialized - match both ID and serial
          return !(item.equipment_id === equipmentId && item.serial_number === serialNumber);
        } else {
          // Non-serialized - match ID and no serial
          return !(item.equipment_id === equipmentId && !item.serial_number);
        }
      });

      session.updatedAt = new Date().toISOString();
      session.dirty = true;

      allSessions[sessionIndex] = session;
      saveSessions(allSessions);
      setSessions([...allSessions]);
    },
    [activeSessionId]
  );

  /**
   * Decrement quantity for non-serialized equipment
   */
  const decrementQuantity = useCallback(
    (equipmentId: number) => {
      if (!activeSessionId) return;

      const allSessions = loadSessions();
      const sessionIndex = allSessions.findIndex((s) => s.id === activeSessionId);

      if (sessionIndex === -1) return;

      const session = allSessions[sessionIndex];
      const itemIndex = session.items.findIndex(
        (item) => item.equipment_id === equipmentId && !item.serial_number
      );

      if (itemIndex === -1) return;

      if (session.items[itemIndex].quantity > 1) {
        session.items[itemIndex].quantity -= 1;
      } else {
        // Remove item if quantity reaches 0
        session.items.splice(itemIndex, 1);
      }

      session.updatedAt = new Date().toISOString();
      session.dirty = true;

      allSessions[sessionIndex] = session;
      saveSessions(allSessions);
      setSessions([...allSessions]);
    },
    [activeSessionId]
  );

  /**
   * Update quantity for non-serialized equipment
   */
  const updateQuantity = useCallback(
    (equipmentId: number, quantity: number) => {
      if (!activeSessionId) return;
      if (quantity < 1) return;

      const allSessions = loadSessions();
      const sessionIndex = allSessions.findIndex((s) => s.id === activeSessionId);

      if (sessionIndex === -1) return;

      const session = allSessions[sessionIndex];
      const itemIndex = session.items.findIndex(
        (item) => item.equipment_id === equipmentId && !item.serial_number
      );

      if (itemIndex === -1) return;

      session.items[itemIndex].quantity = quantity;
      session.updatedAt = new Date().toISOString();
      session.dirty = true;

      allSessions[sessionIndex] = session;
      saveSessions(allSessions);
      setSessions([...allSessions]);
    },
    [activeSessionId]
  );

  /**
   * Clear all items from active session
   */
  const clearSession = useCallback(() => {
    if (!activeSessionId) return;

    const allSessions = loadSessions();
    const sessionIndex = allSessions.findIndex((s) => s.id === activeSessionId);

    if (sessionIndex === -1) return;

    allSessions[sessionIndex].items = [];
    allSessions[sessionIndex].updatedAt = new Date().toISOString();
    allSessions[sessionIndex].dirty = true;

    saveSessions(allSessions);
    setSessions([...allSessions]);
  }, [activeSessionId]);

  /**
   * Delete session by ID
   */
  const deleteSession = useCallback(
    (id: string) => {
      const allSessions = loadSessions();
      const updatedSessions = allSessions.filter((s) => s.id !== id);

      saveSessions(updatedSessions);
      setSessions(updatedSessions);

      // If deleted session was active, clear active session
      if (activeSessionId === id) {
        saveActiveSessionId(null);
        setActiveSessionId(null);
      }
    },
    [activeSessionId]
  );

  /**
   * Rename active session
   */
  const renameSession = useCallback(
    (name: string) => {
      if (!activeSessionId) return;

      const allSessions = loadSessions();
      const sessionIndex = allSessions.findIndex((s) => s.id === activeSessionId);

      if (sessionIndex === -1) return;

      allSessions[sessionIndex].name = name;
      allSessions[sessionIndex].updatedAt = new Date().toISOString();
      allSessions[sessionIndex].dirty = true;

      saveSessions(allSessions);
      setSessions([...allSessions]);
    },
    [activeSessionId]
  );

  /**
   * Mark session as dirty (has unsaved changes)
   */
  const markDirty = useCallback(() => {
    if (!activeSessionId) return;

    const allSessions = loadSessions();
    const sessionIndex = allSessions.findIndex((s) => s.id === activeSessionId);

    if (sessionIndex === -1) return;

    allSessions[sessionIndex].dirty = true;
    allSessions[sessionIndex].updatedAt = new Date().toISOString();

    saveSessions(allSessions);
    setSessions([...allSessions]);
  }, [activeSessionId]);

  /**
   * Mark session as clean (saved)
   */
  const markClean = useCallback(() => {
    if (!activeSessionId) return;

    const allSessions = loadSessions();
    const sessionIndex = allSessions.findIndex((s) => s.id === activeSessionId);

    if (sessionIndex === -1) return;

    allSessions[sessionIndex].dirty = false;

    saveSessions(allSessions);
    setSessions([...allSessions]);
  }, [activeSessionId]);

  /**
   * Mark session as synced with server
   */
  const markSynced = useCallback(
    (serverSessionId: number) => {
      if (!activeSessionId) return;

      const allSessions = loadSessions();
      const sessionIndex = allSessions.findIndex((s) => s.id === activeSessionId);

      if (sessionIndex === -1) return;

      allSessions[sessionIndex].dirty = false;
      allSessions[sessionIndex].syncedWithServer = true;
      allSessions[sessionIndex].serverSessionId = serverSessionId;

      saveSessions(allSessions);
      setSessions([...allSessions]);
    },
    [activeSessionId]
  );

  // Sync state on mount and when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setSessions(loadSessions());
      setActiveSessionId(loadActiveSessionId());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    activeSession,
    sessions,
    getSessions,
    getActiveSession,
    setActiveSession,
    createSession,
    addEquipment,
    removeEquipment,
    decrementQuantity,
    updateQuantity,
    clearSession,
    deleteSession,
    renameSession,
    markDirty,
    markClean,
    markSynced,
  };
}
