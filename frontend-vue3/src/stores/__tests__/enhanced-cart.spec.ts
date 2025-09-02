import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from '../cart'
import type { EquipmentResponse } from '@/types/equipment'

// Mock the http client
vi.mock('@/services/api/http-client', () => ({
  httpClient: {
    post: vi.fn()
  }
}))

// Mock the equipment service
vi.mock('@/services/api/equipment', () => ({
  equipmentService: {
    checkAvailability: vi.fn(),
    createBatchBookings: vi.fn(),
    calculateRentalCost: vi.fn()
  }
}))

describe('Enhanced Universal Cart Store', () => {
  let store: ReturnType<typeof useCartStore>

  const mockEquipment: EquipmentResponse = {
    id: 1,
    name: 'Professional Camera',
    description: 'High-end DSLR camera',
    replacement_cost: 5000,
    barcode: '123456789',
    serial_number: 'CAM001',
    category_id: 1,
    status: 'AVAILABLE',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    notes: '',
    category_name: 'Cameras',
    category: { id: 1, name: 'Cameras' },
    active_projects: [],
    daily_cost: 50,
    quantity: 1,
    purchase_date: '2024-01-01'
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCartStore()

    // Clear localStorage
    localStorage.clear()
  })

  describe('Enhanced Item Management', () => {
    it('should add item with sophisticated validation', async () => {
      const cartItem = {
        equipment: mockEquipment,
        quantity: 2,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50,
        notes: 'Test item'
      }

      const result = await store.addItem(cartItem)

      expect(result.success).toBe(true)
      expect(store.itemCount).toBe(1)
      expect(store.totalQuantity).toBe(2)

      const addedItem = store.cartItems[0]
      expect(addedItem.equipment.name).toBe('Professional Camera')
      expect(addedItem.quantity).toBe(2)
    })

    it('should handle capacity limits', async () => {
      // Set a low capacity limit for testing
      store.config.maxItems = 1

      const cartItem1 = {
        equipment: mockEquipment,
        quantity: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      const cartItem2 = {
        equipment: { ...mockEquipment, id: 2, name: 'Second Camera' },
        quantity: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      // First item should succeed
      const result1 = await store.addItem(cartItem1)
      expect(result1.success).toBe(true)

      // Second item should fail due to capacity
      const result2 = await store.addItem(cartItem2)
      expect(result2.success).toBe(false)
      expect(result2.message).toContain('maximum capacity')
    })

    it('should aggregate quantities for identical items', async () => {
      const cartItem = {
        equipment: mockEquipment,
        quantity: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      // Add same item twice
      await store.addItem(cartItem)
      await store.addItem(cartItem)

      expect(store.itemCount).toBe(1) // Still one unique item
      expect(store.totalQuantity).toBe(2) // But quantity is aggregated
      expect(store.cartItems[0].quantity).toBe(2)
    })
  })

  describe('Advanced Date Management', () => {
    beforeEach(async () => {
      const cartItem = {
        equipment: mockEquipment,
        quantity: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }
      await store.addItem(cartItem)
    })

    it('should update custom dates', async () => {
      const itemKey = Array.from(store.items.keys())[0]

      const result = await store.setCustomDates(itemKey, {
        startDate: '2024-02-10',
        endDate: '2024-02-15'
      })

      expect(result.success).toBe(true)

      const item = store.getItemByKey(itemKey)
      expect(item?.customDates?.startDate).toBe('2024-02-10')
      expect(item?.customDates?.endDate).toBe('2024-02-15')
    })

    it('should validate date ranges', async () => {
      const itemKey = Array.from(store.items.keys())[0]

      // Invalid date range (start after end)
      const result = await store.setCustomDates(itemKey, {
        startDate: '2024-02-15',
        endDate: '2024-02-10'
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain('Start date must be before end date')
    })
  })

  describe('Progress Tracking and Action Execution', () => {
    beforeEach(async () => {
      // Set up cart with items
      store.currentProjectId = 1

      const cartItem = {
        equipment: mockEquipment,
        quantity: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }
      await store.addItem(cartItem)
    })

    it('should track progress during action execution', async () => {
      // Mock successful API responses
      const { equipmentService } = await import('@/services/api/equipment')
      vi.mocked(equipmentService.checkAvailability).mockResolvedValue({
        available: true,
        available_quantity: 10
      })

      vi.mocked(equipmentService.createBatchBookings).mockResolvedValue({
        success: true,
        created_count: 1,
        failed_count: 0,
        bookings: [{
          id: 1,
          equipment_id: 1,
          quantity: 1,
          start_date: '2024-02-01',
          end_date: '2024-02-05',
          project_id: 1,
          total_cost: 200,
          status: 'confirmed'
        }]
      })

      // Execute actions and monitor progress
      const progressUpdates: number[] = []
      const statusUpdates: string[] = []

      // Monitor progress
      const unsubscribe = store.$subscribe((mutation, state) => {
        progressUpdates.push(state.actionProgress)
        if (state.actionStatus) {
          statusUpdates.push(state.actionStatus)
        }
      })

      const bookings = await store.executeActions()

      expect(bookings).toHaveLength(1)
      expect(progressUpdates).toContain(100) // Should reach 100%
      expect(statusUpdates).toContain('Starting...')
      expect(statusUpdates).toContain('Completed successfully')
      expect(store.itemCount).toBe(0) // Cart should be cleared

      unsubscribe()
    })

    it('should handle partial failures in batch operations', async () => {
      const { equipmentService } = await import('@/services/api/equipment')

      // Mock partial failure
      vi.mocked(equipmentService.createBatchBookings).mockResolvedValue({
        success: false,
        created_count: 0,
        failed_count: 1,
        bookings: [],
        errors: [{
          equipment_id: 1,
          error: 'Equipment not available'
        }]
      })

      try {
        await store.executeActions()
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).toContain('Equipment ID 1: Equipment not available')
        expect(store.itemCount).toBe(1) // Cart should not be cleared on failure
      }
    })
  })

  describe('Event System', () => {
    it('should emit events for cart operations', async () => {
      const addEventHandler = vi.fn()
      const updateEventHandler = vi.fn()
      const removeEventHandler = vi.fn()

      store.addEventListener('itemAdded', addEventHandler)
      store.addEventListener('itemUpdated', updateEventHandler)
      store.addEventListener('itemRemoved', removeEventHandler)

      const cartItem = {
        equipment: mockEquipment,
        quantity: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      // Add item
      await store.addItem(cartItem)
      expect(addEventHandler).toHaveBeenCalled()

      // Update quantity
      const itemKey = Array.from(store.items.keys())[0]
      await store.updateQuantity(itemKey, 2)
      expect(updateEventHandler).toHaveBeenCalled()

      // Remove item
      store.removeItem(itemKey)
      expect(removeEventHandler).toHaveBeenCalled()
    })
  })

  describe('Storage Persistence', () => {
    it('should save and load from localStorage with compression', async () => {
      store.currentProjectId = 1

      const cartItem = {
        equipment: mockEquipment,
        quantity: 2,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      await store.addItem(cartItem)
      expect(store.itemCount).toBe(1)

      // Create new store instance to test loading
      const newStore = useCartStore()
      await newStore.loadCartForProject(1)

      expect(newStore.itemCount).toBe(1)
      expect(newStore.cartItems[0].equipment.name).toBe('Professional Camera')
      expect(newStore.cartItems[0].quantity).toBe(2)
    })

    it('should handle storage corruption gracefully', async () => {
      // Corrupt the localStorage data
      localStorage.setItem('cinerental_cart_v2_1', 'invalid-json-data')

      const newStore = useCartStore()
      await newStore.loadCartForProject(1)

      // Should start with empty cart and not crash
      expect(newStore.itemCount).toBe(0)
      expect(newStore.errors.length).toBe(1)
      expect(newStore.errors[0]).toContain('Failed to load saved cart data')
    })
  })

  describe('Dual-Mode Detection', () => {
    it('should detect embedded mode correctly', () => {
      // Mock DOM element for embedded mode
      const mockContainer = document.createElement('div')
      mockContainer.id = 'universalCartContainer'
      document.body.appendChild(mockContainer)

      store.setEmbeddedMode(true)
      expect(store.isEmbedded).toBe(true)
      expect(store.isVisible).toBe(true) // Should be always visible in embedded mode

      document.body.removeChild(mockContainer)
    })

    it('should handle floating mode', () => {
      store.setEmbeddedMode(false)
      expect(store.isEmbedded).toBe(false)
      expect(store.isVisible).toBe(false) // Should start hidden in floating mode
    })
  })
})
