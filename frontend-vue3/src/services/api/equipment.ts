import { httpClient } from './http-client'
import type { EquipmentResponse } from '@/types/equipment'
import type { AvailabilityCheck, DateRange, BookingResponse } from '@/types/cart'

export interface AvailabilityRequest {
  equipment_id: number
  start_date: string
  end_date: string
  quantity: number
  project_id?: number
}

export interface AvailabilityResponse {
  available: boolean
  available_quantity: number
  conflicts?: Array<{
    conflict_date: string
    available_quantity: number
    required_quantity: number
    booking_id?: number
    reason?: string
  }>
}

export interface BatchBookingRequest {
  bookings: Array<{
    equipment_id: number
    quantity: number
    start_date: string
    end_date: string
    project_id: number
    notes?: string
    daily_cost: number
  }>
  operation_id?: string
}

export interface BatchBookingResponse {
  success: boolean
  created_count: number
  failed_count: number
  bookings: BookingResponse[]
  errors?: Array<{
    equipment_id: number
    error: string
  }>
}

class EquipmentService {
  /**
   * Check availability for a single equipment item
   */
  async checkAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
    try {
      const response = await httpClient.post<AvailabilityResponse>(
        '/equipment/check-availability',
        request
      )
      return response
    } catch (error) {
      console.error('Availability check failed:', error)
      throw error
    }
  }

  /**
   * Check availability for multiple equipment items in batch
   */
  async checkBatchAvailability(requests: AvailabilityRequest[]): Promise<AvailabilityResponse[]> {
    try {
      const response = await httpClient.post<AvailabilityResponse[]>(
        '/equipment/batch-availability',
        { requests }
      )
      return response
    } catch (error) {
      console.error('Batch availability check failed:', error)
      throw error
    }
  }

  /**
   * Create multiple bookings in a single transaction
   */
  async createBatchBookings(request: BatchBookingRequest): Promise<BatchBookingResponse> {
    try {
      const response = await httpClient.post<BatchBookingResponse>(
        '/bookings/batch',
        request
      )
      return response
    } catch (error) {
      console.error('Batch booking creation failed:', error)
      throw error
    }
  }

  /**
   * Get equipment by barcode for scanner integration
   */
  async getEquipmentByBarcode(barcode: string): Promise<EquipmentResponse | null> {
    try {
      const response = await httpClient.get<EquipmentResponse>(
        `/equipment/barcode/${barcode}`
      )
      return response
    } catch (error) {
      // If it's a 404, equipment not found is not an error condition
      if (error.response?.status === 404) {
        return null
      }
      console.error('Equipment lookup by barcode failed:', error)
      throw error
    }
  }

  /**
   * Search equipment with filters for cart integration
   */
  async searchEquipment(params: {
    query?: string
    category_id?: number
    status?: string
    available_from?: string
    available_to?: string
    page?: number
    size?: number
  }): Promise<{
    items: EquipmentResponse[]
    total: number
    page: number
    size: number
    pages: number
  }> {
    try {
      const queryParams = new URLSearchParams()

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.set(key, value.toString())
        }
      })

      const response = await httpClient.get<{
        items: EquipmentResponse[]
        total: number
        page: number
        size: number
        pages: number
      }>(`/equipment/search?${queryParams.toString()}`)

      return response
    } catch (error) {
      console.error('Equipment search failed:', error)
      throw error
    }
  }

  /**
   * Get equipment details for cart display
   */
  async getEquipmentById(id: number): Promise<EquipmentResponse> {
    try {
      const response = await httpClient.get<EquipmentResponse>(`/equipment/${id}`)
      return response
    } catch (error) {
      console.error('Equipment lookup failed:', error)
      throw error
    }
  }

  /**
   * Calculate rental cost for date range and quantity
   */
  calculateRentalCost(
    dailyRate: number,
    quantity: number,
    startDate: string,
    endDate: string
  ): { days: number; totalCost: number; dailyCost: number } {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Calculate days (minimum 1 day)
    const timeDiff = end.getTime() - start.getTime()
    const days = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)))

    const dailyCost = dailyRate * quantity
    const totalCost = dailyCost * days

    return {
      days,
      totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
      dailyCost: Math.round(dailyCost * 100) / 100
    }
  }
}

export const equipmentService = new EquipmentService()
