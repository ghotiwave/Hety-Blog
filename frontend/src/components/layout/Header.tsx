import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/config'
import logoImg from '@/assets/logo-sm.png'

export function Header() {
  const { user, isAdmin, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `transition-colors ${isActive ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/92 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        <div className="flex items-center gap-7">
          <a href="https://gianniiss.top" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            <img src={logoImg} alt={siteConfig.shortName} className="h-8 w-auto object-contain" />
            <span className="text-sm text-[var(--color-text)] tracking-wider">{siteConfig.shortName}</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <NavLink to="/blog" className={navClass}>博客</NavLink>
            {siteConfig.features.digest && (
              <NavLink to="/digest" className={navClass}>科技日报</NavLink>
            )}
            <NavLink to="/about" className={navClass}>关于</NavLink>
            {siteConfig.features.game && (
              <Link to="/game" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-muted)] transition-colors text-xs">Game</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <button onClick={toggle} className="text-lg cursor-pointer px-2 py-1 rounded hover:bg-[var(--color-surface)] dark:hover:bg-[#3d3d3a] transition-colors" title={dark ? '切到亮色' : '切到暗色'}>
            {dark ? '☀' : '☾'}
          </button>
          <div className="hidden md:flex items-center gap-3">
          {user ? (<>
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
          </>) : (<>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>登录</Button>
              <Button size="sm" onClick={() => navigate('/register')}>注册</Button>
          </>)}
          </div>
          <button onClick={() => setMenuOpen((open) => !open)} className="md:hidden p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]" aria-label="打开导航" aria-expanded={menuOpen}>☰</button>
        </div>
      </div>
      {menuOpen && <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-4 space-y-1 shadow-lg">
        <NavLink to="/blog" onClick={() => setMenuOpen(false)} className={({ isActive }) => `${navClass({ isActive })} block py-2.5`}>博客</NavLink>
        {siteConfig.features.digest && <NavLink to="/digest" onClick={() => setMenuOpen(false)} className={({ isActive }) => `${navClass({ isActive })} block py-2.5`}>科技日报</NavLink>}
        <NavLink to="/about" onClick={() => setMenuOpen(false)} className={({ isActive }) => `${navClass({ isActive })} block py-2.5`}>关于</NavLink>
        <div className="border-t border-[var(--color-border)] mt-2 pt-3">
          {user ? <button onClick={() => { navigate('/profile'); setMenuOpen(false) }} className="text-sm text-[var(--color-text-muted)] py-2">{user.username} 的资料</button> : <button onClick={() => { navigate('/login'); setMenuOpen(false) }} className="text-sm text-[var(--color-text-muted)] py-2">登录或注册</button>}
        </div>
      </div>}
    </header>
  )
}
