import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProjectsListView from '../ProjectsListView.vue'
import { useProjectsStore } from '@/stores/projects'
import { describe, it, expect, beforeEach } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/projects/:id',
      name: 'project-detail',
      // component: ProjectDetailView, // We don't need the actual component for this test
      component: { template: '' },
      props: true,
    },
  ],
})

describe('ProjectsListView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders a list of projects', async () => {
    const store = useProjectsStore()

    const wrapper = mount(ProjectsListView, {
      global: {
        plugins: [router],
      },
    })

    await router.push('/')
    await router.isReady()

    // Wait for the next tick to allow the component to update
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const projectItems = wrapper.findAll('.project-grid > div')
    expect(projectItems.length).toBe(2)
    expect(projectItems[0].text()).toContain('Test Project 1')
    expect(projectItems[1].text()).toContain('Test Project 2')
  })
})
