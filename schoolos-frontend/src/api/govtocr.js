import axiosClient from './axiosClient'

export const govtOcrApi = {
  list: () => axiosClient.get('/govt-circulars'),
  upload: (formData) =>
    axiosClient.post('/govt-circulars/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getOcrResult: (id) => axiosClient.get(`/govt-circulars/${id}/ocr-result`),
  delete: (id) => axiosClient.delete(`/govt-circulars/${id}`),
}
