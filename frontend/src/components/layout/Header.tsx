import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

export function Header() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 bg-[#fafaf7]/90 backdrop-blur-sm border-b border-[#e8e6e0]/50">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-lg text-[#5a5a55] hover:text-[#8b7355] transition-colors tracking-wider">
            Hety
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/blog" className="text-[#9a9996] hover:text-[#5a5a55] transition-colors">博客</Link>
            <Link to="/notes" className="text-[#9a9996] hover:text-[#5a5a55] transition-colors">笔记</Link>
            <Link to="/digest" className="text-[#9a9996] hover:text-[#5a5a55] transition-colors">AI 日报</Link>
            <Link to="/about" className="text-[#9a9996] hover:text-[#5a5a55] transition-colors">关于</Link>
            <Link to="/game" className="text-[#c5c4bf] hover:text-[#9a9996] transition-colors text-xs">Game</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-[#b5b4af]">{user.username}</span>
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
