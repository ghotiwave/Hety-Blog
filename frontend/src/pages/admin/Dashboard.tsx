import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { DashboardStats } from '@/components/admin/DashboardStats'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/config'

export function Dashboard() {
  const [stats, setStats] = useState(null)
  const [digesting, setDigesting] = useState(false)
  const [digestMsg, setDigestMsg] = useState('')

  useEffect(() => {
    api.get('/admin/dashboard/stats').then((res) => setStats(res.data))
  }, [])

  const handleGenerateDigest = async () => {
    setDigesting(true)
    setDigestMsg('正在生成日报，请耐心等待（约 2 分钟）...')
    try {
      const res = await api.post('/admin/digests/generate', null, { timeout: 300000 })
      setDigestMsg(`日报生成成功：${res.data.title}`)
      setStats(null)
      api.get('/admin/dashboard/stats').then((res) => setStats(res.data))
    } catch (e: any) {
      setDigestMsg(`生成失败：${e.response?.data?.detail || e.message}`)
    } finally {
      setDigesting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">控制面板</h1>
        <div className="flex gap-3">
          {siteConfig.features.digest && (
            <Button variant="secondary" onClick={handleGenerateDigest} disabled={digesting}>
              {digesting ? '生成中...' : '生成日报'}
            </Button>
          )}
          <Link to="/admin/posts/new">
            <Button>新文章</Button>
          </Link>
        </div>
      </div>
      {digestMsg && (
        <div className={`mb-6 p-4 rounded-lg text-sm ${digestMsg.startsWith('生成失败') ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}>
          {digestMsg}
        </div>
      )}
      <DashboardStats stats={stats} />
    </div>
  )
}
