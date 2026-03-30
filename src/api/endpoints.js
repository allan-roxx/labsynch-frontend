import client from './client';

export const authApi = {
  login: (credentials) => client.post('/api/auth/login/', credentials),
  logout: (refresh) => client.post('/api/auth/logout/', { refresh }),
  register: (data) => client.post('/api/auth/register/', data),
  verifyEmail: (uid, token) => client.post('/api/auth/verify-email/', { uid, token }),
  requestPasswordReset: (email) => client.post('/api/auth/password-reset/', { email }),
  confirmPasswordReset: (uid, token, new_password) =>
    client.post('/api/auth/password-reset-confirm/', { uid, token, new_password }),
  refreshToken: (refresh) => client.post('/api/auth/token/refresh/', { refresh }),
};

export const usersApi = {
  me: () => client.get('/api/users/me/'),
  updateMe: (data) => client.patch('/api/users/me/', data),
  mySchoolProfile: () => client.get('/api/users/me/school-profile/'),
  updateMySchoolProfile: (data) => client.patch('/api/users/me/school-profile/', data),
  changePassword: (data) => client.post('/api/users/change-password/', data),
  list: (params) => client.get('/api/users/', { params }),
  retrieve: (id) => client.get(`/api/users/${id}/`),
};

export const schoolProfilesApi = {
  list: (params) => client.get('/api/school-profiles/', { params }),
  retrieve: (id) => client.get(`/api/school-profiles/${id}/`),
  update: (id, data) => client.patch(`/api/school-profiles/${id}/`, data),
};

export const equipmentCategoriesApi = {
  list: (params) => client.get('/api/equipment-categories/', { params }),
  retrieve: (id) => client.get(`/api/equipment-categories/${id}/`),
  create: (data) => client.post('/api/equipment-categories/', data),
  update: (id, data) => client.patch(`/api/equipment-categories/${id}/`, data),
  delete: (id) => client.delete(`/api/equipment-categories/${id}/`),
};

export const equipmentApi = {
  list: (params) => client.get('/api/equipment/', { params }),
  retrieve: (id) => client.get(`/api/equipment/${id}/`),
  create: (data) => client.post('/api/equipment/', data),
  update: (id, data) => client.patch(`/api/equipment/${id}/`, data),
  delete: (id) => client.delete(`/api/equipment/${id}/`),
  checkAvailability: (id, data) => client.post(`/api/equipment/${id}/availability/`, data),
};

export const bookingsApi = {
  list: (params) => client.get('/api/bookings/', { params }),
  retrieve: (id) => client.get(`/api/bookings/${id}/`),
  create: (data) => client.post('/api/bookings/', data),
  update: (id, data) => client.patch(`/api/bookings/${id}/`, data),
  cancel: (id) => client.post(`/api/bookings/${id}/cancel/`, {}),
};

export const paymentsApi = {
  list: (params) => client.get('/api/payments/', { params }),
  retrieve: (id) => client.get(`/api/payments/${id}/`),
  stkPush: (data) => client.post('/api/payments/mpesa_stk_push/', data),
};

export const issuancesApi = {
  list: (params) => client.get('/api/issuances/', { params }),
  retrieve: (id) => client.get(`/api/issuances/${id}/`),
  create: (data) => client.post('/api/issuances/', data),
};

export const returnsApi = {
  list: (params) => client.get('/api/returns/', { params }),
  retrieve: (id) => client.get(`/api/returns/${id}/`),
  create: (data) => client.post('/api/returns/', data),
};

export const damagesApi = {
  list: (params) => client.get('/api/damages/', { params }),
  retrieve: (id) => client.get(`/api/damages/${id}/`),
  create: (data) => client.post('/api/damages/', data),
  update: (id, data) => client.patch(`/api/damages/${id}/`, data),
  resolve: (id, data) => client.post(`/api/damages/${id}/resolve/`, data),
};

export const maintenanceApi = {
  list: (params) => client.get('/api/maintenance/', { params }),
  retrieve: (id) => client.get(`/api/maintenance/${id}/`),
  create: (data) => client.post('/api/maintenance/', data),
  update: (id, data) => client.patch(`/api/maintenance/${id}/`, data),
  delete: (id) => client.delete(`/api/maintenance/${id}/`),
};

export const pricingRulesApi = {
  list: (params) => client.get('/api/pricing-rules/', { params }),
  retrieve: (id) => client.get(`/api/pricing-rules/${id}/`),
  create: (data) => client.post('/api/pricing-rules/', data),
  update: (id, data) => client.patch(`/api/pricing-rules/${id}/`, data),
  delete: (id) => client.delete(`/api/pricing-rules/${id}/`),
};

export const auditLogsApi = {
  list: (params) => client.get('/api/audit-logs/', { params }),
  retrieve: (id) => client.get(`/api/audit-logs/${id}/`),
};
