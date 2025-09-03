import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { EquipmentResponse } from '@/types/equipment'
import { StorePersistence, createDebouncedSave } from '@/plugins/store-persistence'

export interface ScannedItem {
  equipment: EquipmentResponse;
  scannedAt: string;
  quantity: number;
}

export interface ScanSession {
  id: string;
  name: string;
  createdAt: string;
  items: ScannedItem[];
}

export const useScannerStore = defineStore('scanner', () => {
  // --- PERSISTENCE SETUP ---
  const persistence = new StorePersistence({
    key: 'scanner',
    version: 2, // Incremented version to upgrade from old storage format
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days for scan sessions
    compress: true, // Compress scan session data
    whitelist: ['sessions', 'activeSessionId', 'lastActivity'],
    beforeRestore: (data: any) => {
      // Validate and migrate restored data
      return {
        sessions: Array.isArray(data.sessions) ? data.sessions.map(session => ({
          id: session.id || `session_${Date.now()}`,
          name: session.name || 'Unnamed Session',
          createdAt: session.createdAt || new Date().toISOString(),
          items: Array.isArray(session.items) ? session.items : []
        })) : [],
        activeSessionId: data.activeSessionId || null,
        lastActivity: data.lastActivity || null
      }
    },
    afterRestore: (data: any) => {
      // Clean up old sessions older than 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
      const validSessions = data.sessions.filter(session =>
        new Date(session.createdAt).getTime() > thirtyDaysAgo
      )
      if (validSessions.length !== data.sessions.length) {
        console.log(`🗑️ Scanner store: Cleaned ${data.sessions.length - validSessions.length} old sessions`)
        data.sessions = validSessions
      }
    },
    onError: (error: Error, operation: string) => {
      console.error(`Scanner store persistence ${operation} error:`, error)
    }
  })

  // --- STATE ---
  const sessions = ref<ScanSession[]>([]);
  const activeSessionId = ref<string | null>(null);
  const lastActivity = ref<number | null>(null)

  // --- PERSISTENCE HELPERS ---
  const debouncedSave = createDebouncedSave(persistence, 300) // Shorter delay for scan operations

  function saveToStorage() {
    const stateToSave = {
      sessions: sessions.value,
      activeSessionId: activeSessionId.value,
      lastActivity: lastActivity.value
    }
    debouncedSave(stateToSave)
  }

  function loadFromStorage() {
    const restored = persistence.loadState()
    if (restored) {
      sessions.value = restored.sessions || []
      activeSessionId.value = restored.activeSessionId
      lastActivity.value = restored.lastActivity
      console.log(`📷 Scanner store: Restored ${sessions.value.length} scan sessions`)

      // Migrate from old storage format if needed
      migrateFromOldStorage()
    } else {
      // Try to migrate from old storage format
      migrateFromOldStorage()
    }
  }

  function migrateFromOldStorage() {
    try {
      const oldData = localStorage.getItem('cinerental_scan_sessions')
      if (oldData && sessions.value.length === 0) {
        const oldSessions = JSON.parse(oldData)
        if (Array.isArray(oldSessions)) {
          sessions.value = oldSessions
          saveToStorage()
          localStorage.removeItem('cinerental_scan_sessions')
          console.log('🔄 Scanner store: Migrated from old storage format')
        }
      }
    } catch (error) {
      console.warn('Failed to migrate scanner data from old storage:', error)
    }
  }

  function updateActivity() {
    lastActivity.value = Date.now()
    saveToStorage()
  }

  // --- GETTERS ---
  const activeSession = computed(() => {
    return sessions.value.find(s => s.id === activeSessionId.value) || null;
  });

  const sessionCount = computed(() => sessions.value.length)

  const totalScannedItems = computed(() => {
    return sessions.value.reduce((total, session) => {
      return total + session.items.reduce((sessionTotal, item) => sessionTotal + item.quantity, 0)
    }, 0)
  })

  const cacheInfo = computed(() => {
    const metadata = persistence.getMetadata()
    return {
      hasCache: !!metadata,
      lastActivity: lastActivity.value ? new Date(lastActivity.value).toLocaleString() : null,
      sessionCount: sessionCount.value,
      totalItems: totalScannedItems.value,
      ...metadata
    }
  })

  // --- ACTIONS ---

  function createSession(name: string): ScanSession {
    const newSession: ScanSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      createdAt: new Date().toISOString(),
      items: [],
    };
    sessions.value.unshift(newSession);
    activeSessionId.value = newSession.id;
    updateActivity()
    console.log(`🆕 Scanner store: Created new session "${name}"`);
    return newSession;
  }

  function addEquipmentToSession(equipment: EquipmentResponse) {
    if (!activeSession.value) {
      // Create a default session if none is active
      createSession(`Scan Session ${new Date().toLocaleDateString()}`);
    }

    const session = activeSession.value!;
    const existingItem = session.items.find(i => i.equipment.id === equipment.id && !i.equipment.serial_number);

    if (equipment.serial_number) {
      // Don't add if serial number already exists in session
      if (session.items.some(i => i.equipment.serial_number === equipment.serial_number)) {
        console.warn(`Serial number ${equipment.serial_number} already in session.`);
        return; // Or handle as a duplicate scan
      }
    }

    if (existingItem) {
      existingItem.quantity++;
    } else {
      session.items.unshift({
        equipment,
        scannedAt: new Date().toISOString(),
        quantity: 1,
      });
    }
    updateActivity()
    console.log(`📷 Scanner store: Added ${equipment.name} to session "${session.name}"`);
  }

  function removeEquipmentFromSession(equipmentId: number) {
    if (!activeSession.value) return

    const session = activeSession.value
    const index = session.items.findIndex(item => item.equipment.id === equipmentId)

    if (index !== -1) {
      const removedItem = session.items.splice(index, 1)[0]
      updateActivity()
      console.log(`🗑️ Scanner store: Removed ${removedItem.equipment.name} from session`);
    }
  }

  function setActiveSession(sessionId: string | null) {
    activeSessionId.value = sessionId
    updateActivity()
  }

  function deleteSession(sessionId: string) {
    const index = sessions.value.findIndex(s => s.id === sessionId)
    if (index !== -1) {
      const deletedSession = sessions.value.splice(index, 1)[0]

      // If the deleted session was active, clear active session
      if (activeSessionId.value === sessionId) {
        activeSessionId.value = null
      }

      updateActivity()
      console.log(`🗑️ Scanner store: Deleted session "${deletedSession.name}"`);
    }
  }

  function clearAllSessions() {
    sessions.value = []
    activeSessionId.value = null
    updateActivity()
    console.log('🗑️ Scanner store: Cleared all scan sessions')
  }

  function clearCache() {
    persistence.clearState()
    sessions.value = []
    activeSessionId.value = null
    lastActivity.value = null
    console.log('🗑️ Scanner store: Cache cleared')
  }

  // --- INITIALIZATION ---
  // Load persisted state on store creation
  loadFromStorage()

  // Watch for changes to auto-save
  watch(
    [sessions, activeSessionId],
    () => {
      saveToStorage()
    },
    { deep: true }
  )

  return {
    // State
    sessions,
    activeSessionId,
    lastActivity,

    // Getters
    activeSession,
    sessionCount,
    totalScannedItems,
    cacheInfo,

    // Actions
    createSession,
    addEquipmentToSession,
    removeEquipmentFromSession,
    setActiveSession,
    deleteSession,
    clearAllSessions,
    clearCache
  };
});
