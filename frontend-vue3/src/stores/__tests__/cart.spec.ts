import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from '../cart'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    },
    removeItem: (key) => {
      delete store[key]
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Cart Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('loads cart for a project', () => {
    const store = useCartStore()
    const cartData = { items: [[1, { equipment: { id: 1, name: 'Test Equipment' }, quantity: 1 }]] }
    localStorage.setItem('act_rental_cart_1', JSON.stringify(cartData))

    store.loadCartForProject(1)

    expect(store.itemCount).toBe(1)
    expect(store.cartItems[0].equipment.name).toBe('Test Equipment')
  })

  it('sets items from bookings', () => {
    const store = useCartStore()
    const bookings = [
      { id: 1, equipment: { id: 1, name: 'Test Equipment 1', daily_cost: 10 }, quantity: 1, start_date: '2025-01-01', end_date: '2025-01-02' },
      { id: 2, equipment: { id: 2, name: 'Test Equipment 2', daily_cost: 20 }, quantity: 2, start_date: '2025-01-01', end_date: '2025-01-02' },
    ]

    store.setItemsFromBookings(bookings)

    expect(store.itemCount).toBe(2)
    expect(store.cartItems[0].quantity).toBe(1)
    expect(store.cartItems[1].quantity).toBe(2)
  })

  it('adds an item to the cart', () => {
    const store = useCartStore()
    store.loadCartForProject(1)
    const newItem = { equipment: { id: 1, name: 'Test Equipment' }, quantity: 1 }

    store.addItem(newItem)

    expect(store.itemCount).toBe(1)
  })

  it('removes an item from the cart', () => {
    const store = useCartStore()
    store.loadCartForProject(1)
    const newItem = { equipment: { id: 1, name: 'Test Equipment' }, quantity: 1 }
    store.addItem(newItem)

    store.removeItem(1)

    expect(store.itemCount).toBe(0)
  })

  it('clears the cart', () => {
    const store = useCartStore()
    store.loadCartForProject(1)
    const newItem = { equipment: { id: 1, name: 'Test Equipment' }, quantity: 1 }
    store.addItem(newItem)

    store.clearCart()

    expect(store.itemCount).toBe(0)
  })
})
