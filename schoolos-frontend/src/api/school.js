import axiosClient from './axiosClient'

export const schoolApi = {
  listAll: () => axiosClient.get('/schools'),
  getSchool: () => axiosClient.get('/schools/me'),
  updateSchool: (data) => axiosClient.put('/schools/me', data),
  uploadPrincipalSignature: (formData) =>
    axiosClient.put('/schools/principal-signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Calendar Years
  listCalendarYears: () => axiosClient.get('/calendar-years'),
  createCalendarYear: (data) => axiosClient.post('/calendar-years', data),
  setCurrentYear: (id) => axiosClient.put(`/calendar-years/${id}/set-current`),

  // Classes
  listClasses: (yearId) => axiosClient.get('/classes', { params: { yearId } }),
  createClass: (data) => axiosClient.post('/classes', data),
  deleteClass: (id) => axiosClient.delete(`/classes/${id}`),
  cloneClasses: (sourceYearId, targetYearId) => axiosClient.post('/classes/clone', null, { params: { sourceYearId, targetYearId } }),

  // Sections
  listSections: (classId) => axiosClient.get('/sections', { params: { classId } }),
  createSection: (data) => axiosClient.post('/sections', data),
  updateSection: (id, data) => axiosClient.put(`/sections/${id}`, data),
  deleteSection: (id) => axiosClient.delete(`/sections/${id}`),
}
