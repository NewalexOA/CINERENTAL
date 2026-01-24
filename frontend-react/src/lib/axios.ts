import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Validation error from backend (FastAPI/Pydantic)
 */
type ValidationError = Array<{
  loc: (string | number)[];
  msg: string;
  type: string;
}>;

/**
 * Possible backend error response formats
 */
type BackendErrorResponse =
  | { detail: string }
  | { detail: ValidationError };

/**
 * Custom API error with extracted message from backend response
 * Preserves original error context for debugging
 */
export class ApiError extends Error {
  status: number;
  code?: string;
  originalError: AxiosError;

  constructor(message: string, status: number, originalError: AxiosError) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = originalError.code;
    this.originalError = originalError;
  }

  get response(): AxiosResponse | undefined {
    return this.originalError.response;
  }

  get request(): unknown {
    return this.originalError.request;
  }

  get config(): AxiosRequestConfig | undefined {
    return this.originalError.config;
  }
}

/**
 * Extract error message from Axios error response
 * Handles both string detail and validation error array from backend
 */
export function extractErrorMessage(error: AxiosError<BackendErrorResponse>): string {
  const detail = error.response?.data?.detail;

  if (!detail) {
    return error.message || 'Неизвестная ошибка';
  }

  // String detail - return as is
  if (typeof detail === 'string') {
    return detail;
  }

  // Validation errors array - format nicely
  if (Array.isArray(detail)) {
    return detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join('; ');
  }

  return 'Неизвестная ошибка';
}

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<BackendErrorResponse>) => {
    const message = extractErrorMessage(error);
    // Use 0 for network errors (no response), not 500 (server error)
    const status = error.response?.status || 0;

    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', { message, status, url: error.config?.url, code: error.code });
    }

    // Reject with ApiError that preserves original error context
    return Promise.reject(new ApiError(message, status, error));
  }
);

export default api;
