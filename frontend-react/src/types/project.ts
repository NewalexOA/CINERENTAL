import { Client } from './client';

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  client_id: number;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Relations
  client?: Client;
}

export interface ProjectCreate {
  name: string;
  client_id: number;
  start_date: string;
  end_date: string;
  description?: string;
  status?: ProjectStatus;
  notes?: string;
}

export type ProjectUpdate = Partial<ProjectCreate> & {
  id: number;
};
