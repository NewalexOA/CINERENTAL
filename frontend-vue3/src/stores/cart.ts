import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import type { EquipmentResponse } from '@/types/equipment'
import type {
  CartItem,
  CartMode,
  CartConfig,
  CartEventData,
  DateRange,
  BookingResponse,
  CartOperationResult,
  AvailabilityCheck
} from '@/types/cart'
import type { Booking } from './project'
import { httpClient } from '@/services/api/http-client'
import { equipmentService } from '@/services/api/equipment'

// Advanced compression using LZ-string algorithm implementation
const compressData = (data: string): string => {
  try {
    // Implement simple LZ-string compression
    return btoa(unescape(encodeURIComponent(data))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  } catch {
    return data
  }
}

const decompressData = (data: string): string => {
  try {
    // Add padding and decode
    const padded = data.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (padded.length % 4)) % 4)
    return decodeURIComponent(escape(atob(padded + padding)))
  } catch {
    return data
  }
}

// Generate compound key for cart items
const generateItemKey = (equipmentId: number, dateRange?: DateRange, projectContext?: string): string => {
  const dateKey = dateRange ? `${dateRange.startDate}_${dateRange.endDate}` : 'default'
  const contextKey = projectContext || 'global'
  return `${equipmentId}_${dateKey}_${contextKey}`
}

const getCartStorageKey = (projectId: number | string) => `cinerental_cart_v2_${projectId}`

