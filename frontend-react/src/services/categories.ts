import api from '../lib/axios';
import { Category, CategoryCreate, CategoryUpdate } from '@/types/category';

export const categoriesService = {
  getAll: async () => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },

  getAllWithCount: async () => {
    const response = await api.get<Category[]>('/categories/with-equipment-count');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
  },

  getSubcategories: async (parentId: number) => {
    // Assuming backend supports filter by parent_id
    // If not, we might need to filter client side or use specific endpoint if exists.
    // Based on standard REST:
    const response = await api.get<Category[]>('/categories', { params: { parent_id: parentId } });
    return response.data;
  },

  create: async (data: CategoryCreate) => {
    const response = await api.post<Category>('/categories', data);
    return response.data;
  },

  update: async (id: number, data: CategoryUpdate) => {
    const response = await api.patch<Category>(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  }
};
