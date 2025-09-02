export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  MAINTENANCE = 'MAINTENANCE',
  BROKEN = 'BROKEN',
  RETIRED = 'RETIRED',
}

export interface CategoryInfo {
  id: number
  name: string
}

export interface EquipmentResponse {
  id: number
  name: string
  description?: string
  replacement_cost?: number
  barcode: string
  serial_number?: string
  category_id: number
  status: EquipmentStatus
  created_at: string
  updated_at: string
  notes?: string
  category_name: string
  category?: CategoryInfo
  active_projects: Array<{
    id: number
    name: string
    start_date: string
    end_date: string
  }>
  daily_cost: number // computed field
  image_url?: string // equipment image
  quantity?: number // for non-serialized items
  purchase_date?: string // purchase date
}
