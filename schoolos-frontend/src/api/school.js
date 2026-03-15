import axiosClient from './axiosClient'

export const schoolApi = {
  getSchool: () => axiosClient.get('/schools/me'),
  updateSchool: (data) => axiosClient.put('/schools/me', data),
  uploadPrincipalSignature: (formData) =>
    axiosClient.put('/schools/principal-signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Calendar Years
  listCalendarYears: () => axiosClient.get('/calendar-years'),
  createCalendarYear: (data) => axiosClient.post('/calendar-years', data),

  // Classes
  listClasses: (yearId) => axiosClient.get(`/classes?year_id=${yearId}`),
  createClass: (data) => axiosClient.post('/classes', data),
  cloneClassesFromYear: (data) => axiosClient.post('/classes/clone-from-year', data),

  // Sections
  listSections: (classId) => axiosClient.get(`/sections?class_id=${classId}`),
  createSection: (data) => axiosClient.post('/sections', data),
  updateSection: (id, data) => axiosClient.put(`/sections/${id}`, data),
  deleteSection: (id) => axiosClient.delete(`/sections/${id}`),
}
