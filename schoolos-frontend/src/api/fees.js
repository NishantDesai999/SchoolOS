import axiosClient from './axiosClient'

export const feesApi = {
  // Fee Config
  getConfig: (year, grade) => axiosClient.get(`/fee-configs?year=${year}&grade=${grade}`),
  listConfigYears: () => axiosClient.get('/fee-configs/years'),
  createConfig: (data) => axiosClient.post('/fee-configs', data),
  updateConfig: (id, data) => axiosClient.put(`/fee-configs/${id}`, data),
  addItem: (id, data) => axiosClient.post(`/fee-configs/${id}/items`, data),
  updateItem: (id, itemId, data) => axiosClient.put(`/fee-configs/${id}/items/${itemId}`, data),
  deleteItem: (id, itemId) => axiosClient.delete(`/fee-configs/${id}/items/${itemId}`),
  cloneConfig: (id, data) => axiosClient.post(`/fee-configs/${id}/clone`, data),

  // Fee Calculator
  calculate: (grNumber, year) =>
    axiosClient.get(`/fee-calculator?gr_number=${grNumber}&year=${year}`),
  calculateMultiYear: (data) => axiosClient.post('/fee-calculator/multi-year', data),

  // Discounts
  listDiscounts: () => axiosClient.get('/fee-discounts'),
  createDiscount: (data) => axiosClient.post('/fee-discounts', data),

  // Invoices
  generateInvoices: (data) => axiosClient.post('/invoices/generate', data),
  listInvoices: (params) => axiosClient.get('/invoices', { params }),
  getInvoice: (id) => axiosClient.get(`/invoices/${id}`),
  getStudentInvoices: (studentId) => axiosClient.get(`/invoices/student/${studentId}`),
  getInvoicePdfUrl: (id) => `/api/v1/invoices/${id}/pdf`,

  // Reports
  getCollectionReport: (params) =>
    axiosClient.get('/fee-reports/collection', { params }),
  getDefaulterList: (params) =>
    axiosClient.get('/invoices/defaulters', { params }),
}
