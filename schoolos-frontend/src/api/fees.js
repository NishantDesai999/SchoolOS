import axiosClient from './axiosClient'

export const feesApi = {
  // Fee Config
  getConfig: (yearNumber, gradeLevel) =>
    axiosClient.get(`/fee-configs?yearId=${yearNumber}&gradeLevel=${gradeLevel}`),
  upsertConfig: (data) => axiosClient.put('/fee-configs', data),

  // Fee Calculator
  calculate: (grNumber, yearNumber) =>
    yearNumber
      ? axiosClient.get(`/fee-calculator?grNumber=${grNumber}&yearId=${yearNumber}`)
      : axiosClient.get(`/fee-calculator?grNumber=${grNumber}`),
  calculateByGrade: (calendarYear, gradeLevel, months) =>
    axiosClient.get('/fee-calculator/by-grade', { params: { calendarYear, gradeLevel, months } }),

  // Discounts
  listDiscounts: () => axiosClient.get('/fee-discounts'),
  createDiscount: (data) => axiosClient.post('/fee-discounts', data),

  // Invoices
  generateInvoices: (data) => axiosClient.post('/invoices/generate', data),
  listInvoices: (params) => axiosClient.get('/invoices', { params }),
  getInvoice: (id) => axiosClient.get(`/invoices/${id}`),
  getStudentInvoices: (studentId) => axiosClient.get(`/invoices/student/${studentId}`),
  getInvoicePdfUrl: (id) => `/api/v1/invoices/${id}/pdf`,

  // Per-student fee calculator
  calculateForStudent: (studentId, fromMonth, toMonth) =>
    axiosClient.get(`/fee-calculator/student/${studentId}`, { params: { fromMonth, toMonth } }),

  // Collect fee for student (creates invoice + payment)
  collectForStudent: (data) => axiosClient.post('/invoices/student-collect', data),

  // Unified student ledger (invoices + direct payments)
  getStudentLedger: (studentId) => axiosClient.get(`/students/${studentId}/ledger`),

  // Reports
  getCollectionReport: (params) =>
    axiosClient.get('/fee-reports/collection', { params }),
  getDefaulterList: (params) =>
    axiosClient.get('/invoices/defaulters', { params }),
}
