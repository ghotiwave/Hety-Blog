import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

export function Header() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 bg-[#fefce8]/90 backdrop-blur border-b border-amber-200/60">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold text-stone-800 hover:text-amber-700 transition-colors italic" style={{ fontFamily: 'Georgia, serif' }}>
            MyBlog
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/blog" className="text-stone-500 hover:text-stone-800 transition-colors italic">Blog</Link>
            <Link to="/about" className="text-stone-500 hover:text-stone-800 transition-colors italic">About</Link>
            <Link to="/game" className="text-stone-500 hover:text-stone-800 transition-colors italic">Game</Link>
            <Link to="/digest" className="text-stone-500 hover:text-stone-800 transition-colors italic">Digest</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-stone-400 italic">{user.username}</span>
              <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>History</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/likes')}>Likes</Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')}>
                  Admin
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                Register
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
