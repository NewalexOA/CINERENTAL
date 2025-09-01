import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EquipmentResponse } from '@/types/equipment'

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

const SESSIONS_STORAGE_KEY = 'cinerental_scan_sessions';

export const useScannerStore = defineStore('scanner', () => {
  // --- STATE ---
  const sessions = ref<ScanSession[]>([]);
  const activeSessionId = ref<string | null>(null);

  // --- GETTERS ---
  const activeSession = computed(() => {
    return sessions.value.find(s => s.id === activeSessionId.value) || null;
  });

  // --- ACTIONS ---
  function _saveSessions() {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.value));
    } catch (e) {
      console.error("Failed to save scanner sessions to localStorage:", e);
    }
  }

  function loadSessions() {
    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (stored) {
        sessions.value = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load scanner sessions from localStorage:", e);
    }
  }

  function createSession(name: string): ScanSession {
    const newSession: ScanSession = {
      id: `session_${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      items: [],
    };
    sessions.value.unshift(newSession);
    activeSessionId.value = newSession.id;
    _saveSessions();
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
    _saveSessions();
  }

  // Initialize store
  loadSessions();

  return {
    sessions,
    activeSessionId,
    activeSession,
    createSession,
    addEquipmentToSession,
    loadSessions,
  };
});
