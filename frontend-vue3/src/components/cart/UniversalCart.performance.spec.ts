import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import UniversalCart from '../UniversalCart.vue'
import { useCartStore } from '@/stores/cart'
import type { EquipmentResponse } from '@/types/equipment'

// Performance testing utilities
const measurePerformance = async (operation: () => Promise<void> | void, description: string) => {
  const start = performance.now()
  await operation()
  const end = performance.now()
  const duration = end - start
  console.log(`${description}: ${duration.toFixed(2)}ms`)
  return duration
}

const createMockEquipment = (id: number): EquipmentResponse => ({
  id,
  name: `Equipment ${id}`,
  description: `Description for equipment ${id}`,
  replacement_cost: 1000 + id,
  barcode: `12345678${id.toString().padStart(2, '0')}`,
  serial_number: `EQ${id.toString().padStart(3, '0')}`,
  category_id: (id % 5) + 1,
  status: 'AVAILABLE',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  notes: '',
  category_name: `Category ${(id % 5) + 1}`,
  category: { id: (id % 5) + 1, name: `Category ${(id % 5) + 1}` },
  active_projects: [],
  daily_cost: 10 + (id % 100),
  quantity: 1,
  purchase_date: '2024-01-01'
})

// Mock services for performance tests
vi.mock('@/services/api/equipment', () => ({
  equipmentService: {
    checkAvailability: vi.fn().mockResolvedValue({
      available: true,
      available_quantity: 10
    }),
    createBatchBookings: vi.fn().mockResolvedValue({
      success: true,
      created_count: 1,
      failed_count: 0,
      bookings: []
    }),
    calculateRentalCost: vi.fn(() => ({
      dailyCost: 50,
      totalCost: 200,
      days: 4
    }))
  }
}))

vi.mock('@/components/common/BaseButton.vue', () => ({
  default: {
    name: 'BaseButton',
    template: '<button @click="$emit(\'click\')" :class="[variant, size]"><slot /></button>',
    props: ['variant', 'size', 'icon'],
    emits: ['click']
  }
}))

