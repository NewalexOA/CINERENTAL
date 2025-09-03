import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCartIntegration } from '../useCartIntegration'
import type { EquipmentResponse } from '@/types/equipment'

// Mock useScanner composable
vi.mock('../useScanner', () => ({
  useScanner: vi.fn(() => ({
    isActive: { value: false },
    lastScan: { value: null },
    start: vi.fn(),
    stop: vi.fn()
  }))
}))

// Mock equipment service
vi.mock('@/services/api/equipment', () => ({
  equipmentService: {
    getEquipmentByBarcode: vi.fn(),
    searchEquipment: vi.fn(),
    checkAvailability: vi.fn(),
    createBatchBookings: vi.fn(),
    calculateRentalCost: vi.fn(() => ({
      dailyCost: 50,
      totalCost: 200,
      days: 4
    }))
  }
}))

describe('useCartIntegration Composable', () => {
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
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Initialization and Mode Detection', () => {
    it('should initialize cart for embedded mode', async () => {
      // Mock DOM container for embedded mode
      const container = document.createElement('div')
      container.id = 'universalCartContainer'
      document.body.appendChild(container)

      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      expect(integration.cartStore.mode).toBe('equipment_add')
      expect(integration.cartStore.isEmbedded).toBe(true)

      document.body.removeChild(container)
    })

    it('should initialize cart for floating mode', async () => {
      // No container in DOM for floating mode
      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      expect(integration.cartStore.mode).toBe('equipment_add')
      expect(integration.cartStore.isEmbedded).toBe(false)
    })

    it('should enable scanner when requested', () => {
      const integration = useCartIntegration({
        enableScanner: true,
        projectId: 1
      })

      expect(integration.scanner).toBeDefined()
      expect(integration.scanner?.start).toBeDefined()
      expect(integration.scanner?.stop).toBeDefined()
    })

    it('should not enable scanner by default', () => {
      const integration = useCartIntegration({
        projectId: 1
      })

      expect(integration.scanner).toBeNull()
    })
  })

  describe('Equipment Addition', () => {
    it('should add equipment to cart successfully', async () => {
      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      const result = await integration.addEquipmentToCart(mockEquipment, 2)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Professional Camera added to cart')
      expect(integration.cartStore.itemCount).toBe(1)
      expect(integration.cartStore.totalQuantity).toBe(2)
    })

    it('should handle equipment addition errors', async () => {
      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      // Mock cart store to throw error
      vi.spyOn(integration.cartStore, 'addItem').mockRejectedValue(new Error('Capacity exceeded'))

      const result = await integration.addEquipmentToCart(mockEquipment, 1)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Capacity exceeded')
      expect(integration.lastError.value).toBe('Capacity exceeded')
    })

    it('should calculate rental costs properly', async () => {
      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      const customDates = {
        startDate: '2024-02-01',
        endDate: '2024-02-05'
      }

      const result = await integration.addEquipmentToCart(mockEquipment, 1, customDates)

      expect(result.success).toBe(true)

      // Verify the cart item has correct cost calculation
      const cartItems = integration.cartStore.cartItems
      expect(cartItems.length).toBe(1)
      expect(cartItems[0].dailyCost).toBe(50)
    })
  })

  describe('Barcode Scanning Integration', () => {
    it('should handle barcode scanning successfully', async () => {
      const { equipmentService } = await import('@/services/api/equipment')
      vi.mocked(equipmentService.getEquipmentByBarcode).mockResolvedValue(mockEquipment)

      const integration = useCartIntegration({
        enableScanner: true,
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      await integration.handleBarcodeScanned('123456789')

      expect(equipmentService.getEquipmentByBarcode).toHaveBeenCalledWith('123456789')
      expect(integration.cartStore.itemCount).toBe(1)
      expect(integration.cartStore.cartItems[0].equipment.name).toBe('Professional Camera')
    })

    it('should handle barcode scanning errors', async () => {
      const { equipmentService } = await import('@/services/api/equipment')
      vi.mocked(equipmentService.getEquipmentByBarcode).mockResolvedValue(null)

      const integration = useCartIntegration({
        enableScanner: true,
        projectId: 1
      })

      await integration.initializeCart(1)

      await integration.handleBarcodeScanned('invalid-barcode')

      expect(integration.lastError.value).toBe('Equipment with barcode invalid-barcode not found')
      expect(integration.cartStore.itemCount).toBe(0)
    })

    it('should check equipment availability before adding from barcode', async () => {
      const unavailableEquipment = { ...mockEquipment, status: 'RENTED' }
      const { equipmentService } = await import('@/services/api/equipment')
      vi.mocked(equipmentService.getEquipmentByBarcode).mockResolvedValue(unavailableEquipment)

      const integration = useCartIntegration({
        enableScanner: true,
        projectId: 1
      })

      await integration.initializeCart(1)

      await integration.handleBarcodeScanned('123456789')

      expect(integration.lastError.value).toBe('Equipment Professional Camera is not available (Status: RENTED)')
      expect(integration.cartStore.itemCount).toBe(0)
    })
  })

  describe('Equipment Search and Batch Addition', () => {
    it('should search and add multiple equipment items', async () => {
      const { equipmentService } = await import('@/services/api/equipment')
      vi.mocked(equipmentService.searchEquipment).mockResolvedValue({
        items: [mockEquipment, { ...mockEquipment, id: 2, name: 'Secondary Camera' }],
        total: 2,
        page: 1,
        size: 20
      })

      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      const result = await integration.searchAndAddEquipment('camera')

      expect(result.results.length).toBe(2)
      expect(result.added).toBe(2)
      expect(result.errors.length).toBe(0)
      expect(integration.cartStore.itemCount).toBe(2)
    })

    it('should handle search errors gracefully', async () => {
      const { equipmentService } = await import('@/services/api/equipment')
      vi.mocked(equipmentService.searchEquipment).mockRejectedValue(new Error('Search failed'))

      const integration = useCartIntegration({
        projectId: 1
      })

      await integration.initializeCart(1)

      const result = await integration.searchAndAddEquipment('camera')

      expect(result.results.length).toBe(0)
      expect(result.added).toBe(0)
      expect(result.errors).toContain('Search failed')
    })

    it('should handle partial failures in batch addition', async () => {
      const equipment1 = mockEquipment
      const equipment2 = { ...mockEquipment, id: 2, name: 'Unavailable Camera' }

      const { equipmentService } = await import('@/services/api/equipment')
      vi.mocked(equipmentService.searchEquipment).mockResolvedValue({
        items: [equipment1, equipment2],
        total: 2,
        page: 1,
        size: 20
      })

      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      // Mock addItem to fail for second equipment
      let callCount = 0
      vi.spyOn(integration, 'addEquipmentToCart').mockImplementation(async (equipment) => {
        callCount++
        if (callCount === 1) {
          return { success: true, message: 'Added successfully' }
        } else {
          return { success: false, message: 'Not available' }
        }
      })

      const result = await integration.searchAndAddEquipment('camera')

      expect(result.results.length).toBe(2)
      expect(result.added).toBe(1)
      expect(result.errors.length).toBe(1)
      expect(result.errors[0]).toContain('Unavailable Camera: Not available')
    })
  })

  describe('Cart Action Execution', () => {
    it('should execute cart actions successfully', async () => {
      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      // Add item to cart first
      await integration.addEquipmentToCart(mockEquipment, 1)
      expect(integration.cartStore.itemCount).toBe(1)

      // Mock successful booking creation
      vi.spyOn(integration.cartStore, 'executeActions').mockResolvedValue([{
        id: 1,
        equipment_id: 1,
        quantity: 1,
        start_date: '2024-02-01',
        end_date: '2024-02-05',
        project_id: 1,
        total_cost: 200,
        status: 'confirmed'
      }])

      const result = await integration.executeCartActions()

      expect(result.success).toBe(true)
      expect(result.bookingsCreated).toBe(1)
      expect(result.message).toBe('Successfully created 1 bookings')
    })

    it('should handle cart action execution errors', async () => {
      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      // Mock execution failure
      vi.spyOn(integration.cartStore, 'executeActions').mockRejectedValue(new Error('Booking creation failed'))

      const result = await integration.executeCartActions()

      expect(result.success).toBe(false)
      expect(result.bookingsCreated).toBe(0)
      expect(result.message).toBe('Booking creation failed')
      expect(integration.lastError.value).toBe('Booking creation failed')
    })
  })

  describe('Reactive State Management', () => {
    it('should provide reactive cart state', async () => {
      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      // Initial state
      expect(integration.cartState.value.itemCount).toBe(0)
      expect(integration.cartState.value.hasItems).toBe(false)
      expect(integration.cartState.value.totalCost).toBe(0)

      // Add item and verify reactive updates
      await integration.addEquipmentToCart(mockEquipment, 2)

      expect(integration.cartState.value.itemCount).toBe(1)
      expect(integration.cartState.value.totalQuantity).toBe(2)
      expect(integration.cartState.value.hasItems).toBe(true)
      expect(integration.cartState.value.totalCost).toBeGreaterThan(0)
    })

    it('should include loading states in reactive state', async () => {
      const integration = useCartIntegration({
        projectId: 1
      })

      expect(integration.cartState.value.isLoading).toBe(false)

      // Set processing state
      integration.isProcessing.value = true

      expect(integration.cartState.value.isLoading).toBe(true)
    })

    it('should aggregate errors from multiple sources', async () => {
      const integration = useCartIntegration({
        projectId: 1
      })

      await integration.initializeCart(1)

      // Add errors from different sources
      integration.cartStore.errors.push('Store error')
      integration.lastError.value = 'Integration error'

      expect(integration.cartState.value.errors).toContain('Store error')
      expect(integration.cartState.value.errors).toContain('Integration error')
      expect(integration.cartState.value.errors.length).toBe(2)
    })
  })

  describe('Cart Control Methods', () => {
    it('should provide cart visibility controls', async () => {
      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      expect(integration.cartStore.isVisible).toBe(false)

      integration.showCart()
      expect(integration.cartStore.isVisible).toBe(true)

      integration.hideCart()
      expect(integration.cartStore.isVisible).toBe(false)
    })

    it('should provide error clearing functionality', async () => {
      const integration = useCartIntegration({
        projectId: 1
      })

      await integration.initializeCart(1)

      // Add errors
      integration.cartStore.errors.push('Store error')
      integration.lastError.value = 'Integration error'

      expect(integration.cartState.value.errors.length).toBe(2)

      integration.clearErrors()

      expect(integration.cartStore.errors.length).toBe(0)
      expect(integration.lastError.value).toBeNull()
      expect(integration.cartState.value.errors.length).toBe(0)
    })

    it('should provide cart clearing functionality', async () => {
      const integration = useCartIntegration({
        projectId: 1
      })

      await integration.initializeCart(1)
      await integration.addEquipmentToCart(mockEquipment, 1)

      expect(integration.cartStore.itemCount).toBe(1)

      integration.clearCart()

      expect(integration.cartStore.itemCount).toBe(0)
    })
  })

  describe('Scanner Control Methods', () => {
    it('should provide scanner controls when scanner is enabled', () => {
      const integration = useCartIntegration({
        enableScanner: true,
        projectId: 1
      })

      expect(integration.scanner).toBeDefined()
      expect(integration.scanner?.start).toBeDefined()
      expect(integration.scanner?.stop).toBeDefined()
      expect(integration.scanner?.isActive).toBeDefined()
    })

    it('should return null scanner when not enabled', () => {
      const integration = useCartIntegration({
        projectId: 1
      })

      expect(integration.scanner).toBeNull()
    })
  })

  describe('Integration with Different Cart Modes', () => {
    it('should handle equipment_add mode correctly', async () => {
      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_add'
      })

      await integration.initializeCart(1)

      expect(integration.cartStore.mode).toBe('equipment_add')
    })

    it('should handle equipment_remove mode correctly', async () => {
      const integration = useCartIntegration({
        projectId: 1,
        mode: 'equipment_remove'
      })

      await integration.initializeCart(1)

      expect(integration.cartStore.mode).toBe('equipment_remove')
    })

    it('should handle booking_edit mode correctly', async () => {
      const integration = useCartIntegration({
        projectId: 1,
        mode: 'booking_edit'
      })

      await integration.initializeCart(1)

      expect(integration.cartStore.mode).toBe('booking_edit')
    })
  })
})
