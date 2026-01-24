import api from '../lib/axios';
import { Category, CategoryCreate, CategoryUpdate } from '@/types/category';

export const categoriesService = {
  getAll: async () => {
    const response = await api.get<Category[]>('/categories/');
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
    const response = await api.get<Category[]>(`/categories/${parentId}/subcategories`);
    return response.data;
  },

  create: async (data: CategoryCreate) => {
    const response = await api.post<Category>('/categories/', data);
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
