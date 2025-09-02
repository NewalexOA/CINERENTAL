import type { EquipmentResponse } from './equipment'

export interface DateRange {
  startDate: string
  endDate: string
}

export interface CartItem {
  equipment: EquipmentResponse
  quantity: number
  startDate: string
  endDate: string
  notes?: string
  dailyCost: number
  totalCost: number
  customDates?: DateRange
  projectContext?: {
    projectId: number
    projectName: string
  }
}

export interface CartItemKey {
  equipmentId: number
  dateRange: string
  projectContext?: string
}

export type CartMode = 'equipment_add' | 'equipment_remove' | 'booking_edit'

export interface CartConfig {
  type: CartMode
  maxItems: number
  enableStorage: boolean
  autoShowOnAdd: boolean
  projectId?: number
}

export interface CartEventData {
  type: 'itemAdded' | 'itemRemoved' | 'itemUpdated' | 'cartCleared' | 'cartLoaded'
  payload?: any
}

export interface BookingResponse {
  id: number
  equipment_id: number
  quantity: number
  start_date: string
  end_date: string
  project_id: number
  total_cost: number
  status: string
}

export interface CartOperationResult {
  success: boolean
  message: string
  data?: any
  errors?: string[]
}

export interface CartValidationError {
  field: string
  message: string
  code: string
}

export interface AvailabilityCheck {
  equipmentId: number
  dateRange: DateRange
  quantity: number
  isAvailable: boolean
  conflicts?: Array<{
    conflictDate: string
    availableQuantity: number
    requiredQuantity: number
  }>
}
