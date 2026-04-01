import axios from 'axios'
import { createContext, useContext, useState, useEffect } from 'react'
import { connectSocket, disconnectSocket } from '../socket/socket'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = axios.create({ baseURL: API_BASE })

// ── Request interceptor — attach access token ──
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mokama_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Response interceptor — auto-refresh on 401 ──
let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config

    if (err.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('mokama_refresh_token')

      if (!refreshToken) {
        localStorage.clear()
        disconnectSocket()
        window.location.href = '/'
        return Promise.reject(err)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing    = true

      try {
        const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
        const { token: newAccess, refreshToken: newRefresh } = res.data

        localStorage.setItem('mokama_token',         newAccess)
        localStorage.setItem('mokama_refresh_token', newRefresh)

        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`
        processQueue(null, newAccess)

        // Reconnect socket with new token
        disconnectSocket()
        connectSocket(newAccess)

        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        localStorage.clear()
        disconnectSocket()
        window.location.href = '/'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

// ── Auth Context ──
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token  = localStorage.getItem('mokama_token')
    const stored = localStorage.getItem('mokama_user')
    if (token && stored) {
      try {
        setUser(JSON.parse(stored))
        // Reconnect socket if already logged in (page refresh)
        connectSocket(token)
      } catch (_) {}
    }
    setLoading(false)
  }, [])

  const login = (token, userData, refreshToken) => {
    localStorage.setItem('mokama_token', token)
    localStorage.setItem('mokama_user',  JSON.stringify(userData))
    if (refreshToken) {
      localStorage.setItem('mokama_refresh_token', refreshToken)
    }
    setUser(userData)
    // ── Connect socket on login ──
    connectSocket(token)
  }

  const logout = () => {
    localStorage.removeItem('mokama_token')
    localStorage.removeItem('mokama_refresh_token')
    localStorage.removeItem('mokama_user')
    setUser(null)
    // ── Disconnect socket on logout ──
    disconnectSocket()
  }

  const updateUser = (data) => {
    const updated = { ...user, ...data }
    localStorage.setItem('mokama_user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
