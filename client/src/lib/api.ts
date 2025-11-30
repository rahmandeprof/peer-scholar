import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL:
    (
      (import.meta.env.VITE_API_URL as string | undefined) ??
      'https://peerscholar.onrender.com/v1'
    )
      .replace(/\/+$/, '')
      .replace(/\/v1$/, '') + '/v1',
  withCredentials: true,
  timeout: 30000, // 30 seconds
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(
      error instanceof Error ? error : new Error(String(error)),
    );
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle specific error cases
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;

      if (status === 401) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }

      const data = error.response.data as {
        message?: string;
        errors?: unknown;
      };

      // Error logging removed for production
      // Errors are returned to caller for handling

      // Return structured error
      return Promise.reject(
        new Error(
          JSON.stringify({
            message: data.message ?? 'An error occurred',
            status,
            errors: data.errors,
          }),
        ),
      );
    } else if (error.request) {
      // Request made but no response
      return Promise.reject(
        new Error(
          JSON.stringify({
            message: 'No response from server. Please check your connection.',
            status: 0,
          }),
        ),
      );
    }

    // Error in request setup
    return Promise.reject(
      new Error(
        JSON.stringify({
          message: error.message || 'An unexpected error occurred',
          status: 0,
        }),
      ),
    );
  },
);

export default api;
