import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Layout } from '@/components/layout/Layout'
import { siteConfig } from '@/config'

const Blog = lazy(() => import('@/pages/Blog').then((module) => ({ default: module.Blog })))
const PostDetail = lazy(() => import('@/pages/PostDetail').then((module) => ({ default: module.PostDetail })))
const About = lazy(() => import('@/pages/About').then((module) => ({ default: module.About })))
const Login = lazy(() => import('@/pages/Login').then((module) => ({ default: module.Login })))
const Register = lazy(() => import('@/pages/Register').then((module) => ({ default: module.Register })))
const Game = lazy(() => import('@/pages/Game').then((module) => ({ default: module.Game })))
const Leaderboard = lazy(() => import('@/pages/Leaderboard').then((module) => ({ default: module.Leaderboard })))
const Digest = lazy(() => import('@/pages/Digest').then((module) => ({ default: module.Digest })))
const DigestDetail = lazy(() => import('@/pages/DigestDetail').then((module) => ({ default: module.DigestDetail })))
const UserHistory = lazy(() => import('@/pages/UserHistory').then((module) => ({ default: module.UserHistory })))
const UserProfile = lazy(() => import('@/pages/UserProfile').then((module) => ({ default: module.UserProfile })))
const UserLikes = lazy(() => import('@/pages/UserLikes').then((module) => ({ default: module.UserLikes })))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard').then((module) => ({ default: module.Dashboard })))
const PostManage = lazy(() => import('@/pages/admin/PostManage').then((module) => ({ default: module.PostManage })))
const PostEdit = lazy(() => import('@/pages/admin/PostEdit').then((module) => ({ default: module.PostEdit })))
const AdminComments = lazy(() => import('@/pages/admin/Comments').then((module) => ({ default: module.AdminComments })))
const ProfileEdit = lazy(() => import('@/pages/admin/ProfileEdit').then((module) => ({ default: module.ProfileEdit })))
const AdminUsers = lazy(() => import('@/pages/admin/Users').then((module) => ({ default: module.AdminUsers })))

function RouteFallback() {
  return (
    <div className="flex min-h-56 items-center justify-center" role="status">
      <span className="font-mono text-xs tracking-[0.16em] text-[var(--color-text-muted)]">LOADING MODULE…</span>
    </div>
  )
}

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
    ['/admin/profile', '关于页'],
    ['/admin/users', '用户管理'],
  ]
  return (
    <AdminGuard>
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="w-full shrink-0 lg:w-48">
          <nav className="sticky top-16 flex gap-1 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg)] py-2 lg:top-20 lg:flex-col lg:overflow-visible lg:border-0 lg:bg-transparent lg:py-0">
            {navItems.map(([path, label]) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => `shrink-0 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-[var(--color-primary-dark)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
                }`}
              >
                {label}
              </NavLink>
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
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/blog" replace />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<PostDetail />} />
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
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
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
        </Suspense>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
