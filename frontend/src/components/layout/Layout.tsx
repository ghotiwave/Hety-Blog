import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'

export function Layout() {
  const { pathname } = useLocation()
  const isReadingPage = /^\/(blog|digest)\/[^/]+$/.test(pathname)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={`flex-1 mx-auto w-full px-5 md:px-8 py-8 ${isReadingPage ? 'max-w-[100rem]' : 'max-w-5xl'}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
