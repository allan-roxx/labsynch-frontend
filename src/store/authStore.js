/**
 * Zustand auth store.
 * Persists tokens to localStorage and exposes auth actions consumed 
 * throughout the app.
 */

import { create } from 'zustand';
import { authApi, usersApi } from '../api/endpoints';

const useAuthStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  user: null,           // UserRead object from /api/users/me/
  accessToken: localStorage.getItem('access_token') ?? null,
  refreshToken: localStorage.getItem('refresh_token') ?? null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  error: null,

  // ── Computed helpers ───────────────────────────────────────────────────────
  isAdmin: () => get().user?.role === 'ADMIN',
  isSchool: () => get().user?.role === 'SCHOOL',

  // ── Actions ────────────────────────────────────────────────────────────────
  /**
   * Log in and fetch the current user.
   * Returns { success, data, errors } for the calling form to consume.
   */
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login({ email, password });
      const { access, refresh } = res.data.tokens;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });

      // Fetch full user object
      await get().fetchMe();
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false, error: err });
      return { success: false, errors: err?.errors, message: err?.message };
    }
  },

  /** Fetch the current user's profile from /api/users/me/ */
  fetchMe: async () => {
    try {
      const res = await usersApi.me();
      set({ user: res.data });
    } catch {
      // Silently fail — the 401 interceptor will redirect if needed
    }
  },

  /** Log out: blacklist the refresh token, then clear local state. */
  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, error: null });
  },

  /** Clear non-critical error state. */
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
