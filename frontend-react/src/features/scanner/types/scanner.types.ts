/**
 * Scanner Page TypeScript Types
 * Types for scan sessions, equipment items, and scanner state
 */

// ============================================================================
// Session Item Types
// ============================================================================

/**
 * Equipment item within a scan session
 */
export interface SessionItem {
  equipment_id: number;
  name: string;
  barcode: string;
  serial_number: string | null;
  category_id: number | null;
  category_name: string;
  quantity: number; // 1 for serialized, >=1 for non-serialized
  replacement_cost?: number;
  status?: string;
  addedAt?: string; // ISO timestamp of when item was added/last scanned
}

/**
 * Result of adding equipment to a session
 */
export type AddEquipmentResult =
  | 'added'           // New item added
  | 'incremented'     // Quantity incremented (non-serialized)
  | 'duplicate';      // Duplicate blocked (serialized)

// ============================================================================
// Scan Session Types
// ============================================================================

/**
 * Sync status indicator for a session
 */
export type SyncStatus =
  | 'synced'        // All changes synced with server
  | 'dirty'         // Has unsynced local changes
  | 'error'         // Sync failed
  | 'local_only';   // Never synced to server

/**
 * Local scan session stored in localStorage
 */
export interface ScanSession {
  id: string;                       // "local_{timestamp}"
  name: string;
  items: SessionItem[];
  createdAt: string;                // ISO timestamp
  updatedAt: string;                // ISO timestamp
  syncedWithServer: boolean;
  serverSessionId: number | null;   // Server-side ID if synced
  dirty: boolean;                   // Has unsynced changes
}

/**
 * Server scan session response
 */
export interface ServerScanSession {
  id: number;
  name: string;
  items: SessionItem[];
  user_id: number | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/**
 * Payload for creating/updating server session.
 * Only IDs + quantity — server enriches from current DB state on read.
 */
export interface ScanSessionPayload {
  name: string;
  items: Array<{
    equipment_id: number;
    quantity: number;
  }>;
}

// ============================================================================
// Scanner State Types
// ============================================================================

/**
 * Scanner operational status
 */
export type ScannerStatus =
  | 'active'    // Listening for scans
  | 'inactive'  // Not listening
  | 'error';    // Scanner error

/**
 * Scan result feedback type
 */
export type ScanFeedbackType =
  | 'success'           // Equipment found and added
  | 'duplicate'         // Duplicate serialized item
  | 'quantity_updated'  // Non-serialized quantity incremented
  | 'not_found'         // Barcode not in system
  | 'error';            // API or system error

/**
 * Scan history entry
 */
export interface ScanHistoryEntry {
  id: string;
  barcode: string;
  equipment: SessionItem | null;
  timestamp: string;
  result: ScanFeedbackType;
  message?: string;
}

// ============================================================================
// Equipment Types (Extended for Scanner)
// ============================================================================

/**
 * Equipment timeline entry (status history)
 */
export interface EquipmentTimelineEntry {
  id: number;
  equipment_id: number;
  status: string;
  previous_status: string | null;
  changed_at: string;
  changed_by: string | null;
  notes: string | null;
}

/**
 * Equipment booking for history display
 */
export interface EquipmentBooking {
  id: number;
  project_id: number;
  project_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

// ============================================================================
// Panel State Types
// ============================================================================

/**
 * Session management panel mode
 */
export type SessionPanelMode =
  | 'list'      // View all sessions
  | 'create'    // Create new session
  | 'rename'    // Rename current session
  | 'load';     // Load existing session

/**
 * Active panel state
 */
export interface PanelState {
  sessionPanel: boolean;
  historyPanel: boolean;
  statusSheet: boolean;
  selectedEquipmentId: number | null;
}

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
}

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  SESSIONS: 'equipment_scan_sessions',
  ACTIVE_SESSION: 'equipment_scan_sessions_active',
  SCAN_HISTORY: 'equipment_scan_history',
  SOUND_ENABLED: 'scanner_sound_enabled',
} as const;

// ============================================================================
// Constants
// ============================================================================

export const SCANNER_CONSTANTS = {
  /** Milliseconds between keystrokes to detect HID scanner */
  SCANNER_THRESHOLD_MS: 20,
  /** Milliseconds before buffer reset on manual typing */
  BUFFER_RESET_MS: 100,
  /** Minimum barcode length to process */
  MIN_BARCODE_LENGTH: 3,
  /** Debounce delay before syncing session changes to server (ms) */
  SYNC_DEBOUNCE_MS: 1500,
  /** Session expiry in days */
  SESSION_EXPIRY_DAYS: 7,
  /** Maximum scan history entries to keep */
  MAX_HISTORY_ENTRIES: 50,
  /** Debounce delay for search */
  SEARCH_DEBOUNCE_MS: 300,
} as const;

/** Barcode validation regex - alphanumeric, dots, hyphens */
export const BARCODE_REGEX = /^[A-Za-z0-9.-]+$/;
