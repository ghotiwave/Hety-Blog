import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '@/services/api'

interface User {
  id: number
  username: string
  role: string
  avatar_url?: string | null
  signature?: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isAdmin: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, code: string, turnstile_token?: string) => Promise<void>
  sendCode: (email: string) => Promise<void>
  completeOAuthLogin: (token: string) => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

function readStoredUser(): User | null {
  const stored = localStorage.getItem('user')
  if (!stored) return null
  try {
    return JSON.parse(stored) as User
  } catch {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  useEffect(() => {
    const clearSession = () => {
      setToken(null)
      setUser(null)
    }
    window.addEventListener('auth:unauthorized', clearSession)
    return () => window.removeEventListener('auth:unauthorized', clearSession)
  }, [])

  const isAdmin = user?.role === 'admin'

  async function login(identifier: string, password: string) {
    const res = await api.post('/auth/login', { username: identifier, password })
    const { access_token, user: u } = res.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(u))
    setToken(access_token)
    setUser(u)
  }

  async function register(username: string, email: string, password: string, code: string, turnstile_token?: string) {
    const res = await api.post('/auth/register', { username, email, password, code, turnstile_token })
    const { access_token, user: u } = res.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(u))
    setToken(access_token)
    setUser(u)
  }

  async function sendCode(email: string) {
    await api.post('/auth/send-code', { email })
  }

  async function completeOAuthLogin(oauthToken: string) {
    localStorage.setItem('token', oauthToken)
    setToken(oauthToken)
    try {
      const res = await api.get('/auth/me')
      localStorage.setItem('user', JSON.stringify(res.data))
      setUser(res.data)
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setToken(null)
      setUser(null)
      throw error
    }
  }

  async function refreshUser() {
    const res = await api.get('/auth/me')
    localStorage.setItem('user', JSON.stringify(res.data))
    setUser(res.data)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, login, register, sendCode, completeOAuthLogin, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Context hooks intentionally live beside their provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
