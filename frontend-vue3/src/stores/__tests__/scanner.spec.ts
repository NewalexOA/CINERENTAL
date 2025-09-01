import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useScannerStore } from '../scanner'
import type { EquipmentResponse, EquipmentStatus } from '@/types/equipment'

const createMockEquipment = (id: number, name: string, serial: string | null = null): EquipmentResponse => ({
  id,
  name,
  serial_number: serial,
  barcode: `BARCODE-${id}`,
  category_id: 1,
  category_name: 'Scanners',
  status: 'AVAILABLE' as EquipmentStatus,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  active_projects: [],
  daily_cost: 50,
});

describe('Scanner Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('creates a new session and sets it as active', () => {
    const scannerStore = useScannerStore()
    const session = scannerStore.createSession('Test Session')

    expect(scannerStore.sessions).toHaveLength(1)
    expect(session.name).toBe('Test Session')
    expect(scannerStore.activeSessionId).toBe(session.id)
  })

  it('adds equipment to the active session', () => {
    const scannerStore = useScannerStore()
    scannerStore.createSession('Test Session')
    const equipment = createMockEquipment(1, 'Scanner 1')

    scannerStore.addEquipmentToSession(equipment)

    const activeSession = scannerStore.activeSession
    expect(activeSession?.items).toHaveLength(1)
    expect(activeSession?.items[0].equipment.name).toBe('Scanner 1')
  })

  it('increments quantity for non-serialized equipment', () => {
    const scannerStore = useScannerStore()
    scannerStore.createSession('Test Session')
    const equipment = createMockEquipment(1, 'Generic Cable')

    scannerStore.addEquipmentToSession(equipment)
    scannerStore.addEquipmentToSession(equipment) // Add same item again

    const activeSession = scannerStore.activeSession
    expect(activeSession?.items).toHaveLength(1)
    expect(activeSession?.items[0].quantity).toBe(2)
  })

  it('does not add duplicate serialized equipment', () => {
    const scannerStore = useScannerStore()
    scannerStore.createSession('Test Session')
    const equipment = createMockEquipment(1, 'Specific Scanner', 'SERIAL123')

    scannerStore.addEquipmentToSession(equipment)
    scannerStore.addEquipmentToSession(equipment) // Add same item again

    const activeSession = scannerStore.activeSession
    expect(activeSession?.items).toHaveLength(1)
    expect(activeSession?.items[0].quantity).toBe(1)
  })

  it('loads sessions from localStorage on initialization', () => {
    const mockSession = { id: 's1', name: 'Stored Session', createdAt: '', items: [] };
    localStorage.setItem('cinerental_scan_sessions', JSON.stringify([mockSession]));

    const scannerStore = useScannerStore()
    scannerStore.loadSessions(); // Manually call for test clarity

    expect(scannerStore.sessions).toHaveLength(1)
    expect(scannerStore.sessions[0].name).toBe('Stored Session')
  })
});
