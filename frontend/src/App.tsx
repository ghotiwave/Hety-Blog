import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Layout } from '@/components/layout/Layout'
import { Home } from '@/pages/Home'
import { Blog } from '@/pages/Blog'
import { PostDetail } from '@/pages/PostDetail'
import { About } from '@/pages/About'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Game } from '@/pages/Game'
import { Leaderboard } from '@/pages/Leaderboard'
import { Digest } from '@/pages/Digest'
import { DigestDetail } from '@/pages/DigestDetail'
import { UserHistory } from '@/pages/UserHistory'
import { UserProfile } from '@/pages/UserProfile'
import { UserLikes } from '@/pages/UserLikes'
import { Notes } from '@/pages/Notes'
import { Dashboard } from '@/pages/admin/Dashboard'
import { PostManage } from '@/pages/admin/PostManage'
import { PostEdit } from '@/pages/admin/PostEdit'
import { AdminComments } from '@/pages/admin/Comments'
import { ProfileEdit } from '@/pages/admin/ProfileEdit'
import { AdminUsers } from '@/pages/admin/Users'
import { siteConfig } from '@/config'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function AdminShell() {
  const navItems = [
    ['/admin/dashboard', '控制面板'],
    ['/admin/posts', '文章管理'],
    ['/admin/comments', '评论管理'],
    ['/admin/profile', '个人资料'],
    ['/admin/users', '用户管理'],
  ]
  return (
    <AdminGuard>
      <div className="flex gap-8">
        <aside className="w-48 shrink-0">
          <nav className="flex flex-col gap-1 sticky top-20">
            {navItems.map(([path, label]) => (
              <a
                key={path}
                href={path}
                className="px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </AdminGuard>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<PostDetail />} />
            {siteConfig.features.notes && <Route path="/notes" element={<Notes />} />}
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {siteConfig.features.game && <Route path="/game" element={<Game />} />}
            {siteConfig.features.game && <Route path="/leaderboard" element={<Leaderboard />} />}
            {siteConfig.features.digest && <Route path="/digest" element={<Digest />} />}
            {siteConfig.features.digest && <Route path="/digest/:id" element={<DigestDetail />} />}
            <Route path="/history" element={<UserHistory />} />
            <Route path="/likes" element={<UserLikes />} />
            <Route path="/profile" element={<UserProfile />} />

            <Route element={<AdminShell />}>
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/posts" element={<PostManage />} />
              <Route path="/admin/posts/new" element={<PostEdit />} />
              <Route path="/admin/posts/:id/edit" element={<PostEdit />} />
              <Route path="/admin/comments" element={<AdminComments />} />
              <Route path="/admin/profile" element={<ProfileEdit />} />
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
