import axiosClient from './axiosClient'

export const digestApi = {
  getToday: () => axiosClient.get('/digest/today'),
  getPreview: () => axiosClient.get('/digest/preview'),
  sendNow: () => axiosClient.post('/digest/send-now'),
  getHistory: (params) => axiosClient.get('/digest/history', { params }),
  getSettings: () => axiosClient.get('/digest/settings'),
  updateSettings: (data) => axiosClient.put('/digest/settings', data),
}
