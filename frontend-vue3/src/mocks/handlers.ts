import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/v1/projects/paginated', () => {
    return HttpResponse.json({
      items: [
        { id: 1, name: 'Test Project 1', client_name: 'Client A', status: 'In Progress' },
        { id: 2, name: 'Test Project 2', client_name: 'Client B', status: 'Completed' },
      ],
      total: 2,
      pages: 1,
    })
  }),
]
