import axios from 'axios'
import { createContext, useContext, useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = axios.create({ baseURL: API_BASE })

// Attach token automatically
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mokama_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mokama_token')
      localStorage.removeItem('mokama_user')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

// Auth Context
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('mokama_token')
    const stored = localStorage.getItem('mokama_user')
    if (token && stored) {
      try { setUser(JSON.parse(stored)) } catch (_) {}
    }
    setLoading(false)
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('mokama_token', token)
    localStorage.setItem('mokama_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('mokama_token')
    localStorage.removeItem('mokama_user')
    setUser(null)
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
