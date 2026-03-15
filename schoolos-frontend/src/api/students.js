import axiosClient from './axiosClient'

export const studentsApi = {
  list: (params) => axiosClient.get('/students', { params }),
  getById: (id) => axiosClient.get(`/students/${id}`),
  lookupByGr: (grNumber) => axiosClient.get(`/students/lookup?gr_number=${grNumber}`),
  create: (data) => axiosClient.post('/students', data),
  update: (id, data) => axiosClient.put(`/students/${id}`, data),
  promote: (id, data) => axiosClient.post(`/students/${id}/promote`, data),
  getInvoices: (id) => axiosClient.get(`/students/${id}/invoices`),
  getLedger: (id, params) => axiosClient.get(`/students/${id}/ledger`, { params }),
  getPayments: (id) => axiosClient.get(`/students/${id}/payments`),
}

export const admissionsApi = {
  inquire: (data) => axiosClient.post('/admissions/inquire', data),
  list: (params) => axiosClient.get('/admissions', { params }),
  getById: (id) => axiosClient.get(`/admissions/${id}`),
  updateStatus: (id, data) => axiosClient.put(`/admissions/${id}/status`, data),
  convert: (id, data) => axiosClient.post(`/admissions/${id}/convert`, data),
}
