import axios, { InternalAxiosRequestConfig } from 'axios';
import {
  getAccessToken,
  setAccessToken,
  getIsRefreshing,
  setIsRefreshing,
  enqueueFailedRequest,
  processQueue,
  refreshToken,
} from './auth';
import { handleApiError } from './error-handler';

// Extend AxiosRequestConfig to include _retry flag
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

/**
 * Axios instance configured for the CobCom - CRM API.
 * - baseURL from environment variable
 * - withCredentials: true (sends refresh token cookie automatically)
 * - 30s timeout
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 30000,
});

// --- Request Interceptor ---
// Adds Authorization Bearer header and X-Requested-With for CSRF protection.
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Response Interceptor ---
// Implements refresh queue pattern for 401 and handles 403 "Password reset required".
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;

    // Handle 401 — attempt token refresh
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (getIsRefreshing()) {
        // Another refresh is already in progress — queue this request
        return new Promise<string>((resolve, reject) => {
          enqueueFailedRequest({ resolve, reject });
        }).then((newToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      setIsRefreshing(true);

      try {
        const newToken = await refreshToken();
        setAccessToken(newToken);
        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        // Redirect to login — session expired
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        setIsRefreshing(false);
      }
    }

    // Handle 403 with "Password reset required" — redirect to /change-password
    if (
      error.response?.status === 403 &&
      error.response?.data?.message?.includes('Password reset required')
    ) {
      window.location.href = '/change-password';
      return Promise.reject(error);
    }

    // For all other errors, delegate to the generic error handler
    handleApiError(error);

    return Promise.reject(error);
  },
);

export default api;
