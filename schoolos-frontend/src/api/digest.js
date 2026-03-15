import axiosClient from './axiosClient'

export const digestApi = {
  getToday: () => axiosClient.get('/digest/today'),
  sendNow: () => axiosClient.post('/digest/send-now'),
  getHistory: (params) => axiosClient.get('/digest/history', { params }),
  updateSettings: (data) => axiosClient.put('/digest/settings', data),
}
