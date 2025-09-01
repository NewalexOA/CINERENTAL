import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProjectsListView from '../ProjectsListView.vue'
import { describe, it, expect, beforeEach, afterAll, afterEach } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import flushPromises from 'flush-promises'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: { template: '' },
      props: true,
    },
  ],
})

describe('ProjectsListView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    server.use(
      http.get('*/projects/paginated', () => {
        return HttpResponse.json({
          items: [
            { id: 1, name: 'Test Project 1', client_name: 'Client A', status: 'In Progress' },
            { id: 2, name: 'Test Project 2', client_name: 'Client B', status: 'Completed' },
          ],
          total: 2,
          pages: 1,
        })
      })
    )
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('renders a list of projects from the mock handler', async () => {
    const wrapper = mount(ProjectsListView, {
      global: {
        plugins: [router],
      },
    })

    await router.isReady()
    await flushPromises()

    const projectItems = wrapper.findAll('.project-grid > div')
    expect(projectItems.length).toBe(2)
    expect(projectItems[0].text()).toContain('Test Project 1')
    expect(projectItems[1].text()).toContain('Test Project 2')
  })
});

describe('ProjectsListView.vue - Integration with MSW', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    server.resetHandlers()
  })

  it('should display projects fetched from the API', async () => {
    server.use(
      http.get('*/projects/paginated', () => {
        return HttpResponse.json({
          items: [
            { id: 3, name: 'MSW Project 1', client_name: 'MSW Client A', status: 'In Progress' },
            { id: 4, name: 'MSW Project 2', client_name: 'MSW Client B', status: 'Completed' },
          ],
          total: 2,
          pages: 1,
        })
      })
    )

    const wrapper = mount(ProjectsListView, {
      global: {
        plugins: [router],
      },
    })

    await router.isReady()
    await flushPromises()

    const projectItems = wrapper.findAll('.project-grid > div')
    expect(projectItems.length).toBe(2)
    expect(projectItems[0].text()).toContain('MSW Project 1')
    expect(projectItems[1].text()).toContain('MSW Project 2')
  })

  it('should call the API with the correct page number when paginating', async () => {
    let page = 1;
    server.use(
      http.get('*/projects/paginated', ({request}) => {
        const url = new URL(request.url)
        page = Number(url.searchParams.get('page')) || 1
        return HttpResponse.json({
          items: [],
          total: 10,
          pages: 5,
        })
      })
    )

    const wrapper = mount(ProjectsListView, {
      global: {
        plugins: [router],
      },
    })

    await router.isReady()
    await flushPromises()

    expect(page).toBe(1)

    const nextButton = wrapper.findAll('button').find(b => b.text() === 'Next')
    await nextButton.trigger('click')
    await flushPromises()

    expect(page).toBe(2)
  })
})
