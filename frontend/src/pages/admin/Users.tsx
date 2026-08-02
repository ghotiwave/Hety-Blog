import { useState, useEffect } from 'react'
import axios from 'axios'
import api from '@/services/api'

interface ManagedUser {
  id: number
  username: string
  role: string
  avatar_url: string | null
  signature: string | null
  created_at: string
}

export function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = () => {
    api.get('/admin/users').then((res) => setUsers(res.data)).finally(() => setLoading(false))
  }
  useEffect(() => { fetchUsers() }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该用户？')) return
    try {
      await api.delete(`/admin/users/${id}`)
      fetchUsers()
    } catch (error: unknown) {
      const detail = axios.isAxiosError(error) ? error.response?.data?.detail : null
      alert(typeof detail === 'string' ? detail : '操作失败')
    }
  }

  if (loading) return <div className="text-center text-[var(--color-text-muted)] py-12">加载中...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">用户管理</h1>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)]" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                  {u.username[0]}
                </div>
              )}
              <div className="min-w-0">
                <span className="block truncate font-medium text-sm text-[var(--color-text)]">{u.username}</span>
                {u.signature && <p className="max-w-full truncate text-[10px] text-[var(--color-text-muted)] sm:max-w-[240px]">{u.signature}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {u.role === 'admin' ? '管理员' : '用户'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pl-11 sm:justify-end sm:pl-0">
              <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{new Date(u.created_at).toLocaleDateString('zh-CN')}</span>
              {u.role !== 'admin' && (
                <button onClick={() => handleDelete(u.id)} className="text-xs text-red-400 hover:text-red-500 cursor-pointer">
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
