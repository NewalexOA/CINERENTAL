import api from '../lib/axios';
import { Equipment, EquipmentCreate, EquipmentUpdate, EquipmentStatus } from '@/types/equipment';
import { Booking } from './bookings';

export interface EquipmentSearchParams {
  page?: number;
  size?: number;
  status?: EquipmentStatus;
  category_id?: number;
  query?: string;
  include_deleted?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface AvailabilityResponse {
  is_available: boolean;
  equipment_status: EquipmentStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conflicts?: any[];
  message?: string;
}

export const equipmentService = {
  getPaginated: async (params: EquipmentSearchParams) => {
    const response = await api.get<PaginatedResponse<Equipment>>('/equipment/paginated', { params });
    return response.data;
  },

  getAll: async (params?: Partial<EquipmentSearchParams>) => {
    const response = await api.get<Equipment[]>('/equipment/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Equipment>(`/equipment/${id}`);
    return response.data;
  },

  getByBarcode: async (barcode: string) => {
    const response = await api.get<Equipment>(`/equipment/barcode/${barcode}`);
    return response.data;
  },

  checkAvailability: async (id: number, start: string, end: string) => {
    const response = await api.get<AvailabilityResponse>(`/equipment/${id}/availability`, {
      params: { start_date: start, end_date: end }
    });
    return response.data;
  },

  create: async (data: EquipmentCreate) => {
    const response = await api.post<Equipment>('/equipment/', data);
    return response.data;
  },

  update: async (id: number, data: EquipmentUpdate) => {
    const response = await api.put<Equipment>(`/equipment/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: number, status: EquipmentStatus) => {
    const response = await api.put<Equipment>(`/equipment/${id}/status`, null, { params: { status } });
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/equipment/${id}`);
  },

  getBookings: async (id: number) => {
    const response = await api.get<Booking[]>(`/equipment/${id}/bookings`);
    return response.data;
  },

  updateNotes: async (id: number, notes: string) => {
    const response = await api.patch<Equipment>(`/equipment/${id}/notes`, { notes });
    return response.data;
  },

  regenerateBarcode: async (id: number) => {
    const response = await api.post<Equipment>(`/equipment/${id}/regenerate-barcode`);
    return response.data;
  }
};
