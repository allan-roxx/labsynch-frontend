/**
 * Axios instance pre-configured for the LabSynch backend.
 *
 * Responsibilities:
 * - Attach Authorization header from localStorage token on every request.
 * - Unwrap the standard { success, message, data, errors } envelope on success.
 * - On 401, attempt a single token refresh before retrying the original request.
 * - On refresh failure, clear auth state and redirect to /login.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ──────────────────────────────────
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: unwrap envelope + handle 401 ───────────────────────
let isRefreshing = false;
let refreshQueue = []; // queued requests waiting for the new token

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

client.interceptors.response.use(
  (response) => {
    // Unwrap the standard envelope → callers receive response.data directly
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue this request until the ongoing refresh finishes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        });
      }

      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        _clearAuthAndRedirect();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        // Token refresh endpoint returns { access } (SimpleJWT default)
        const newAccess = res.data?.access ?? res.data?.data?.access;
        localStorage.setItem('access_token', newAccess);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        _clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For non-401 errors, re-throw the backend error envelope so callers can
    // read error.errors / error.message directly.
    return Promise.reject(error.response?.data ?? error);
  }
);

function _clearAuthAndRedirect() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
}

export default client;