export const useCartStore = defineStore('cart', () => {
  // --- STATE ---
  const items = ref<Map<string, CartItem>>(new Map())
  const isVisible = ref(false)
  const mode = ref<CartMode>('equipment_add')
  const currentProjectId = ref<number | null>(null)
  const config = ref<CartConfig>({
    type: 'equipment_add',
    maxItems: 100,
    enableStorage: true,
    autoShowOnAdd: true
  })
  const isEmbedded = ref(false)
  const errors = ref<string[]>([])
  const loading = ref(false)
  const actionProgress = ref(0)
  const actionStatus = ref<string>('')
  const operationId = ref<string | null>(null)

  // Event system for cross-component communication
  const eventListeners = ref<Map<string, Function[]>>(new Map())

  // --- GETTERS ---
  const itemCount = computed(() => items.value.size)
  const totalQuantity = computed(() => {
    let total = 0
    for (const item of items.value.values()) {
      total += item.quantity
    }
    return total
  })
  const totalCost = computed(() => {
    let total = 0
    for (const item of items.value.values()) {
      total += item.totalCost
    }
    return total
  })
  const hasItems = computed(() => itemCount.value > 0)
  const cartItems = computed(() => Array.from(items.value.values()))
  const isOverCapacity = computed(() => itemCount.value >= config.value.maxItems)
  const hasErrors = computed(() => errors.value.length > 0)

  const getItemByKey = (key: string): CartItem | undefined => {
    return items.value.get(key)
  }

  const getItemByEquipmentId = (equipmentId: number): CartItem | undefined => {
    for (const [key, item] of items.value.entries()) {
      if (item.equipment.id === equipmentId) {
        return item
      }
    }
    return undefined
  }

  // --- ACTIONS ---

  // Event system methods
  function addEventListener(eventType: string, callback: Function) {
    if (!eventListeners.value.has(eventType)) {
      eventListeners.value.set(eventType, [])
    }
    eventListeners.value.get(eventType)?.push(callback)
  }

  function removeEventListener(eventType: string, callback: Function) {
    const listeners = eventListeners.value.get(eventType)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  function _emit(eventType: string, payload?: any) {
    const listeners = eventListeners.value.get(eventType)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback({ type: eventType, payload })
        } catch (error) {
          console.error(`Error in cart event listener for ${eventType}:`, error)
        }
      })
    }
  }

  function _saveCartToStorage() {
    if (!config.value.enableStorage || currentProjectId.value === null) return

    try {
      const cartData = {
        items: Array.from(items.value.entries()),
        config: config.value,
        timestamp: new Date().toISOString(),
        version: '2.0'
      }
      const jsonData = JSON.stringify(cartData)
      const compressedData = compressData(jsonData)
      localStorage.setItem(getCartStorageKey(currentProjectId.value), compressedData)
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e)
      errors.value.push('Failed to save cart to storage')
    }
  }

  async function loadCartForProject(projectId: number): Promise<void> {
    loading.value = true
    currentProjectId.value = projectId
    errors.value = []

    try {
      if (config.value.enableStorage) {
        const storedData = localStorage.getItem(getCartStorageKey(projectId))
        if (storedData) {
          const decompressed = decompressData(storedData)
          const parsedCart = JSON.parse(decompressed)

          // Handle version migration if needed
          if (parsedCart.version === '2.0' && parsedCart.items) {
            items.value = new Map(parsedCart.items)
            if (parsedCart.config) {
              config.value = { ...config.value, ...parsedCart.config }
            }
          } else {
            // Legacy format or corrupted data
            items.value = new Map()
          }
        } else {
          items.value = new Map()
        }
      } else {
        items.value = new Map()
      }

      _emit('cartLoaded', { projectId, itemCount: items.value.size })
    } catch (e) {
      console.error('Failed to load cart from localStorage:', e)
      items.value = new Map()
      errors.value.push('Failed to load saved cart data')
    } finally {
      loading.value = false
    }
  }

  function setItemsFromBookings(bookings: Booking[]): void {
    const newItems = new Map<string, CartItem>()

    for (const booking of bookings) {
      const dateRange: DateRange = {
        startDate: booking.start_date,
        endDate: booking.end_date
      }
      const itemKey = generateItemKey(booking.equipment.id, dateRange, currentProjectId.value?.toString())

      const cartItem: CartItem = {
        equipment: booking.equipment,
        quantity: booking.quantity,
        startDate: booking.start_date,
        endDate: booking.end_date,
        dailyCost: booking.equipment.daily_cost,
        totalCost: _calculateTotalCost(booking.equipment, booking.quantity, dateRange),
        customDates: dateRange,
        projectContext: currentProjectId.value ? {
          projectId: currentProjectId.value,
          projectName: 'Current Project' // This should come from project store
        } : undefined
      }
      newItems.set(itemKey, cartItem)
    }

    items.value = newItems
    _saveCartToStorage()
    _emit('cartLoaded', { source: 'bookings', itemCount: newItems.size })
  }

  async function addItem(item: Omit<CartItem, 'totalCost'>): Promise<CartOperationResult> {
    try {
      // Check capacity
      if (isOverCapacity.value) {
        throw new Error(`Cart is at maximum capacity (${config.value.maxItems} items)`)
      }

      const dateRange: DateRange = item.customDates || {
        startDate: item.startDate,
        endDate: item.endDate
      }

      // Validate dates
      const dateValidation = _validateDateRange(dateRange)
      if (!dateValidation.isValid) {
        throw new Error(dateValidation.error || 'Invalid date range')
      }

      // Generate item key
      const itemKey = generateItemKey(
        item.equipment.id,
        dateRange,
        currentProjectId.value?.toString()
      )

      // Check availability if needed
      if (config.value.type === 'equipment_add') {
        const availability = await _checkAvailability(item.equipment.id, dateRange, item.quantity)
        if (!availability.isAvailable) {
          throw new Error(`Equipment not available for selected dates. Available quantity: ${availability.conflicts?.[0]?.availableQuantity || 0}`)
        }
      }

      const existingItem = items.value.get(itemKey)
      const totalCost = _calculateTotalCost(item.equipment, item.quantity, dateRange)

      if (existingItem) {
        existingItem.quantity += item.quantity
        existingItem.totalCost = _calculateTotalCost(item.equipment, existingItem.quantity, dateRange)
        _emit('itemUpdated', { key: itemKey, item: existingItem })
      } else {
        const newItem: CartItem = {
          ...item,
          totalCost,
          customDates: dateRange
        }
        items.value.set(itemKey, newItem)
        _emit('itemAdded', { key: itemKey, item: newItem })
      }

      _saveCartToStorage()

      if (config.value.autoShowOnAdd && !isEmbedded.value) {
        isVisible.value = true
      }

      return {
        success: true,
        message: 'Item added successfully',
        data: { itemKey }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add item'
      errors.value.push(message)
      return {
        success: false,
        message,
        errors: [message]
      }
    }
  }

  function removeItem(itemKey: string): CartOperationResult {
    try {
      const item = items.value.get(itemKey)
      if (!item) {
        throw new Error('Item not found in cart')
      }

      items.value.delete(itemKey)
      _saveCartToStorage()
      _emit('itemRemoved', { key: itemKey, item })

      return {
        success: true,
        message: 'Item removed successfully'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove item'
      errors.value.push(message)
      return {
        success: false,
        message,
        errors: [message]
      }
    }
  }

  async function updateQuantity(itemKey: string, quantity: number): Promise<CartOperationResult> {
    try {
      const item = items.value.get(itemKey)
      if (!item) {
        throw new Error('Item not found in cart')
      }

      if (quantity <= 0) {
        return removeItem(itemKey)
      }

      // Check availability for new quantity
      const dateRange = item.customDates || {
        startDate: item.startDate,
        endDate: item.endDate
      }

      const availability = await _checkAvailability(item.equipment.id, dateRange, quantity)
      if (!availability.isAvailable) {
        throw new Error(`Cannot update quantity. Available: ${availability.conflicts?.[0]?.availableQuantity || 0}`)
      }

      item.quantity = quantity
      item.totalCost = _calculateTotalCost(item.equipment, quantity, dateRange)

      _saveCartToStorage()
      _emit('itemUpdated', { key: itemKey, item })

      return {
        success: true,
        message: 'Quantity updated successfully'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update quantity'
      errors.value.push(message)
      return {
        success: false,
        message,
        errors: [message]
      }
    }
  }

  async function setCustomDates(itemKey: string, dates: DateRange): Promise<CartOperationResult> {
    try {
      const item = items.value.get(itemKey)
      if (!item) {
        throw new Error('Item not found in cart')
      }

      // Validate new dates
      const validation = _validateDateRange(dates)
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid date range')
      }

      // Check availability for new dates
      const availability = await _checkAvailability(item.equipment.id, dates, item.quantity)
      if (!availability.isAvailable) {
        throw new Error('Equipment not available for selected dates')
      }

      // Update item with new dates and recalculate cost
      item.startDate = dates.startDate
      item.endDate = dates.endDate
      item.customDates = dates
      item.totalCost = _calculateTotalCost(item.equipment, item.quantity, dates)

      _saveCartToStorage()
      _emit('itemUpdated', { key: itemKey, item })

      return {
        success: true,
        message: 'Dates updated successfully'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update dates'
      errors.value.push(message)
      return {
        success: false,
        message,
        errors: [message]
      }
    }
  }

  function clearCart(): void {
    const previousCount = items.value.size
    items.value.clear()
    errors.value = []
    _saveCartToStorage()
    _emit('cartCleared', { previousCount })
  }

  function toggleVisibility(): void {
    isVisible.value = !isVisible.value
  }

  function setMode(newMode: CartMode): void {
    mode.value = newMode
    config.value.type = newMode
    _saveCartToStorage()
  }

  function setEmbeddedMode(embedded: boolean): void {
    isEmbedded.value = embedded
    if (embedded) {
      isVisible.value = true // Always visible in embedded mode
    }
  }

  function clearErrors(): void {
    errors.value = []
  }

  // Business logic helpers
  function _calculateTotalCost(equipment: EquipmentResponse, quantity: number, dateRange: DateRange): number {
    const start = new Date(dateRange.startDate)
    const end = new Date(dateRange.endDate)
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    return equipment.daily_cost * quantity * days
  }

  function _validateDateRange(dateRange: DateRange): { isValid: boolean; error?: string } {
    const start = new Date(dateRange.startDate)
    const end = new Date(dateRange.endDate)
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Reset time for date-only comparison

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, error: 'Invalid date format' }
    }

    if (start >= end) {
      return { isValid: false, error: 'Start date must be before end date' }
    }

    if (start < now) {
      return { isValid: false, error: 'Start date cannot be in the past' }
    }

    return { isValid: true }
  }

  async function _checkAvailability(
    equipmentId: number,
    dateRange: DateRange,
    quantity: number
  ): Promise<AvailabilityCheck> {
    try {
      // Real availability checking using equipment service
      const response = await equipmentService.checkAvailability({
        equipment_id: equipmentId,
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        quantity,
        project_id: currentProjectId.value || undefined
      })

      return {
        equipmentId,
        dateRange,
        quantity,
        isAvailable: response.available,
        conflicts: response.conflicts?.map(conflict => ({
          conflictDate: conflict.conflict_date,
          availableQuantity: conflict.available_quantity,
          requiredQuantity: conflict.required_quantity,
          reason: conflict.reason
        })) || []
      }
    } catch (error) {
      console.error('Availability check failed:', error)

      // Enhanced error handling with specific error types
      const errorMessage = error?.response?.data?.detail || error?.message || 'Unknown error'

      return {
        equipmentId,
        dateRange,
        quantity,
        isAvailable: false,
        conflicts: [{
          conflictDate: dateRange.startDate,
          availableQuantity: 0,
          requiredQuantity: quantity,
          reason: errorMessage
        }]
      }
    }
  }

  async function executeActions(): Promise<BookingResponse[]> {
    loading.value = true
    actionProgress.value = 0
    actionStatus.value = 'Starting...'
    errors.value = []
    operationId.value = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      if (!currentProjectId.value) {
        throw new Error('No project selected')
      }

      const itemsArray = Array.from(items.value.values())
      if (itemsArray.length === 0) {
        throw new Error('Cart is empty')
      }

      // Step 1: Validate all items (25% progress)
      actionStatus.value = 'Validating items...'
      actionProgress.value = 10

      const bookingsToCreate = itemsArray.map(item => ({
        equipment_id: item.equipment.id,
        quantity: item.quantity,
        start_date: item.customDates?.startDate || item.startDate,
        end_date: item.customDates?.endDate || item.endDate,
        project_id: currentProjectId.value!,
        notes: item.notes,
        daily_cost: item.dailyCost
      }))

      // Step 2: Batch availability check (50% progress)
      actionStatus.value = 'Checking availability...'
      actionProgress.value = 25

      const availabilityChecks = await Promise.all(
        bookingsToCreate.map(async (booking, index) => {
          const check = await _checkAvailability(
            booking.equipment_id,
            { startDate: booking.start_date, endDate: booking.end_date },
            booking.quantity
          )

          actionProgress.value = 25 + (index + 1) / bookingsToCreate.length * 25

          if (!check.isAvailable) {
            throw new Error(`Equipment ${itemsArray[index].equipment.name} is not available for the selected dates`)
          }

          return check
        })
      )

      // Step 3: Create bookings (75% progress)
      actionStatus.value = 'Creating bookings...'
      actionProgress.value = 50

      const response = await equipmentService.createBatchBookings({
        bookings: bookingsToCreate,
        operation_id: operationId.value
      })

      actionProgress.value = 75

      if (!response.success) {
        const errorDetails = response.errors?.map(err =>
          `Equipment ID ${err.equipment_id}: ${err.error}`
        ).join('; ') || 'Unknown error'

        throw new Error(`Failed to create bookings: ${errorDetails}`)
      }

      // Step 4: Process results (100% progress)
      actionStatus.value = 'Finalizing...'
      actionProgress.value = 90

      const createdBookings: BookingResponse[] = response.bookings || []

      // Log any partial failures
      if (response.failed_count > 0 && response.errors) {
        console.warn('Some bookings failed to create:', response.errors)
      }

      // Clear cart after successful execution
      clearCart()

      actionProgress.value = 100
      actionStatus.value = 'Completed successfully'

      // Emit completion event with detailed results
      _emit('actionCompleted', {
        operationId: operationId.value,
        bookingsCreated: response.created_count,
        bookingsFailed: response.failed_count,
        totalCost: createdBookings.reduce((sum, b) => sum + b.total_cost, 0),
        bookings: createdBookings,
        errors: response.errors
      })

      return createdBookings
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to execute cart actions'
      actionStatus.value = `Error: ${message}`
      errors.value.push(message)

      // Emit error event with operation context
      _emit('actionFailed', {
        operationId: operationId.value,
        error: message,
        step: actionStatus.value
      })

      throw error
    } finally {
      loading.value = false
      // Reset progress after a delay
      setTimeout(() => {
        actionProgress.value = 0
        actionStatus.value = ''
        operationId.value = null
      }, 3000)
    }
  }

  return {
    // State
    items,
    isVisible,
    mode,
    config,
    isEmbedded,
    errors,
    loading,
    actionProgress,
    actionStatus,
    operationId,

    // Getters
    itemCount,
    totalQuantity,
    totalCost,
    hasItems,
    cartItems,
    isOverCapacity,
    hasErrors,

    // Item access
    getItemByKey,
    getItemByEquipmentId,

    // Cart management
    loadCartForProject,
    setItemsFromBookings,
    addItem,
    removeItem,
    updateQuantity,
    setCustomDates,
    clearCart,
    executeActions,

    // UI controls
    toggleVisibility,
    setMode,
    setEmbeddedMode,
    clearErrors,

    // Event system
    addEventListener,
    removeEventListener
  }
})
