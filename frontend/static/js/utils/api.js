/**
 * API client for making HTTP requests
 */

const API_BASE_URL = '/api/v1';

/**
 * API client with methods for making HTTP requests
 */
class ApiClient {
    /**
     * Make GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise<any>} Response data
     */
    async get(endpoint, params = null) {
        const startTime = performance.now();
        let url = endpoint;

        if (params && Object.keys(params).length > 0) {
            const queryString = new URLSearchParams(params).toString();
            url += (url.includes('?') ? '&' : '?') + queryString;
        }

        const finalUrl = url;

        try {
            console.group(`%c[API] GET Request: ${API_BASE_URL}${finalUrl}`, 'color: #2196F3; font-weight: bold;');
            console.log('Time:', new Date().toISOString());

            const response = await fetch(`${API_BASE_URL}${finalUrl}`);
            console.log('Status:', response.status, response.statusText);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                console.error('Error Data:', errorData);
                const error = new Error(errorData.detail || 'Ошибка при получении данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            const data = await response.json();
            const endTime = performance.now();
            console.log('Response Data:', data);
            console.log(`Request took ${(endTime - startTime).toFixed(2)}ms`);
            console.groupEnd();
            return data;
        } catch (error) {
            console.error('Error Details:', error);
            console.groupEnd();
            const errorMessage = error.response?.data?.detail || error.message || 'Ошибка при получении данных';
            throw new Error(errorMessage);
        }
    }

    /**
     * Make POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @returns {Promise<any>} Response data
     */
    async post(endpoint, data) {
        const startTime = performance.now();
        try {
            console.group(`%c[API] POST Request: ${API_BASE_URL}${endpoint}`, 'color: #4CAF50; font-weight: bold;');
            console.log('Time:', new Date().toISOString());
            console.log('Request Data:', data);

            if (data && typeof data === 'object') {
                Object.keys(data).forEach(key => {
                    if (typeof data[key] === 'number' && key.includes('cost')) {
                        data[key] = String(data[key]);
                    }
                });
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            console.log('Status:', response.status, response.statusText);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                console.error('Error Data:', errorData);
                const error = new Error(errorData.detail || 'Ошибка при отправке данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            const responseData = await response.json();
            const endTime = performance.now();
            console.log('Response Data:', responseData);
            console.log(`Request took ${(endTime - startTime).toFixed(2)}ms`);
            console.groupEnd();
            return responseData;
        } catch (error) {
            console.error('Error Data:', error.response?.data);
            let errorMessage = 'Произошла ошибка при выполнении запроса';
            if (error.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    errorMessage = error.response.data.detail.map(err => `${err.loc ? err.loc.join(' -> ') : 'field'}: ${err.msg}`).join('; \n');
                } else if (typeof error.response.data.detail === 'string') {
                    errorMessage = error.response.data.detail;
                } else {
                    errorMessage = JSON.stringify(error.response.data.detail);
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            console.error('User-facing Error Message:', errorMessage);
            console.error('Full Error Object:', error);
            throw new Error(errorMessage);
        }
    }

    /**
     * Make PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @returns {Promise<any>} Response data
     */
    async put(endpoint, data) {
        const startTime = performance.now();
        try {
            console.group(`%c[API] PUT Request: ${API_BASE_URL}${endpoint}`, 'color: #FF9800; font-weight: bold;');
            console.log('Time:', new Date().toISOString());
            console.log('Request Data:', data);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            console.log('Status:', response.status, response.statusText);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                console.error('Error Data:', errorData);
                const error = new Error(errorData.detail || 'Ошибка при обновлении данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            const responseData = await response.json();
            const endTime = performance.now();
            console.log('Response Data:', responseData);
            console.log(`Request took ${(endTime - startTime).toFixed(2)}ms`);
            console.groupEnd();
            return responseData;
        } catch (error) {
            console.error('Error Details:', error);
            console.groupEnd();
            throw error;
        }
    }

    /**
     * Make DELETE request
     * @param {string} endpoint - API endpoint
     * @returns {Promise<boolean>} Success status
     */
    async delete(endpoint) {
        const startTime = performance.now();
        try {
            console.group(`%c[API] DELETE Request: ${API_BASE_URL}${endpoint}`, 'color: #F44336; font-weight: bold;');
            console.log('Time:', new Date().toISOString());

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE'
            });

            console.log('Status:', response.status, response.statusText);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                console.error('Error Data:', errorData);
                const error = new Error(errorData.detail || 'Ошибка при удалении данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            const endTime = performance.now();
            console.log(`Request took ${(endTime - startTime).toFixed(2)}ms`);
            console.groupEnd();
            return true;
        } catch (error) {
            console.error('Error Details:', error);
            console.groupEnd();
            throw error;
        }
    }

    /**
     * Make PATCH request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @returns {Promise<any>} Response data
     */
    async patch(endpoint, data) {
        const startTime = performance.now();
        try {
            console.group(`%c[API] PATCH Request: ${API_BASE_URL}${endpoint}`, 'color: #9C27B0; font-weight: bold;');
            console.log('Time:', new Date().toISOString());
            console.log('Request Data:', data);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            console.log('Status:', response.status, response.statusText);
            console.log('Headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Ошибка сети' }));
                console.error('Error Data:', errorData);
                const error = new Error(errorData.detail || 'Ошибка при частичном обновлении данных');
                error.response = { data: errorData, status: response.status };
                throw error;
            }

            const responseData = await response.json();
            const endTime = performance.now();
            console.log('Response Data:', responseData);
            console.log(`Request took ${(endTime - startTime).toFixed(2)}ms`);
            console.groupEnd();
            return responseData;
        } catch (error) {
            console.error('Error Details:', error);
            console.groupEnd();
            throw error;
        }
    }
}

// Create and export API client instance
export const api = new ApiClient();
