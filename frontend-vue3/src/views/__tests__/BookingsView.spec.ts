import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BookingsView from '../BookingsView.vue'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import flushPromises from 'flush-promises'

describe('BookingsView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    server.use(
      http.get('*/bookings/paginated', () => {
        return HttpResponse.json({
          items: [
            { id: 1, equipment: { name: 'Camera' }, quantity: 1, start_date: '2025-01-01', end_date: '2025-01-05' },
            { id: 2, equipment: { name: 'Lights' }, quantity: 5, start_date: '2025-01-10', end_date: '2025-01-15' },
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

  it('renders a list of bookings from the mock handler', async () => {
    const wrapper = mount(BookingsView)

    await flushPromises()

    const bookingItems = wrapper.findAll('.booking-grid > div')
    expect(bookingItems.length).toBe(2)
    expect(bookingItems[0].text()).toContain('Camera')
    expect(bookingItems[1].text()).toContain('Lights')
  })
});
