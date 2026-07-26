import api from '../lib/axios';
import { Project, ProjectCreate, ProjectUpdate, ProjectPaymentStatus } from '@/types/project';

export interface ProjectSearchParams {
  page?: number;
  size?: number;
  project_status?: string;
  payment_status?: string;
  client_id?: number;
  query?: string;
  start_date?: string;
  end_date?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const projectsService = {
  getPaginated: async (params: ProjectSearchParams) => {
    const response = await api.get<PaginatedResponse<Project>>('/projects/paginated', { params });
    return response.data;
  },

  getAll: async () => {
    const response = await api.get<Project[]>('/projects/');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  },

  create: async (data: ProjectCreate) => {
    const response = await api.post<Project>('/projects/', data);
    return response.data;
  },

  update: async (id: number, data: ProjectUpdate) => {
    const response = await api.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/projects/${id}`);
  },

  updatePaymentStatus: async (id: number, paymentStatus: ProjectPaymentStatus, captchaCode: string) => {
    const response = await api.patch<Project>(`/projects/${id}/payment-status`, {
      payment_status: paymentStatus,
      captcha_code: captchaCode
    });
    return response.data;
  }
};
