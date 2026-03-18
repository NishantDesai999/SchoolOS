import axiosClient from './axiosClient'

export const slcApi = {
  list: (params) => axiosClient.get('/slc', { params }),
  lookup: (grNumber) => axiosClient.post('/slc/lookup', null, { params: { grNumber } }),
  getById: (id) => axiosClient.get(`/slc/${id}`),
  issue: (data) => axiosClient.post('/slc', data),
  cancel: (id) => axiosClient.put(`/slc/${id}/cancel`),
  issueDuplicate: (id) => axiosClient.post(`/slc/${id}/duplicate`),
  getPdfUrl: (id, lang) => `/api/v1/slc/${id}/pdf?lang=${lang}`,
  uploadSignature: (formData) =>
    axiosClient.post('/slc/upload-signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}
