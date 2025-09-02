import { computed, ref, nextTick } from 'vue'
import { useCartStore } from '@/stores/cart'
import { equipmentService } from '@/services/api/equipment'
import { useScanner } from './useScanner'
import type { EquipmentResponse } from '@/types/equipment'
import type { CartItem } from '@/types/cart'

export interface CartIntegrationOptions {
  projectId?: number
  mode?: 'equipment_add' | 'equipment_remove' | 'booking_edit'
  autoShowOnAdd?: boolean
  enableScanner?: boolean
  maxItems?: number
}

/**
 * Advanced cart integration composable with barcode scanning,
 * equipment search integration, and sophisticated business logic
 */
export function useCartIntegration(options: CartIntegrationOptions = {}) {
  const cartStore = useCartStore()
  const isProcessing = ref(false)
  const lastError = ref<string | null>(null)

  // Scanner integration
  const scanner = options.enableScanner ? useScanner({
    onScan: handleBarcodeScanned,
    autoStart: true
  }) : null

  // Initialize cart with project context
  const initializeCart = async (projectId: number) => {
    try {
      await cartStore.loadCartForProject(projectId)
      cartStore.setMode(options.mode || 'equipment_add')
      cartStore.setEmbeddedMode(document.getElementById('universalCartContainer') !== null)
    } catch (error) {
      console.error('Failed to initialize cart:', error)
      lastError.value = error instanceof Error ? error.message : 'Failed to initialize cart'
    }
  }

  // Enhanced equipment addition with availability checking
  const addEquipmentToCart = async (
    equipment: EquipmentResponse,
    quantity: number = 1,
    customDates?: { startDate: string; endDate: string }
  ): Promise<{ success: boolean; message: string }> => {
    try {
      isProcessing.value = true
      lastError.value = null

      // Calculate costs using the service
      const startDate = customDates?.startDate || new Date().toISOString().split('T')[0]
      const endDate = customDates?.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const costCalc = equipmentService.calculateRentalCost(
        equipment.daily_cost || 0,
        quantity,
        startDate,
        endDate
      )

      // Create cart item
      const cartItem: Omit<CartItem, 'totalCost'> = {
        equipment,
        quantity,
        startDate,
        endDate,
        dailyCost: costCalc.dailyCost,
        notes: '',
        customDates: customDates ? {
          startDate: customDates.startDate,
          endDate: customDates.endDate
        } : undefined,
        projectContext: options.projectId ? {
          projectId: options.projectId,
          projectName: 'Current Project' // This should come from project store
        } : undefined
      }

      // Add to cart with validation
      const result = await cartStore.addItem(cartItem)

      if (result.success) {
        return {
          success: true,
          message: `${equipment.name} added to cart`
        }
      } else {
        return {
          success: false,
          message: result.message
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add equipment'
      lastError.value = message
      return {
        success: false,
        message
      }
    } finally {
      isProcessing.value = false
    }
  }

  // Barcode scanning integration
  const handleBarcodeScanned = async (barcode: string): Promise<void> => {
    try {
      isProcessing.value = true
      lastError.value = null

      // Look up equipment by barcode
      const equipment = await equipmentService.getEquipmentByBarcode(barcode)

      if (!equipment) {
        throw new Error(`Equipment with barcode ${barcode} not found`)
      }

      // Check if equipment is available
      if (equipment.status !== 'AVAILABLE') {
        throw new Error(`Equipment ${equipment.name} is not available (Status: ${equipment.status})`)
      }

      // Add to cart
      const result = await addEquipmentToCart(equipment, 1)

      if (!result.success) {
        throw new Error(result.message)
      }

      // Success notification could be handled here
      console.log(`Scanned and added: ${equipment.name}`)

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Barcode scan failed'
      lastError.value = message
      console.error('Barcode scan error:', message)
    } finally {
      isProcessing.value = false
    }
  }

  // Bulk equipment search and addition
  const searchAndAddEquipment = async (searchQuery: string): Promise<{
    results: EquipmentResponse[]
    added: number
    errors: string[]
  }> => {
    try {
      isProcessing.value = true
      lastError.value = null

      // Search equipment
      const searchResults = await equipmentService.searchEquipment({
        query: searchQuery,
        status: 'AVAILABLE',
        page: 1,
        size: 20
      })

      let addedCount = 0
      const errors: string[] = []

      // Add available equipment to cart
      for (const equipment of searchResults.items) {
        try {
          const result = await addEquipmentToCart(equipment, 1)
          if (result.success) {
            addedCount++
          } else {
            errors.push(`${equipment.name}: ${result.message}`)
          }
        } catch (error) {
          errors.push(`${equipment.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        results: searchResults.items,
        added: addedCount,
        errors
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed'
      lastError.value = message
      return {
        results: [],
        added: 0,
        errors: [message]
      }
    } finally {
      isProcessing.value = false
    }
  }

  // Execute cart actions with progress tracking
  const executeCartActions = async (): Promise<{
    success: boolean
    bookingsCreated: number
    message: string
  }> => {
    try {
      const bookings = await cartStore.executeActions()

      return {
        success: true,
        bookingsCreated: bookings.length,
        message: `Successfully created ${bookings.length} bookings`
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to execute cart actions'
      lastError.value = message
      return {
        success: false,
        bookingsCreated: 0,
        message
      }
    }
  }

  // Reactive state
  const cartState = computed(() => ({
    itemCount: cartStore.itemCount,
    totalQuantity: cartStore.totalQuantity,
    totalCost: cartStore.totalCost,
    hasItems: cartStore.hasItems,
    isVisible: cartStore.isVisible,
    isLoading: cartStore.loading || isProcessing.value,
    actionProgress: cartStore.actionProgress,
    actionStatus: cartStore.actionStatus,
    errors: [...cartStore.errors, ...(lastError.value ? [lastError.value] : [])]
  }))

  // Cart control methods
  const showCart = () => cartStore.toggleVisibility()
  const hideCart = () => { cartStore.isVisible = false }
  const clearCart = () => cartStore.clearCart()
  const clearErrors = () => {
    cartStore.clearErrors()
    lastError.value = null
  }

  // Scanner control methods
  const startScanner = () => scanner?.start()
  const stopScanner = () => scanner?.stop()

  return {
    // State
    cartState,
    isProcessing,
    lastError,

    // Cart management
    initializeCart,
    addEquipmentToCart,
    executeCartActions,
    clearCart,
    clearErrors,
    showCart,
    hideCart,

    // Equipment integration
    searchAndAddEquipment,
    handleBarcodeScanned,

    // Scanner integration
    scanner: scanner ? {
      isActive: scanner.isActive,
      start: startScanner,
      stop: stopScanner,
      lastScan: scanner.lastScan
    } : null,

    // Store access for advanced usage
    cartStore
  }
}
