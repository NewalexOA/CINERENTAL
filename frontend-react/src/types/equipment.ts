import { Category } from './category';

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  RENTED = 'RENTED',
  MAINTENANCE = 'MAINTENANCE',
  BROKEN = 'BROKEN',
  RETIRED = 'RETIRED'
}

export type RentalStatus = 'available' | 'on-project' | 'unavailable';

export interface ActiveProject {
  id: number;
  name: string;
  dates: string;
  start_date: string;
  end_date: string;
}

export interface Equipment {
  id: number;
  name: string;
  description?: string;
  serial_number?: string;
  barcode: string;
  category_id: number;
  status: EquipmentStatus;
  replacement_cost: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Relationships
  category?: Category;
  category_name?: string;
  // Rental status (computed by backend)
  active_projects?: ActiveProject[];
  rental_status?: RentalStatus;
  rental_status_display?: string;
  is_available?: boolean;
}

export interface EquipmentCreate {
  name: string;
  description?: string;
  serial_number?: string;
  barcode?: string; // Optional, backend auto-generates if missing
  category_id: number;
  status?: EquipmentStatus;
  replacement_cost: number;
  notes?: string;
}

export type EquipmentUpdate = Partial<EquipmentCreate> & {
  id: number;
};
