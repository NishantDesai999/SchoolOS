import axios from 'axios'
import keycloak from '../auth/keycloak'

const axiosClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Keycloak JWT token to every request
axiosClient.interceptors.request.use(
  async (config) => {
    if (keycloak.authenticated) {
      try {
        // Refresh token if it expires within 30 seconds
        await keycloak.updateToken(30)
        config.headers.Authorization = `Bearer ${keycloak.token}`
      } catch {
        keycloak.login()
      }
    }
    // Pass preferred language for error messages
    const lang = localStorage.getItem('schoolos-lang') || 'en'
    config.headers['Accept-Language'] = lang
    const schoolId = localStorage.getItem('schoolos-school-id')
    if (schoolId && !config.headers['X-School-Id']) config.headers['X-School-Id'] = schoolId
    return config
  },
  (error) => Promise.reject(error)
)

// Unwrap the ApiResponse envelope on success; throw on error
axiosClient.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.success) {
        const err = new Error(body.error?.message || 'Request failed')
        err.code = body.error?.code
        return Promise.reject(err)
      }
      // Return data + pagination info as a combined object when pagination exists
      if (body.pagination) {
        return { data: body.data, pagination: body.pagination }
      }
      return body.data
    }
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      keycloak.login()
    }
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    const err = new Error(message)
    err.status = error.response?.status
    err.code = error.response?.data?.error?.code
    return Promise.reject(err)
  }
)

export default axiosClient
