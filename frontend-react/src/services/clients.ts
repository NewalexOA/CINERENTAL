import api from '../lib/axios';
import { Client, ClientCreate, ClientUpdate } from '@/types/client';

export interface ClientSearchParams {
  query?: string;
  limit?: number;
}

export const clientsService = {
  getAll: async () => {
    // Backend has default limit=100, max=1000. Request all for dropdown filters.
    const response = await api.get<Client[]>('/clients/', { params: { limit: 1000 } });
    return response.data;
  },

  search: async (params: ClientSearchParams) => {
    const response = await api.get<Client[]>('/clients/', {
      params: {
        query: params.query || undefined,
        limit: params.limit || 20,
      }
    });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Client>(`/clients/${id}/`);
    return response.data;
  },

  create: async (data: ClientCreate) => {
    const response = await api.post<Client>('/clients/', data);
    return response.data;
  },

  update: async (id: number, data: ClientUpdate) => {
    const response = await api.patch<Client>(`/clients/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/clients/${id}/`);
  }
};
