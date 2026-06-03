import { useState, useEffect } from 'react'
import api from '@/services/api'

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = () => {
    api.get('/admin/users').then((res) => setUsers(res.data)).finally(() => setLoading(false))
  }
  useEffect(() => { fetchUsers() }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user?')) return
    try {
      await api.delete(`/admin/users/${id}`)
      fetchUsers()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed')
    }
  }

  if (loading) return <div className="text-center text-gray-400 py-12">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="font-medium text-sm">{u.username}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {u.role}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString('zh-CN')}</span>
              {u.role !== 'admin' && (
                <button onClick={() => handleDelete(u.id)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
