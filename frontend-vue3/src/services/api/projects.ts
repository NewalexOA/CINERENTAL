import { httpClient } from './http-client'

export interface ProjectData {
  id: number
  name: string
  client_id: number
  client_name: string
  start_date: string
  end_date: string
  description?: string
  notes?: string
  status: string
  created_at: string
  updated_at: string
}

export interface ProjectWithBookings extends ProjectData {
  bookings: BookingInProject[]
}

export interface BookingInProject {
  id: number
  equipment_id: number
  equipment_name: string
  serial_number?: string
  barcode?: string
  category_name?: string
  start_date: string
  end_date: string
  booking_status: string
  payment_status: string
  quantity: number
  has_different_dates?: boolean
}

export interface ProjectCreateData {
  name: string
  client_id: number
  start_date: string
  end_date: string
  description?: string
  notes?: string
  status?: string
  bookings?: BookingCreateForProject[]
}

export interface BookingCreateForProject {
  equipment_id: number
  start_date: string
  end_date: string
  quantity: number
}

export interface ProjectUpdateData {
  name?: string
  description?: string
  client_id?: number
  start_date?: string
  end_date?: string
  status?: string
  notes?: string
}

export interface ProjectPrintData {
  project: ProjectData
  client: {
    id: number
    name: string
    company: string
    phone?: string
  }
  equipment: {
    id: number
    name: string
    serial_number?: string
    liability_amount: number
    quantity: number
    printable_categories: {
      id: number
      name: string
      level: number
    }[]
    start_date?: string
    end_date?: string
    has_different_dates?: boolean
  }[]
  total_items: number
  total_liability: number
  generated_at: string
  show_dates_column: boolean
}

export interface ProjectBookingResponse {
  id: number
  equipment_id: number
  equipment_name: string
  serial_number?: string
  barcode?: string
  category_name?: string
  category_id?: number
  start_date: string
  end_date: string
  booking_status: string
  payment_status: string
  quantity: number
  has_different_dates: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export class ProjectsService {
  async getProjects(params: {
    limit?: number
    offset?: number
    client_id?: number
    project_status?: string
    start_date?: string
    end_date?: string
    query?: string
  } = {}): Promise<ProjectData[]> {
    const searchParams = new URLSearchParams()

    if (params.limit !== undefined) searchParams.set('limit', params.limit.toString())
    if (params.offset !== undefined) searchParams.set('offset', params.offset.toString())
    if (params.client_id) searchParams.set('client_id', params.client_id.toString())
    if (params.project_status) searchParams.set('project_status', params.project_status)
    if (params.start_date) searchParams.set('start_date', params.start_date)
    if (params.end_date) searchParams.set('end_date', params.end_date)
    if (params.query) searchParams.set('query', params.query)

    const response = await httpClient.get(`/projects/?${searchParams.toString()}`)
    return response
  }

  async getProjectsPaginated(params: {
    page?: number
    size?: number
    client_id?: number
    project_status?: string
    start_date?: string
    end_date?: string
    query?: string
  } = {}): Promise<PaginatedResponse<ProjectData>> {
    const searchParams = new URLSearchParams()

    if (params.page !== undefined) searchParams.set('page', params.page.toString())
    if (params.size !== undefined) searchParams.set('size', params.size.toString())
    if (params.client_id) searchParams.set('client_id', params.client_id.toString())
    if (params.project_status) searchParams.set('project_status', params.project_status)
    if (params.start_date) searchParams.set('start_date', params.start_date)
    if (params.end_date) searchParams.set('end_date', params.end_date)
    if (params.query) searchParams.set('query', params.query)

    const response = await httpClient.get(`/projects/paginated?${searchParams.toString()}`)
    return response
  }

  async getProject(projectId: number): Promise<ProjectWithBookings> {
    const response = await httpClient.get(`/projects/${projectId}`)
    return response
  }

  async createProject(projectData: ProjectCreateData): Promise<ProjectData> {
    const response = await httpClient.post('/projects/', projectData)
    return response
  }

  async updateProject(projectId: number, projectData: ProjectUpdateData): Promise<ProjectData> {
    const response = await httpClient.put(`/projects/${projectId}`, projectData)
    return response
  }

  async deleteProject(projectId: number): Promise<boolean> {
    const response = await httpClient.delete(`/projects/${projectId}`)
    return response
  }

  async getProjectBookings(projectId: number): Promise<any[]> {
    const response = await httpClient.get(`/projects/${projectId}/bookings`)
    return response
  }

  async getProjectBookingsPaginated(projectId: number, params: {
    page?: number
    size?: number
    query?: string
    category_id?: number
    date_filter?: 'all' | 'different' | 'matching'
  } = {}): Promise<PaginatedResponse<ProjectBookingResponse>> {
    const searchParams = new URLSearchParams()

    if (params.page !== undefined) searchParams.set('page', params.page.toString())
    if (params.size !== undefined) searchParams.set('size', params.size.toString())
    if (params.query) searchParams.set('query', params.query)
    if (params.category_id) searchParams.set('category_id', params.category_id.toString())
    if (params.date_filter) searchParams.set('date_filter', params.date_filter)

    const response = await httpClient.get(`/projects/${projectId}/bookings/paginated?${searchParams.toString()}`)
    return response
  }

  async getProjectPrintData(projectId: number): Promise<ProjectPrintData> {
    const response = await httpClient.get(`/projects/${projectId}/print`)
    return response
  }

  async addBookingToProject(projectId: number, bookingId: number): Promise<ProjectWithBookings> {
    const response = await httpClient.post(`/projects/${projectId}/bookings/${bookingId}`)
    return response
  }

  async removeBookingFromProject(projectId: number, bookingId: number): Promise<ProjectWithBookings> {
    const response = await httpClient.delete(`/projects/${projectId}/bookings/${bookingId}`)
    return response
  }
}

export const projectsService = new ProjectsService()
