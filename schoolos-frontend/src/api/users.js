import axiosClient from './axiosClient'

export const usersApi = {
  list: (params) => axiosClient.get('/users', { params }),
  create: (data) => axiosClient.post('/users', data),
  update: (id, data) => axiosClient.put(`/users/${id}`, data),
  updateStatus: (id, data) => axiosClient.put(`/users/${id}/status`, data),
  delete: (id) => axiosClient.delete(`/users/${id}`),
  resetPassword: (id) => axiosClient.post(`/users/${id}/reset-password`),
}
