import api from '../lib/axios';
import { Client, ClientCreate, ClientUpdate } from '@/types/client';

export const clientsService = {
  getAll: async () => {
    const response = await api.get<Client[]>('/clients');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Client>(`/clients/${id}`);
    return response.data;
  },

  create: async (data: ClientCreate) => {
    const response = await api.post<Client>('/clients', data);
    return response.data;
  },

  update: async (id: number, data: ClientUpdate) => {
    const response = await api.patch<Client>(`/clients/${id}`, data); // using patch for partial updates
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  }
};
