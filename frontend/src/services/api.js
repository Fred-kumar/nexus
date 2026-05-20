import axios from 'axios';
import { useAuthStore } from '../context/store';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 / token refresh
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { refreshToken, setAuth, user } = useAuthStore.getState();
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data;

        useAuthStore.getState().setAuth(user, newAccess, newRefresh);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshErr) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password }),
  verifyOTP: (otp) => api.post('/auth/verify-otp', { otp }),
};

// ─── Users ────────────────────────────────────────────────────────
export const userAPI = {
  search: (q) => api.get(`/users/search?q=${encodeURIComponent(q)}`),
  getProfile: (username) => api.get(`/users/${username}`),
  updateProfile: (data) => api.put('/users/me/profile', data),
  addContact: (userId) => api.post(`/users/contacts/${userId}`),
  removeContact: (userId) => api.delete(`/users/contacts/${userId}`),
  savePushSubscription: (subscription) => api.post('/users/push-subscription', { subscription }),
  getVapidKey: () => api.get('/notifications/vapid-key'),
};

// ─── Chats ────────────────────────────────────────────────────────
export const chatAPI = {
  getAll: () => api.get('/chats'),
  getOne: (id) => api.get(`/chats/${id}`),
  createDM: (targetUserId) => api.post('/chats/dm', { targetUserId }),
  createGroup: (data) => api.post('/chats/group', data),
  createChannel: (data) => api.post('/chats/channel', data),
  addMembers: (chatId, userIds) => api.post(`/chats/${chatId}/members`, { userIds }),
  removeMember: (chatId, userId) => api.delete(`/chats/${chatId}/members/${userId}`),
  joinByInvite: (link) => api.post(`/chats/join/${link}`),
  pinMessage: (chatId, messageId) => api.put(`/chats/${chatId}/pin-message`, { messageId }),
};

// ─── Messages ─────────────────────────────────────────────────────
export const messageAPI = {
  getMessages: (chatId, params) => api.get(`/messages/${chatId}`, { params }),
  send: (data) => api.post('/messages', data),
  edit: (id, content) => api.put(`/messages/${id}`, { content }),
  delete: (id, forAll = false) => api.delete(`/messages/${id}?forAll=${forAll}`),
  react: (id, emoji) => api.post(`/messages/${id}/react`, { emoji }),
  forward: (id, targetChatIds) => api.post(`/messages/${id}/forward`, { targetChatIds }),
  search: (chatId, q) => api.get(`/messages/${chatId}/search?q=${encodeURIComponent(q)}`),
};

// ─── Notifications ────────────────────────────────────────────────
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAllRead: () => api.put('/notifications/read-all'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// ─── Media ────────────────────────────────────────────────────────
export const mediaAPI = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    });
  },
};

// ─── Nova AI ──────────────────────────────────────────────────────
export const novaAPI = {
  chat: (chatId, message, history) => api.post('/nova/chat', { chatId, message, history }),
  smartReplies: (lastMessage, context) => api.post('/nova/smart-replies', { lastMessage, context }),
  translate: (text, targetLang) => api.post('/nova/translate', { text, targetLang }),
};

export default api;
