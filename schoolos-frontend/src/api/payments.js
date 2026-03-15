import axiosClient from './axiosClient'

export const paymentsApi = {
  list: (params) => axiosClient.get('/payments', { params }),
  record: (data) => axiosClient.post('/payments', data),
  uploadUpiScreenshot: (formData) =>
    axiosClient.post('/payments/upi-screenshot', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  upiOcr: (formData) =>
    axiosClient.post('/payments/upi-ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getOcrResult: (id) => axiosClient.get(`/payments/${id}/ocr-result`),
  confirmOcr: (id, data) => axiosClient.put(`/payments/${id}/confirm-ocr`, data),
  getReceiptUrl: (id, lang) => `/api/v1/payments/${id}/receipt?lang=${lang}`,
  getPendingInvoices: (studentId) => axiosClient.get(`/invoices/student/${studentId}?status=pending,partial`),
}
