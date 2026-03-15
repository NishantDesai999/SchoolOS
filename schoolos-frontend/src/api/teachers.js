import axiosClient from './axiosClient'

export const teachersApi = {
  list: (params) => axiosClient.get('/teachers', { params }),
  getById: (id) => axiosClient.get(`/teachers/${id}`),
  create: (data) => axiosClient.post('/teachers', data),
  update: (id, data) => axiosClient.put(`/teachers/${id}`, data),
  recordSalary: (id, data) => axiosClient.post(`/teachers/${id}/salary`, data),
  getSalaryHistory: (id) => axiosClient.get(`/teachers/${id}/salary-history`),
  getSalarySummary: (month) => axiosClient.get(`/teachers/salary-summary?month=${month}`),
}
