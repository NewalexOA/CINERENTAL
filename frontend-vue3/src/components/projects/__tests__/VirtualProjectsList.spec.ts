import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VirtualProjectsList from '../VirtualProjectsList.vue'
import type { ProjectData } from '@/services/api/projects'

// Mock @tanstack/vue-virtual
vi.mock('@tanstack/vue-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 1000,
    getVirtualItems: () => [{
      key: 0,
      index: 0,
      start: 0,
      size: 320
    }]
  })
}))

// Mock performance utility
vi.mock('@/utils/performance', () => ({
  performanceMonitor: {
    startMeasurement: vi.fn(),
    endMeasurement: vi.fn(() => ({ renderTime: 50, memoryUsage: 10 })),
    logPerformanceData: vi.fn()
  }
}))

const mockProjects: ProjectData[] = [
  {
    id: 1,
    name: 'Test Project 1',
    client_id: 1,
    client_name: 'Test Client 1',
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    description: 'Test project description',
    status: 'ACTIVE',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Test Project 2',
    client_id: 2,
    client_name: 'Test Client 2',
    start_date: '2024-02-01',
    end_date: '2024-02-28',
    description: 'Another test project',
    status: 'PLANNING',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z'
  }
]

describe('VirtualProjectsList', () => {
  it('renders virtual scroller with projects', () => {
    const wrapper = mount(VirtualProjectsList, {
      props: {
        items: mockProjects,
        loading: false,
        containerHeight: 800
      },
      global: {
        stubs: {
          ProjectCard: true,
          SkeletonLoader: true,
          BaseSpinner: true
        }
      }
    })

    expect(wrapper.find('.virtual-projects-list').exists()).toBe(true)
    expect(wrapper.find('.virtual-container').exists()).toBe(true)
  })

  it('shows loading state with skeletons', () => {
    const wrapper = mount(VirtualProjectsList, {
      props: {
        items: [],
        loading: true,
        containerHeight: 800
      },
      global: {
        stubs: {
          SkeletonLoader: true,
          BaseSpinner: true
        }
      }
    })

    expect(wrapper.findAll('[data-stub="SkeletonLoader"]').length).toBeGreaterThan(0)
  })

  it('shows empty state when no items', () => {
    const wrapper = mount(VirtualProjectsList, {
      props: {
        items: [],
        loading: false,
        containerHeight: 800,
        emptyMessage: 'No projects found'
      },
      global: {
        stubs: {
          SkeletonLoader: true,
          BaseSpinner: true
        }
      }
    })

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('No projects found')
  })

  it('emits quick-edit event', async () => {
    const wrapper = mount(VirtualProjectsList, {
      props: {
        items: mockProjects,
        loading: false,
        containerHeight: 800
      },
      global: {
        stubs: {
          ProjectCard: {
            template: '<div @click="$emit(\'quick-edit\', { id: 1 })">Project Card</div>'
          },
          SkeletonLoader: true,
          BaseSpinner: true
        }
      }
    })

    await wrapper.find('[data-stub="ProjectCard"]').trigger('click')
    expect(wrapper.emitted('quick-edit')).toBeTruthy()
  })
})
