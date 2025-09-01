export interface ValidationError {
  loc: string[]
  msg: string
  type: string
}

export class ApiError extends Error {
  public status: number
  public data?: any

  constructor(message: string, status: number = 500, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }

  get isValidationError(): boolean {
    return Array.isArray(this.data?.detail)
  }

  get validationErrors(): ValidationError[] {
    return this.isValidationError ? this.data.detail : []
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message)
    this.name = 'NetworkError'
  }
}
