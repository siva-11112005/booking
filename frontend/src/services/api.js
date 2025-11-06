import axios from 'axios';

// In production, use relative URLs (same domain)
// In development, use localhost:5000
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

console.log('API URL:', API_URL);
console.log('Environment:', process.env.NODE_ENV);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const sendOTP = (data) => api.post('/auth/send-otp', data);
export const verifyOTP = (data) => api.post('/auth/verify-otp', data);
export const login = (data) => api.post('/auth/login', data);
export const forgotPassword = (phone) => api.post('/auth/forgot-password', { phone });
export const resetPassword = (data) => api.post('/auth/reset-password', data);
export const getCurrentUser = () => api.get('/auth/me');

// Appointment APIs
export const getAvailableSlots = (date) => api.get(`/appointments/slots/${date}`);
export const bookAppointment = (data) => api.post('/appointments/book', data);
export const getMyAppointments = () => api.get('/appointments/my-appointments');
export const cancelAppointment = (id) => api.delete(`/appointments/${id}`);

// Admin APIs
export const getAllAppointments = (params) => api.get('/admin/appointments', { params });
export const updateAppointmentStatus = (id, data) => api.patch(`/admin/appointments/${id}`, data);
export const getAllUsers = () => api.get('/admin/users');
export const blockUser = (id, isBlocked) => api.patch(`/admin/users/${id}/block`, { isBlocked });
export const getAdminStats = () => api.get('/admin/stats');

export default api;