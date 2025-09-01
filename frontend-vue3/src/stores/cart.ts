import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { EquipmentResponse } from '@/types/equipment'
import type { Booking } from './project'

export interface CartItem {
  equipment: EquipmentResponse
  quantity: number
  startDate: string
  endDate: string
  notes?: string
  dailyCost: number
  totalCost: number
}

interface CartState {
  items: Map<number, CartItem>
  isVisible: boolean
  mode: 'equipment_add' | 'equipment_remove'
  projectId: number | null
}

const getCartStorageKey = (projectId: number | string) => `act_rental_cart_${projectId}`;

export const useCartStore = defineStore('cart', () => {
  // --- STATE ---
  const items = ref<Map<number, CartItem>>(new Map())
  const isVisible = ref(false)
  const mode = ref<'equipment_add' | 'equipment_remove'>('equipment_add')
  const currentProjectId = ref<number | null>(null);

  // --- GETTERS ---
  const itemCount = computed(() => items.value.size)
  const totalQuantity = computed(() => {
    let total = 0
    for (const item of items.value.values()) {
      total += item.quantity
    }
    return total
  })
  const hasItems = computed(() => itemCount.value > 0)
  const cartItems = computed(() => Array.from(items.value.values()))

  const getItemByEquipmentId = (equipmentId: number) => {
    return items.value.get(equipmentId)
  }

  // --- ACTIONS ---

  function _saveCartToStorage() {
    if (currentProjectId.value === null) return;
    try {
      const cartObject = { items: Array.from(items.value.entries()) };
      localStorage.setItem(getCartStorageKey(currentProjectId.value), JSON.stringify(cartObject));
    } catch (e) {
      console.error("Failed to save cart to localStorage:", e);
    }
  }

  function loadCartForProject(projectId: number) {
    currentProjectId.value = projectId;
    try {
      const storedCart = localStorage.getItem(getCartStorageKey(projectId));
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        if (parsedCart && parsedCart.items) {
          items.value = new Map(parsedCart.items);
        } else {
          items.value = new Map();
        }
      } else {
        items.value = new Map();
      }
    } catch (e) {
      console.error("Failed to load cart from localStorage:", e);
      items.value = new Map(); // Reset cart on error
    }
  }

  function setItemsFromBookings(bookings: Booking[]) {
    const newItems = new Map<number, CartItem>();
    for (const booking of bookings) {
      const cartItem: CartItem = {
        equipment: booking.equipment,
        quantity: booking.quantity,
        startDate: booking.start_date,
        endDate: booking.end_date,
        dailyCost: booking.equipment.daily_cost, // Assuming daily_cost is on equipment
        totalCost: booking.quantity * booking.equipment.daily_cost, // Simplified cost
      };
      newItems.set(booking.equipment.id, cartItem);
    }
    items.value = newItems;
    _saveCartToStorage();
  }

  function addItem(item: CartItem) {
    const existingItem = items.value.get(item.equipment.id)

    if (existingItem) {
      existingItem.quantity += item.quantity
    } else {
      items.value.set(item.equipment.id, item)
    }
    _saveCartToStorage();
  }

  function removeItem(equipmentId: number) {
    items.value.delete(equipmentId)
    _saveCartToStorage();
  }

  function updateItemQuantity(equipmentId: number, quantity: number) {
    const item = items.value.get(equipmentId)
    if (item) {
      if (quantity <= 0) {
        removeItem(equipmentId)
      } else {
        item.quantity = quantity
      }
    }
    _saveCartToStorage();
  }

  function clearCart() {
    items.value.clear()
    _saveCartToStorage();
  }

  function toggleVisibility() {
    isVisible.value = !isVisible.value
  }

  return {
    items,
    isVisible,
    mode,
    itemCount,
    totalQuantity,
    hasItems,
    cartItems,
    getItemByEquipmentId,
    loadCartForProject,
    setItemsFromBookings,
    addItem,
    removeItem,
    updateItemQuantity,
    clearCart,
    toggleVisibility,
  }
})
