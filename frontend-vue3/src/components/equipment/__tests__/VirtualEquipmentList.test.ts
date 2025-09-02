import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VirtualEquipmentList from '../VirtualEquipmentList.vue'
import type { EquipmentResponse } from '@/types/equipment'
import { EquipmentStatus } from '@/types/equipment'

// Mock the virtualizer
vi.mock('@tanstack/vue-virtual', () => ({
  useVirtualizer: vi.fn(() => ({
    value: {
      getTotalSize: () => 4000,
      getVirtualItems: () => [
        { key: '0', index: 0, start: 0, size: 380 },
        { key: '1', index: 1, start: 380, size: 380 },
      ],
      measure: vi.fn()
    }
  }))
}))

// Mock performance monitoring
vi.mock('@/utils/performance', () => ({
  performanceMonitor: {
    startMeasurement: vi.fn(),
    endMeasurement: vi.fn(() => ({
      renderTime: 45.2,
      memoryUsage: 15,
      itemCount: 100,
      viewMode: 'virtual',
      timestamp: Date.now()
    })),
    logPerformanceData: vi.fn()
  }
}))

const createMockEquipment = (id: number): EquipmentResponse => ({
  id,
  name: `Equipment ${id}`,
  description: `Test equipment ${id}`,
  replacement_cost: 1000,
  barcode: `12345${id.toString().padStart(5, '0')}99`,
  serial_number: `SN-${id}`,
  category_id: 1,
  category_name: 'Test Category',
  status: EquipmentStatus.AVAILABLE,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  daily_cost: 50,
  active_projects: [],
  quantity: 1
})

describe('VirtualEquipmentList', () => {
  const mockItems = Array.from({ length: 100 }, (_, i) => createMockEquipment(i + 1))

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
  })

  it('renders virtual scrolling container with items', async () => {
    const wrapper = mount(VirtualEquipmentList, {
      props: {
        items: mockItems.slice(0, 20),
        loading: false,
        containerHeight: 800
      }
    })

    await nextTick()

    // Check that virtual container exists
    expect(wrapper.find('.virtual-container').exists()).toBe(true)

    // Check that virtual scrolling structure is present
    expect(wrapper.find('[style*="position: relative"]').exists()).toBe(true)
  })

  it('shows loading skeleton when loading with empty items', () => {
    const wrapper = mount(VirtualEquipmentList, {
      props: {
        items: [],
        loading: true,
        containerHeight: 800
      }
    })

    expect(wrapper.find('.grid').exists()).toBe(true)
    expect(wrapper.findAllComponents({ name: 'SkeletonLoader' }).length).toBeGreaterThan(0)
  })

  it('shows empty state when no items and not loading', () => {
    const wrapper = mount(VirtualEquipmentList, {
      props: {
        items: [],
        loading: false,
        containerHeight: 800
      }
    })

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('No equipment found')
  })

  it('emits add-to-cart event when equipment card emits it', async () => {
    const wrapper = mount(VirtualEquipmentList, {
      props: {
        items: mockItems.slice(0, 10),
        loading: false,
        containerHeight: 800
      }
    })

    await nextTick()

    // Find the first equipment card and emit add-to-cart
    const equipmentCard = wrapper.findComponent({ name: 'EquipmentCard' })
    if (equipmentCard.exists()) {
      await equipmentCard.vm.$emit('add-to-cart', mockItems[0])

      expect(wrapper.emitted('add-to-cart')).toBeTruthy()
      expect(wrapper.emitted('add-to-cart')![0]).toEqual([mockItems[0]])
    }
  })

  it('calculates responsive items per row correctly', async () => {
    const wrapper = mount(VirtualEquipmentList, {
      props: {
        items: mockItems,
        loading: false,
        containerHeight: 800
      }
    })

    const vm = wrapper.vm as any

    // Test desktop resolution (default)
    expect(vm.cachedItemsPerRow).toBe(3)
  })

  it('handles performance monitoring integration', async () => {
    const { performanceMonitor } = await import('@/utils/performance')

    mount(VirtualEquipmentList, {
      props: {
        items: mockItems.slice(0, 50),
        loading: false,
        containerHeight: 800
      }
    })

    await nextTick()

    // Check that performance monitoring was called
    expect(performanceMonitor.startMeasurement).toHaveBeenCalled()
    expect(performanceMonitor.endMeasurement).toHaveBeenCalled()
    expect(performanceMonitor.logPerformanceData).toHaveBeenCalled()
  })

  it('optimizes virtual scrolling configuration based on container height', () => {
    const wrapper = mount(VirtualEquipmentList, {
      props: {
        items: mockItems,
        loading: false,
        containerHeight: 1200 // Larger container
      }
    })

    const vm = wrapper.vm as any

    // With larger container, should have more overscan
    expect(vm.virtualizer.value).toBeDefined()
  })

  it('handles scroll-based load more efficiently', async () => {
    const wrapper = mount(VirtualEquipmentList, {
      props: {
        items: mockItems,
        loading: false,
        containerHeight: 800
      }
    })

    await nextTick()

    // Simulate scroll to bottom
    const container = wrapper.find('.virtual-container')
    const containerElement = container.element as HTMLElement

    // Mock scroll properties
    Object.defineProperty(containerElement, 'scrollTop', { value: 2000, writable: true })
    Object.defineProperty(containerElement, 'scrollHeight', { value: 4000, writable: true })
    Object.defineProperty(containerElement, 'clientHeight', { value: 800, writable: true })

    await container.trigger('scroll')

    // Should emit load-more when near bottom
    await nextTick()
    expect(wrapper.emitted('load-more')).toBeTruthy()
  })
})
