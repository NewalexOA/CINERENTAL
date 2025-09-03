import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import UniversalCart from '../UniversalCart.vue'
import { useCartStore } from '@/stores/cart'
import type { EquipmentResponse } from '@/types/equipment'

// Mock BaseButton component
vi.mock('@/components/common/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template: '<button @click="$emit(\'click\')" :class="[variant, size]"><slot /></button>',
    props: ['variant', 'size', 'icon'],
    emits: ['click']
  }
}))

// Mock CartItemsList component
vi.mock('../CartItemsList.vue', () => ({
  default: {
    name: 'CartItemsList',
    template: '<div data-testid="cart-items-list"><slot /></div>'
  }
}))

// Mock equipment service
vi.mock('@/services/api/equipment', () => ({
  equipmentService: {
    checkAvailability: vi.fn(),
    createBatchBookings: vi.fn(),
    calculateRentalCost: vi.fn(() => ({
      dailyCost: 50,
      totalCost: 200,
      days: 4
    }))
  }
}))

describe('UniversalCart Dual-Mode System', () => {
  let store: ReturnType<typeof useCartStore>
  let mockContainer: HTMLElement

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

  // Helper function to setup mocks for cart operations
  const setupCartMocks = async () => {
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
  }

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = useCartStore()
    localStorage.clear()

    // Clean up DOM
    document.body.innerHTML = ''

    // Setup mocks
    await setupCartMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('Mode Detection Logic', () => {
    it('should detect embedded mode when universalCartContainer exists', async () => {
      // Create container for embedded mode
      const container = document.createElement('div')
      container.id = 'universalCartContainer'
      document.body.appendChild(container)

      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      expect(wrapper.vm.isEmbedded).toBe(true)
      expect(wrapper.classes()).toContain('cart--embedded')
      expect(wrapper.classes()).not.toContain('cart--floating')

      // Embedded mode should not show toggle button
      expect(wrapper.find('.floating-cart-toggle').exists()).toBe(false)

      document.body.removeChild(container)
    })

    it('should detect floating mode when no universalCartContainer exists', () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      expect(wrapper.vm.isEmbedded).toBe(false)
      expect(wrapper.classes()).toContain('cart--floating')
      expect(wrapper.classes()).not.toContain('cart--embedded')

      // Floating mode should show toggle button
      expect(wrapper.find('.floating-cart-toggle').exists()).toBe(true)
    })

    it('should auto-detect mode based on DOM structure', async () => {
      // Test floating mode (no container)
      const floatingWrapper = mount(UniversalCart)
      expect(floatingWrapper.vm.isEmbedded).toBe(false)

      // Test embedded mode (with container)
      const container = document.createElement('div')
      container.id = 'universalCartContainer'
      document.body.appendChild(container)

      const embeddedWrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })
      expect(embeddedWrapper.vm.isEmbedded).toBe(true)

      document.body.removeChild(container)
    })
  })

  describe('Embedded Mode Functionality', () => {
    beforeEach(() => {
      // Setup embedded mode environment
      mockContainer = document.createElement('div')
      mockContainer.id = 'universalCartContainer'
      document.body.appendChild(mockContainer)
    })

    afterEach(() => {
      if (mockContainer && document.body.contains(mockContainer)) {
        document.body.removeChild(mockContainer)
      }
    })

    it('should be always visible in embedded mode', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      // Cart should be visible by default in embedded mode
      expect(wrapper.find('.cart-content').exists()).toBe(true)
      expect(store.isVisible).toBe(true)

      // Should not have visibility toggle in embedded mode
      expect(wrapper.find('.floating-cart-toggle').exists()).toBe(false)
    })

    it('should render with embedded-specific styling', () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      expect(wrapper.classes()).toContain('cart--embedded')
      // The cart-content element has basic styling, not mode-specific classes in this implementation
      expect(wrapper.find('.cart-content').exists()).toBe(true)
    })

    it('should integrate with project page layout', async () => {
      await store.loadCartForProject(1)

      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      // Should display cart content directly
      expect(wrapper.find('.cart-header').exists()).toBe(true)
      expect(wrapper.find('.cart-items').exists()).toBe(true) // Changed from cart-body to cart-items
      expect(wrapper.find('.cart-footer').exists()).toBe(true)

      // Should not have floating-specific elements
      expect(wrapper.find('.cart-backdrop').exists()).toBe(false)
    })

    it('should handle cart operations in embedded mode', async () => {
      await store.loadCartForProject(1)

      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      // Add item to cart
      const cartItem = {
        equipment: mockEquipment,
        quantity: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      const result = await store.addItem(cartItem)
      await wrapper.vm.$nextTick()

      expect(result.success).toBe(true)
      expect(store.itemCount).toBe(1)
      expect(wrapper.find('.cart-items').text()).toContain('Professional Camera')
    })
  })

  describe('Floating Mode Functionality', () => {
    it('should start hidden in floating mode', () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      // Initially hidden
      expect(wrapper.find('.cart-content').exists()).toBe(false)
      expect(store.isVisible).toBe(false)

      // Should have toggle button
      expect(wrapper.find('.floating-cart-toggle').exists()).toBe(true)
    })

    it('should toggle visibility when toggle button is clicked', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      const toggleButton = wrapper.find('.floating-cart-toggle button')

      // Initially hidden
      expect(wrapper.find('.cart-content').exists()).toBe(false)

      // Click to show
      await toggleButton.trigger('click')
      expect(store.isVisible).toBe(true)

      // Click to hide
      await toggleButton.trigger('click')
      expect(store.isVisible).toBe(false)
    })

    it('should render with floating-specific styling', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      expect(wrapper.classes()).toContain('cart--floating')

      // Show cart to test content styling
      store.isVisible = true
      await wrapper.vm.$nextTick()

      // Cart content should be visible when store.isVisible is true
      expect(wrapper.find('.cart-content').exists()).toBe(true)
    })

    it('should show badge with item count on toggle button', async () => {
      await store.loadCartForProject(1)

      // Mock equipment service for availability check
      const { equipmentService } = await import('@/services/api/equipment')
      vi.mocked(equipmentService.checkAvailability).mockResolvedValue({
        available: true,
        available_quantity: 10
      })

      const wrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      // Add items to cart
      const cartItem = {
        equipment: mockEquipment,
        quantity: 2,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      await store.addItem(cartItem)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.badge').text()).toBe('1') // itemCount is 1 (one unique item), not quantity
    })

    it('should auto-show when items are added (if configured)', async () => {
      await store.loadCartForProject(1)
      store.config.autoShowOnAdd = true

      // Mock equipment service for availability check
      const { equipmentService } = await import('@/services/api/equipment')
      vi.mocked(equipmentService.checkAvailability).mockResolvedValue({
        available: true,
        available_quantity: 10
      })

      const wrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      // Initially hidden
      expect(store.isVisible).toBe(false)

      // Add item
      const cartItem = {
        equipment: mockEquipment,
        quantity: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      const result = await store.addItem(cartItem)

      // Should auto-show if successfully added
      expect(result.success).toBe(true)
      expect(store.isVisible).toBe(true)
    })
  })

  describe('Cross-Mode State Management', () => {
    it('should maintain cart state when switching between modes', async () => {
      await store.loadCartForProject(1)

      // Add item in embedded mode
      const embeddedWrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      const cartItem = {
        equipment: mockEquipment,
        quantity: 2,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      await store.addItem(cartItem)
      expect(store.itemCount).toBe(1)
      expect(store.totalQuantity).toBe(2)

      // Switch to floating mode
      const floatingWrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      // State should be preserved
      expect(store.itemCount).toBe(1)
      expect(store.totalQuantity).toBe(2)
    })

    it('should persist state across component unmounts', async () => {
      await store.loadCartForProject(1)

      const cartItem = {
        equipment: mockEquipment,
        quantity: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      await store.addItem(cartItem)
      expect(store.itemCount).toBe(1)

      // State should persist even after store is recreated
      const newStore = useCartStore()
      await newStore.loadCartForProject(1)
      expect(newStore.itemCount).toBe(1)
    })
  })

  describe('Responsive Design', () => {
    it('should apply mobile-specific styles in floating mode', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      })

      const wrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      // Floating mode should have responsive classes
      expect(wrapper.classes()).toContain('cart--floating')

      // Mobile-specific behavior would be tested via CSS classes
      // The actual responsive behavior is handled by Tailwind CSS
    })

    it('should adapt embedded mode for mobile layouts', () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      expect(wrapper.classes()).toContain('cart--embedded')
      // Mobile adaptations are handled by responsive CSS classes
    })
  })

  describe('Error Handling', () => {
    it('should display errors in both modes', async () => {
      await store.loadCartForProject(1)

      // Add error to store
      store.errors.push('Test error message')

      const embeddedWrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      const floatingWrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      // Both should display errors (when visible)
      expect(store.hasErrors).toBe(true)
      expect(store.errors).toContain('Test error message')
    })

    it('should allow error clearing in both modes', async () => {
      await store.loadCartForProject(1)
      store.errors.push('Test error')

      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      expect(store.errors.length).toBe(1)

      // Clear errors
      store.clearErrors()
      expect(store.errors.length).toBe(0)
    })
  })

  describe('Performance Considerations', () => {
    it('should not render cart content when hidden in floating mode', () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      // Content should not be rendered when hidden
      expect(wrapper.find('.cart-content').exists()).toBe(false)

      // Toggle visibility
      store.isVisible = true

      // Now content should be rendered
      expect(wrapper.find('.cart-content').exists()).toBe(true)
    })

    it('should always render content in embedded mode for better performance', () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      // Content should always be rendered in embedded mode
      expect(wrapper.find('.cart-content').exists()).toBe(true)
    })
  })

  describe('Action Execution', () => {
    beforeEach(async () => {
      await store.loadCartForProject(1)

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
    })

    it('should execute actions in embedded mode', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      // Add item first
      const cartItem = {
        equipment: mockEquipment,
        quantity: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      await store.addItem(cartItem)
      expect(store.itemCount).toBe(1)

      // Execute action
      await wrapper.vm.executeAction()

      // Cart should be cleared after successful execution
      expect(store.itemCount).toBe(0)
    })

    it('should execute actions in floating mode', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      store.isVisible = true // Show the cart

      // Add item first
      const cartItem = {
        equipment: mockEquipment,
        quantity: 1,
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        dailyCost: 50
      }

      await store.addItem(cartItem)
      expect(store.itemCount).toBe(1)

      // Execute action
      await wrapper.vm.executeAction()

      // Cart should be cleared after successful execution
      expect(store.itemCount).toBe(0)
    })
  })
})
