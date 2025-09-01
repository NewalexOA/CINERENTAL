import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ClientsView from '../ClientsView.vue'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import flushPromises from 'flush-promises'

describe('ClientsView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    server.use(
      http.get('*/clients/paginated', () => {
        return HttpResponse.json({
          items: [
            { id: 1, name: 'Test Client 1', contact_person: 'John Doe', email: 'john@test.com', phone: '123' },
            { id: 2, name: 'Test Client 2', contact_person: 'Jane Doe', email: 'jane@test.com', phone: '456' },
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

  it('renders a list of clients from the mock handler', async () => {
    const wrapper = mount(ClientsView)

    await flushPromises()

    const clientItems = wrapper.findAll('.client-grid > div')
    expect(clientItems.length).toBe(2)
    expect(clientItems[0].text()).toContain('Test Client 1')
    expect(clientItems[1].text()).toContain('Test Client 2')
  })
});
