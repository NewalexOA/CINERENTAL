import { httpClient } from './http-client'

export interface ClientData {
  id: number
  name: string
  email?: string
  phone?: string
  company?: string
  notes?: string
  status: string
  created_at: string
  updated_at: string
  bookings_count: number
}

export interface ClientCreateData {
  name: string
  email?: string
  phone?: string
  company?: string
  notes?: string
}

export interface ClientUpdateData {
  name?: string
  email?: string
  phone?: string
  company?: string
  notes?: string
  status?: string
}

export interface BookingData {
  id: number
  equipment_id: number
  client_id: number
  project_id: number
  start_date: string
  end_date: string
  booking_status: string
  payment_status: string
  total_amount: number
  equipment_name: string
  client_name: string
  project_name?: string
  created_at: string
  updated_at: string
  quantity: number
}

export class ClientsService {
  async getClients(params: {
    skip?: number
    limit?: number
    query?: string
    sort_by?: string
    sort_order?: string
  } = {}): Promise<ClientData[]> {
    const searchParams = new URLSearchParams()

    if (params.skip !== undefined) searchParams.set('skip', params.skip.toString())
    if (params.limit !== undefined) searchParams.set('limit', params.limit.toString())
    if (params.query) searchParams.set('query', params.query)
    if (params.sort_by) searchParams.set('sort_by', params.sort_by)
    if (params.sort_order) searchParams.set('sort_order', params.sort_order)

    const response = await httpClient.get(`/clients/?${searchParams.toString()}`)
    return response
  }

  async getClient(clientId: number): Promise<ClientData> {
    const response = await httpClient.get(`/clients/${clientId}/`)
    return response
  }

  async createClient(clientData: ClientCreateData): Promise<ClientData> {
    const response = await httpClient.post('/clients/', clientData)
    return response
  }

  async updateClient(clientId: number, clientData: ClientUpdateData): Promise<ClientData> {
    const response = await httpClient.put(`/clients/${clientId}/`, clientData)
    return response
  }

  async deleteClient(clientId: number): Promise<void> {
    await httpClient.delete(`/clients/${clientId}/`)
  }

  async getClientBookings(clientId: number, params: {
    skip?: number
    limit?: number
    status?: string
  } = {}): Promise<BookingData[]> {
    const searchParams = new URLSearchParams()

    if (params.skip !== undefined) searchParams.set('skip', params.skip.toString())
    if (params.limit !== undefined) searchParams.set('limit', params.limit.toString())
    if (params.status) searchParams.set('status', params.status)

    const response = await httpClient.get(`/clients/${clientId}/bookings/?${searchParams.toString()}`)
    return response
  }
}

export const clientsService = new ClientsService()
