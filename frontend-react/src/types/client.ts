export enum ClientStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked'
}

export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: ClientStatus | string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  bookings_count?: number; // Added field
}

export interface ClientCreate {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: ClientStatus;
  notes?: string;
}

export type ClientUpdate = Partial<ClientCreate>;
