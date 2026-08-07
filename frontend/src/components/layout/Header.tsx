import { useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/Button'
import { siteConfig } from '@/config'
import logoImg from '@/assets/logo-sm.png'

interface SliderState {
  left: number
  width: number
  visible: boolean
}

function useNavSlider(activePath: string | undefined) {
  const containerRef = useRef<HTMLElement>(null)
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [slider, setSlider] = useState<SliderState>({ left: 0, width: 0, visible: false })

  useLayoutEffect(() => {
    const container = containerRef.current
    const activeLink = activePath ? linkRefs.current[activePath] : null
    if (!container || !activeLink) {
      setSlider((current) => ({ ...current, visible: false }))
      return
    }

    const updateSlider = () => {
      const next = { left: activeLink.offsetLeft, width: activeLink.offsetWidth, visible: true }
      setSlider((current) => (
        current.left === next.left && current.width === next.width && current.visible
          ? current
          : next
      ))
    }
    updateSlider()

    const observer = new ResizeObserver(updateSlider)
    observer.observe(container)
    observer.observe(activeLink)
    window.addEventListener('resize', updateSlider)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSlider)
    }
  }, [activePath])

  return { containerRef, linkRefs, slider }
}

function Slider({ state }: { state: SliderState }) {
  return (
    <span
      aria-hidden="true"
      className="site-nav-slider"
      style={{
        width: `${state.width}px`,
        opacity: state.visible ? 1 : 0,
        transform: `translate3d(${state.left}px, 0, 0)`,
      }}
    />
  )
}

export function Header() {
  const { user, isAdmin, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const navItems = [
    { to: '/blog', label: '博客' },
    ...(siteConfig.features.digest ? [{ to: '/digest', label: '科技日报' }] : []),
    { to: '/about', label: '关于' },
    ...(siteConfig.features.game ? [{ to: '/game', label: 'Game', aliases: ['/leaderboard'] }] : []),
  ]
  const activeNavPath = navItems.find((item) => (
    pathname === item.to
    || pathname.startsWith(`${item.to}/`)
    || item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`))
  ))?.to
  const accountItems = user
    ? [
        { to: '/profile', label: user.username, avatarUrl: user.avatar_url },
        { to: '/history', label: '历史' },
        { to: '/likes', label: '点赞' },
        ...(isAdmin ? [{ to: '/admin/dashboard', label: '管理', prefix: '/admin' }] : []),
      ]
    : [
        { to: '/login', label: '登录' },
        { to: '/register', label: '注册' },
      ]
  const activeAccountPath = accountItems.find((item) => (
    pathname === item.to
    || pathname.startsWith(`${item.to}/`)
    || (item.prefix && (pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)))
  ))?.to
  const {
    containerRef: primaryNavRef,
    linkRefs: primaryLinkRefs,
    slider: primarySlider,
  } = useNavSlider(activeNavPath)
  const {
    containerRef: accountNavRef,
    linkRefs: accountLinkRefs,
    slider: accountSlider,
  } = useNavSlider(activeAccountPath)

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `transition-colors ${isActive ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`

  return (
    <header className="site-header-shell sticky top-0 z-50 px-3 pt-2 sm:px-4">
      <div className="site-header-glass max-w-5xl mx-auto flex h-14 items-center justify-between px-3 sm:px-5">
        <div className="flex items-center gap-7">
          <a href="https://gianniiss.top" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            <img src={logoImg} alt={siteConfig.shortName} className="h-8 w-auto object-contain" />
            <span className="text-sm text-[var(--color-text)] tracking-wider">{siteConfig.shortName}</span>
          </a>
          <nav ref={primaryNavRef} className="site-nav-track relative hidden items-center p-1 text-sm md:flex" aria-label="主导航">
            <Slider state={primarySlider} />
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                ref={(node) => { primaryLinkRefs.current[item.to] = node }}
                to={item.to}
                className={() => `site-nav-link relative z-10 px-3 py-1.5 ${navClass({ isActive: activeNavPath === item.to })}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <button onClick={toggle} className="text-lg cursor-pointer px-2 py-1 rounded hover:bg-[var(--color-surface)] transition-colors" title={dark ? '切到亮色' : '切到暗色'} aria-label={dark ? '切换到亮色主题' : '切换到暗色主题'}>
            {dark ? '☀' : '☾'}
          </button>
          <div className="hidden items-center gap-2 md:flex">
            <nav ref={accountNavRef} className="site-nav-track relative flex items-center p-1 text-sm" aria-label="账户导航">
              <Slider state={accountSlider} />
              {accountItems.map((item) => (
                <NavLink
                  key={item.to}
                  ref={(node) => { accountLinkRefs.current[item.to] = node }}
                  to={item.to}
                  className={() => `site-nav-link relative z-10 flex items-center px-3 py-1.5 ${navClass({ isActive: activeAccountPath === item.to })}`}
                >
                  {'avatarUrl' in item && item.avatarUrl ? (
                    <img src={item.avatarUrl} className="mr-1.5 h-5 w-5 rounded-full object-cover" alt="" />
                  ) : null}
                  {item.label}
                </NavLink>
              ))}
            </nav>
            {user && <Button variant="ghost" size="sm" onClick={logout}>退出</Button>}
          </div>
          <button onClick={() => setMenuOpen((open) => !open)} className="md:hidden p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]" aria-label={menuOpen ? '关闭导航' : '打开导航'} aria-controls="mobile-navigation" aria-expanded={menuOpen}>☰</button>
        </div>
      </div>
      <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out md:hidden ${menuOpen ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'}`}>
      <div id="mobile-navigation" className="overflow-hidden" aria-hidden={!menuOpen} inert={!menuOpen}>
      <nav className="site-mobile-nav mt-2 space-y-1 px-5 py-4" aria-label="移动端导航">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMenuOpen(false)}
            className={() => `${navClass({ isActive: activeNavPath === item.to })} block rounded-lg px-3 py-2.5 ${activeNavPath === item.to ? 'bg-[var(--color-primary)]/10' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
        <div className="mt-2 flex flex-col border-t border-[var(--color-border)] pt-3">
          {user ? <>
            <button onClick={() => { navigate('/profile'); setMenuOpen(false) }} className="text-left text-sm text-[var(--color-text-muted)] py-2">{user.username} 的资料</button>
            <button onClick={() => { navigate('/history'); setMenuOpen(false) }} className="text-left text-sm text-[var(--color-text-muted)] py-2">阅读历史</button>
            <button onClick={() => { navigate('/likes'); setMenuOpen(false) }} className="text-left text-sm text-[var(--color-text-muted)] py-2">我的点赞</button>
            {isAdmin && <button onClick={() => { navigate('/admin/dashboard'); setMenuOpen(false) }} className="text-left text-sm text-[var(--color-text-muted)] py-2">管理后台</button>}
            <button onClick={() => { logout(); setMenuOpen(false) }} className="text-left text-sm text-red-500 py-2">退出登录</button>
          </> : <>
            <button onClick={() => { navigate('/login'); setMenuOpen(false) }} className="text-left text-sm text-[var(--color-text-muted)] py-2">登录</button>
            <button onClick={() => { navigate('/register'); setMenuOpen(false) }} className="text-left text-sm text-[var(--color-primary)] py-2">创建账号</button>
          </>}
        </div>
      </nav>
      </div>
      </div>
    </header>
  )
}
