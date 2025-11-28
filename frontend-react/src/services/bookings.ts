import api from '../lib/axios';

export interface Booking {
  id: number;
  project_id: number;
  equipment_id: number;
  start_date: string;
  end_date: string;
  quantity: number;
  equipment?: {
    name: string;
    barcode: string;
    category_name?: string;
    serial_number?: string;
    replacement_cost: number;
  };
}

export interface BookingCreate {
  project_id: number;
  client_id: number; // Added
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
}

export const bookingsService = {
  create: async (data: BookingCreate) => {
    const response = await api.post<Booking>('/bookings', data);
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
