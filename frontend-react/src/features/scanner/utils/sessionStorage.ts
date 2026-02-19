/**
 * LocalStorage helper utilities for scan sessions
 */

import {
  ScanSession,
  STORAGE_KEYS,
  SCANNER_CONSTANTS,
} from '../types/scanner.types';

/**
 * Get all sessions from localStorage
 */
export function getSessions(): ScanSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!stored) {
      return [];
    }

    const sessions = JSON.parse(stored) as ScanSession[];

    // Filter out expired sessions
    return sessions.filter((session) => !isSessionExpired(session));
  } catch (error) {
    console.error('Failed to load sessions from localStorage:', error);
    return [];
  }
}

/**
 * Save sessions to localStorage
 */
export function saveSessions(sessions: ScanSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save sessions to localStorage:', error);
    throw new Error('Failed to save sessions');
  }
}

/**
 * Get a specific session by ID
 */
export function getSessionById(id: string): ScanSession | null {
  const sessions = getSessions();
  return sessions.find((s) => s.id === id) || null;
}

/**
 * Update a session in localStorage
 */
export function updateSession(session: ScanSession): void {
  const sessions = getSessions();
  const index = sessions.findIndex((s) => s.id === session.id);

  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }

  saveSessions(sessions);
}

/**
 * Delete a session from localStorage
 */
export function deleteSession(id: string): void {
  const sessions = getSessions();
  const filtered = sessions.filter((s) => s.id !== id);
  saveSessions(filtered);

  // Clear active session if it was deleted
  const activeId = getActiveSessionId();
  if (activeId === id) {
    setActiveSessionId(null);
  }
}

/**
 * Get active session ID from localStorage
 */
export function getActiveSessionId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
  } catch (error) {
    console.error('Failed to get active session ID:', error);
    return null;
  }
}

/**
 * Set active session ID in localStorage
 */
export function setActiveSessionId(id: string | null): void {
  try {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, id);
    }
  } catch (error) {
    console.error('Failed to set active session ID:', error);
  }
}

/**
 * Generate local session ID with timestamp
 */
export function generateSessionId(): string {
  return `local_${Date.now()}`;
}

/**
 * Check if session is expired (7+ days old)
 */
export function isSessionExpired(session: ScanSession): boolean {
  try {
    const updatedAt = new Date(session.updatedAt);
    const now = new Date();
    const daysDiff =
      (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    return daysDiff >= SCANNER_CONSTANTS.SESSION_EXPIRY_DAYS;
  } catch (error) {
    // If date parsing fails, consider it expired
    console.error('Failed to parse session date:', error);
    return true;
  }
}

/**
 * Clear all expired sessions from localStorage
 */
export function clearExpiredSessions(): void {
  const sessions = getSessions();
  const validSessions = sessions.filter((s) => !isSessionExpired(s));

  if (validSessions.length !== sessions.length) {
    saveSessions(validSessions);
  }
}

/**
 * Get total number of items across all sessions
 */
export function getTotalSessionItems(): number {
  const sessions = getSessions();
  return sessions.reduce((total, session) => {
    return total + session.items.reduce((sum, item) => sum + item.quantity, 0);
  }, 0);
}

/**
 * Check if localStorage is available and has space
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.error('localStorage not available:', error);
    return false;
  }
}
