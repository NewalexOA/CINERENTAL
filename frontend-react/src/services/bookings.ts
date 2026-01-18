import api from '../lib/axios';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  OVERDUE = 'OVERDUE'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  OVERDUE = 'OVERDUE'
}

export interface Booking {
  id: number;
  project_id: number;
  client_id: number;
  equipment_id: number;
  start_date: string;
  end_date: string;
  quantity: number;
  total_amount: number;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
  // Flat structure fields from backend
  equipment_name: string;
  client_name: string;
  project_name?: string;
  barcode?: string;
  category_name?: string;
  serial_number?: string;
  // Legacy nested structure (deprecated, kept for backwards compatibility)
  equipment?: {
    name: string;
    barcode: string;
    category_name?: string;
    serial_number?: string;
    replacement_cost: number;
  };
}

export interface BookingCreate {
  project_id?: number;
  client_id: number;
  equipment_id: number;
  start_date: string;
  end_date: string;
  quantity?: number;
  total_amount: number;
}

export interface BookingUpdate {
  start_date?: string;
  end_date?: string;
  quantity?: number;
  booking_status?: BookingStatus;
  payment_status?: PaymentStatus;
}

export interface BookingSearchParams {
  page?: number;
  size?: number;
  query?: string;
  equipment_query?: string;
  booking_status?: BookingStatus;
  payment_status?: PaymentStatus;
  start_date?: string;
  end_date?: string;
  active_only?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const bookingsService = {
  getPaginated: async (params: BookingSearchParams) => {
    const response = await api.get<PaginatedResponse<Booking>>('/bookings/', { params });
    return response.data;
  },

  create: async (data: BookingCreate) => {
    const response = await api.post<Booking>('/bookings/', data);
    return response.data;
  },

  createBatch: async (data: BookingCreate[], projectId?: number) => {
    const response = await api.post('/bookings/batch', data, { params: { project_id: projectId } });
    return response.data;
  },

  update: async (id: number, data: BookingUpdate) => {
    const response = await api.put<Booking>(`/bookings/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/bookings/${id}`);
  }
};
