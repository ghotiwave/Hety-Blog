import { createContext, useContext, useState, type ReactNode } from 'react'
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
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, code: string, turnstile_token?: string) => Promise<any>
  sendCode: (email: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  const isAdmin = user?.role === 'admin'

  async function login(username: string, password: string) {
    const res = await api.post('/auth/login', { username, password })
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

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, login, register, sendCode, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
