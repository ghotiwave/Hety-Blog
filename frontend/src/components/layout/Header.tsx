import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/Button'

export function Header() {
  const { user, isAdmin, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-sm border-b border-[var(--color-border)]/50">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-lg text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors tracking-wider">
            Hety
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/blog" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">博客</Link>
            <a href="http://localhost:8080" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">笔记</a>
            <Link to="/digest" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">AI 日报</Link>
            <Link to="/about" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">关于</Link>
            <Link to="/game" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-muted)] transition-colors text-xs">Game</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggle} className="text-lg cursor-pointer px-2 py-1 rounded hover:bg-[var(--color-surface)] dark:hover:bg-[#3d3d3a] transition-colors" title={dark ? '切到亮色' : '切到暗色'}>
            {dark ? '☀' : '☾'}
          </button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="w-5 h-5 rounded-full object-cover mr-1" alt="" />
                ) : null}
                {user.username}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>历史</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/likes')}>点赞</Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')}>管理</Button>
              )}
              <Button variant="secondary" size="sm" onClick={logout}>退出</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>登录</Button>
              <Button size="sm" onClick={() => navigate('/register')}>注册</Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
