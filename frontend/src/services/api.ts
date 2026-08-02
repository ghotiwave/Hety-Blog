import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export function shouldClearStoredSession(status?: number, requestUrl?: string): boolean {
  return status === 401 && !requestUrl?.endsWith('/auth/login')
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (shouldClearStoredSession(err.response?.status, err.config?.url)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    return Promise.reject(err)
  }
)

export default api
