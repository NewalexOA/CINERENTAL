import { httpClient } from './http-client'
import type { EquipmentStatus } from '@/types/equipment'

export interface DashboardStats {
  totalEquipment: number
  activeRentals: number
  availableEquipment: number
  rentedEquipment: number
  maintenanceEquipment: number
  brokenEquipment: number
}

export interface RecentActivity {
  id: number
  description: string
  timestamp: Date
}

export class DashboardService {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Get equipment counts by status
      const [available, rented, maintenance, broken] = await Promise.all([
        this.getEquipmentCountByStatus('AVAILABLE'),
        this.getEquipmentCountByStatus('RENTED'),
        this.getEquipmentCountByStatus('MAINTENANCE'),
        this.getEquipmentCountByStatus('BROKEN'),
      ])

      const totalEquipment = available + rented + maintenance + broken
      const activeRentals = rented // Simplified - could be more complex

      return {
        totalEquipment,
        activeRentals,
        availableEquipment: available,
        rentedEquipment: rented,
        maintenanceEquipment: maintenance,
        brokenEquipment: broken,
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      // Return default values on error
      return {
        totalEquipment: 0,
        activeRentals: 0,
        availableEquipment: 0,
        rentedEquipment: 0,
        maintenanceEquipment: 0,
        brokenEquipment: 0,
      }
    }
  }

  private async getEquipmentCountByStatus(status: EquipmentStatus): Promise<number> {
    try {
      const response = await httpClient.get(`/equipment/paginated?status=${status}&size=1`)
      return response.total || 0
    } catch (error) {
      console.warn(`Failed to get count for status ${status}:`, error)
      return 0
    }
  }

  async getRecentActivity(): Promise<RecentActivity[]> {
    // For now, return mock data. In the future, this could call a real activity log endpoint
    return [
      {
        id: 1,
        description: 'Equipment returned by client',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        id: 2,
        description: 'New booking created',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        id: 3,
        description: 'Equipment sent for maintenance',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      },
    ]
  }
}

export const dashboardService = new DashboardService()
