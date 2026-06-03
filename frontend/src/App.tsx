import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
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
import { UserLikes } from '@/pages/UserLikes'
import { Dashboard } from '@/pages/admin/Dashboard'
import { PostManage } from '@/pages/admin/PostManage'
import { PostEdit } from '@/pages/admin/PostEdit'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function AdminShell() {
  return (
    <AdminGuard>
      <div className="flex gap-8">
        <aside className="w-48 shrink-0">
          <nav className="flex flex-col gap-1 sticky top-20">
            {[
              ['/admin/dashboard', 'Dashboard'],
              ['/admin/posts', 'Posts'],
            ].map(([path, label]) => (
              <a
                key={path}
                href={path}
                className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
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
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<PostDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/game" element={<Game />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/digest" element={<Digest />} />
            <Route path="/digest/:id" element={<DigestDetail />} />
            <Route path="/history" element={<UserHistory />} />
            <Route path="/likes" element={<UserLikes />} />

            <Route element={<AdminShell />}>
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/posts" element={<PostManage />} />
              <Route path="/admin/posts/new" element={<PostEdit />} />
              <Route path="/admin/posts/:id/edit" element={<PostEdit />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
