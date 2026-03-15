import axiosClient from './axiosClient'

export const authApi = {
  getMe: () => axiosClient.get('/users/me'),
  updateLanguage: (lang) => axiosClient.put('/users/me/language', { language: lang }),
  listUsers: (params) => axiosClient.get('/users', { params }),
  createUser: (data) => axiosClient.post('/users', data),
  updateUser: (id, data) => axiosClient.put(`/users/${id}`, data),
  disableUser: (id) => axiosClient.put(`/users/${id}/disable`),
  resetPassword: (id) => axiosClient.post(`/users/${id}/reset-password`),
}