describe('UniversalCart Performance Tests', () => {
  let store: ReturnType<typeof useCartStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCartStore()
    localStorage.clear()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('Large Dataset Performance', () => {
    it('should handle 100+ items efficiently in embedded mode', async () => {
      const container = document.createElement('div')
      container.id = 'universalCartContainer'
      document.body.appendChild(container)

      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      await store.loadCartForProject(1)

      const addItemsDuration = await measurePerformance(async () => {
        const promises = []
        for (let i = 1; i <= 100; i++) {
          const cartItem = {
            equipment: createMockEquipment(i),
            quantity: 1,
            startDate: '2024-02-01',
            endDate: '2024-02-05',
            dailyCost: 50
          }
          promises.push(store.addItem(cartItem))
        }
        await Promise.all(promises)
      }, 'Adding 100 items to cart')

      expect(addItemsDuration).toBeLessThan(1000) // Should complete within 1 second
      expect(store.itemCount).toBe(100)

      // Test rendering performance
      const renderDuration = await measurePerformance(async () => {
        await nextTick()
        wrapper.vm.$forceUpdate()
        await nextTick()
      }, 'Rendering cart with 100 items')

      expect(renderDuration).toBeLessThan(100) // Should render within 100ms

      document.body.removeChild(container)
    }, 10000) // 10 second timeout for this test

    it('should handle rapid item additions efficiently', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      await store.loadCartForProject(1)

      const rapidAdditionDuration = await measurePerformance(async () => {
        for (let i = 1; i <= 50; i++) {
          const cartItem = {
            equipment: createMockEquipment(i),
            quantity: 1,
            startDate: '2024-02-01',
            endDate: '2024-02-05',
            dailyCost: 50
          }
          await store.addItem(cartItem)
        }
      }, 'Rapid addition of 50 items')

      expect(rapidAdditionDuration).toBeLessThan(500) // Should complete within 500ms
      expect(store.itemCount).toBe(50)
    })

    it('should maintain performance with complex calculations', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      await store.loadCartForProject(1)

      // Add items with varying date ranges and quantities
      const complexCalculationDuration = await measurePerformance(async () => {
        for (let i = 1; i <= 30; i++) {
          const startDate = new Date(2024, 1, i).toISOString().split('T')[0]
          const endDate = new Date(2024, 1, i + (i % 10) + 1).toISOString().split('T')[0]

          const cartItem = {
            equipment: createMockEquipment(i),
            quantity: (i % 5) + 1,
            startDate,
            endDate,
            dailyCost: 50 + (i % 20)
          }
          await store.addItem(cartItem)
        }
      }, 'Adding 30 items with complex calculations')

      expect(complexCalculationDuration).toBeLessThan(300) // Should complete within 300ms
      expect(store.itemCount).toBe(30)

      // Verify calculations are correct
      expect(store.totalQuantity).toBeGreaterThan(30)
      expect(store.totalCost).toBeGreaterThan(0)
    })
  })

  describe('Memory Usage and Cleanup', () => {
    it('should not leak memory when switching between modes', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0

      // Create and destroy multiple cart instances
      for (let i = 0; i < 10; i++) {
        const embeddedWrapper = mount(UniversalCart, {
          props: { mode: 'embedded' }
        })

        await store.loadCartForProject(i + 1)

        // Add some items
        for (let j = 0; j < 10; j++) {
          const cartItem = {
            equipment: createMockEquipment(j + 1),
            quantity: 1,
            startDate: '2024-02-01',
            endDate: '2024-02-05',
            dailyCost: 50
          }
          await store.addItem(cartItem)
        }

        embeddedWrapper.unmount()
        store.clearCart()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should efficiently handle cart clearing with large datasets', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      await store.loadCartForProject(1)

      // Add 200 items
      for (let i = 1; i <= 200; i++) {
        const cartItem = {
          equipment: createMockEquipment(i),
          quantity: 1,
          startDate: '2024-02-01',
          endDate: '2024-02-05',
          dailyCost: 50
        }
        await store.addItem(cartItem)
      }

      expect(store.itemCount).toBe(200)

      const clearDuration = await measurePerformance(() => {
        store.clearCart()
      }, 'Clearing cart with 200 items')

      expect(clearDuration).toBeLessThan(50) // Should clear within 50ms
      expect(store.itemCount).toBe(0)
    })
  })

  describe('Storage Performance', () => {
    it('should efficiently save and load large carts from localStorage', async () => {
      await store.loadCartForProject(1)

      // Add 100 items to create a substantial dataset
      for (let i = 1; i <= 100; i++) {
        const cartItem = {
          equipment: createMockEquipment(i),
          quantity: (i % 3) + 1,
          startDate: '2024-02-01',
          endDate: '2024-02-05',
          dailyCost: 50 + (i % 20)
        }
        await store.addItem(cartItem)
      }

      expect(store.itemCount).toBe(100)

      // Test loading performance
      const newStore = useCartStore()
      const loadDuration = await measurePerformance(async () => {
        await newStore.loadCartForProject(1)
      }, 'Loading cart with 100 items from localStorage')

      expect(loadDuration).toBeLessThan(100) // Should load within 100ms
      expect(newStore.itemCount).toBe(100)
    })

    it('should handle storage compression efficiently', async () => {
      await store.loadCartForProject(1)

      // Create items with lots of text data to test compression
      const createLargeDataItem = (id: number) => {
        const equipment = createMockEquipment(id)
        equipment.description = 'A'.repeat(1000) // Large description
        equipment.notes = 'B'.repeat(500) // Large notes
        return equipment
      }

      const compressionDuration = await measurePerformance(async () => {
        for (let i = 1; i <= 50; i++) {
          const cartItem = {
            equipment: createLargeDataItem(i),
            quantity: 1,
            startDate: '2024-02-01',
            endDate: '2024-02-05',
            dailyCost: 50
          }
          await store.addItem(cartItem)
        }
      }, 'Adding 50 items with large data (testing compression)')

      expect(compressionDuration).toBeLessThan(500) // Should complete within 500ms
      expect(store.itemCount).toBe(50)

      // Verify localStorage data is compressed (should be smaller than raw JSON)
      const storageKey = `cinerental_cart_v2_1`
      const storedData = localStorage.getItem(storageKey)
      expect(storedData).toBeTruthy()

      // The compressed data should be significantly smaller than the raw data
      const rawDataSize = JSON.stringify(Array.from(store.items.entries())).length
      const compressedSize = storedData!.length

      // Compression should achieve some reduction (at least 10%)
      expect(compressedSize).toBeLessThan(rawDataSize * 0.9)
    })
  })

  describe('Animation and UI Performance', () => {
    it('should handle smooth transitions in floating mode', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'floating' }
      })

      await store.loadCartForProject(1)

      // Add some items to make the cart substantial
      for (let i = 1; i <= 20; i++) {
        const cartItem = {
          equipment: createMockEquipment(i),
          quantity: 1,
          startDate: '2024-02-01',
          endDate: '2024-02-05',
          dailyCost: 50
        }
        await store.addItem(cartItem)
      }

      const togglePerformance = await measurePerformance(async () => {
        // Toggle visibility multiple times rapidly
        for (let i = 0; i < 10; i++) {
          store.toggleVisibility()
          await nextTick()
        }
      }, 'Rapid visibility toggling with 20 items')

      expect(togglePerformance).toBeLessThan(100) // Should handle rapid toggling efficiently
    })

    it('should maintain 60fps during cart operations', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      await store.loadCartForProject(1)

      // Simulate frame rate monitoring
      const frameStart = performance.now()
      const targetFrameTime = 1000 / 60 // 60fps = ~16.67ms per frame

      // Perform multiple cart operations that should not block the main thread
      for (let i = 1; i <= 10; i++) {
        const frameOperationStart = performance.now()

        const cartItem = {
          equipment: createMockEquipment(i),
          quantity: i % 3 + 1,
          startDate: '2024-02-01',
          endDate: '2024-02-05',
          dailyCost: 50
        }

        await store.addItem(cartItem)
        await nextTick()

        const frameOperationEnd = performance.now()
        const operationTime = frameOperationEnd - frameOperationStart

        // Each operation should complete within a frame budget
        expect(operationTime).toBeLessThan(targetFrameTime)
      }

      const totalTime = performance.now() - frameStart
      console.log(`Total time for 10 cart operations: ${totalTime.toFixed(2)}ms`)
    })
  })

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent item additions efficiently', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      await store.loadCartForProject(1)

      const concurrentDuration = await measurePerformance(async () => {
        // Create multiple concurrent operations
        const promises = []

        for (let i = 1; i <= 20; i++) {
          const cartItem = {
            equipment: createMockEquipment(i),
            quantity: 1,
            startDate: '2024-02-01',
            endDate: '2024-02-05',
            dailyCost: 50
          }
          promises.push(store.addItem(cartItem))
        }

        await Promise.all(promises)
      }, 'Concurrent addition of 20 items')

      expect(concurrentDuration).toBeLessThan(200) // Should handle concurrent operations efficiently
      expect(store.itemCount).toBe(20)
    })

    it('should handle mixed operations efficiently', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      await store.loadCartForProject(1)

      // First add some items
      for (let i = 1; i <= 30; i++) {
        const cartItem = {
          equipment: createMockEquipment(i),
          quantity: 1,
          startDate: '2024-02-01',
          endDate: '2024-02-05',
          dailyCost: 50
        }
        await store.addItem(cartItem)
      }

      const mixedOperationsDuration = await measurePerformance(async () => {
        const operations = []

        // Mix of add, remove, and update operations
        for (let i = 1; i <= 10; i++) {
          if (i % 3 === 0) {
            // Remove operation
            const itemKeys = Array.from(store.items.keys())
            if (itemKeys.length > 0) {
              operations.push(store.removeItem(itemKeys[0]))
            }
          } else if (i % 3 === 1) {
            // Update quantity operation
            const itemKeys = Array.from(store.items.keys())
            if (itemKeys.length > 0) {
              operations.push(store.updateQuantity(itemKeys[0], 2))
            }
          } else {
            // Add operation
            const cartItem = {
              equipment: createMockEquipment(i + 100),
              quantity: 1,
              startDate: '2024-02-01',
              endDate: '2024-02-05',
              dailyCost: 50
            }
            operations.push(store.addItem(cartItem))
          }
        }

        await Promise.all(operations.filter(op => op instanceof Promise))
      }, 'Mixed cart operations (add, remove, update)')

      expect(mixedOperationsDuration).toBeLessThan(150) // Should handle mixed operations efficiently
    })
  })

  describe('Edge Case Performance', () => {
    it('should handle maximum capacity efficiently', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      await store.loadCartForProject(1)

      // Set capacity to 100 for testing
      store.config.maxItems = 100

      const maxCapacityDuration = await measurePerformance(async () => {
        for (let i = 1; i <= 100; i++) {
          const cartItem = {
            equipment: createMockEquipment(i),
            quantity: 1,
            startDate: '2024-02-01',
            endDate: '2024-02-05',
            dailyCost: 50
          }
          await store.addItem(cartItem)
        }
      }, 'Filling cart to maximum capacity (100 items)')

      expect(maxCapacityDuration).toBeLessThan(1000) // Should handle max capacity within 1 second
      expect(store.itemCount).toBe(100)
      expect(store.isOverCapacity).toBe(true)

      // Test that adding beyond capacity is handled efficiently
      const overCapacityDuration = await measurePerformance(async () => {
        const cartItem = {
          equipment: createMockEquipment(101),
          quantity: 1,
          startDate: '2024-02-01',
          endDate: '2024-02-05',
          dailyCost: 50
        }
        const result = await store.addItem(cartItem)
        expect(result.success).toBe(false)
      }, 'Attempting to exceed capacity')

      expect(overCapacityDuration).toBeLessThan(10) // Should reject quickly
    })

    it('should handle rapid clear and reload operations', async () => {
      const wrapper = mount(UniversalCart, {
        props: { mode: 'embedded' }
      })

      const rapidClearReloadDuration = await measurePerformance(async () => {
        for (let cycle = 0; cycle < 5; cycle++) {
          await store.loadCartForProject(cycle + 1)

          // Add 20 items
          for (let i = 1; i <= 20; i++) {
            const cartItem = {
              equipment: createMockEquipment(i),
              quantity: 1,
              startDate: '2024-02-01',
              endDate: '2024-02-05',
              dailyCost: 50
            }
            await store.addItem(cartItem)
          }

          // Clear cart
          store.clearCart()
        }
      }, 'Rapid clear and reload cycles (5 cycles with 20 items each)')

      expect(rapidClearReloadDuration).toBeLessThan(500) // Should handle rapid cycles efficiently
    })
  })
})
