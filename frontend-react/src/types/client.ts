export enum ClientStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked' // Assuming standard statuses, will verify if needed
}

export interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: ClientStatus | string; // Allow string fallback if enum doesn't match exactly
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClientCreate {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: ClientStatus;
  notes?: string;
}

export interface ClientUpdate extends Partial(ClientCreate) {
  id: number;
}
