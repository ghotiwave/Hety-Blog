import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Login } from './Login'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  apiGet: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  default: { get: mocks.apiGet },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mocks.login }),
}))

describe('Login', () => {
  beforeEach(() => {
    mocks.login.mockRejectedValue(new Error('offline'))
    mocks.apiGet.mockResolvedValue({ data: { github_oauth_enabled: false } })
  })

  it('does not misreport a service failure as invalid credentials', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.type(screen.getByPlaceholderText('用户名或邮箱'), 'alice')
    await user.type(screen.getByPlaceholderText('密码'), 'password123')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('登录服务暂时不可用')
    expect(screen.queryByText('用户名、邮箱或密码错误')).not.toBeInTheDocument()
  })

  it('shows GitHub login only when the backend integration is configured', async () => {
    mocks.apiGet.mockResolvedValue({ data: { github_oauth_enabled: true } })
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    const link = await screen.findByRole('link', { name: '使用 GitHub 登录' })
    expect(link).toHaveAttribute('href', '/api/auth/github/start')
  })

  it('explains how to safely bind an existing email account', async () => {
    render(
      <MemoryRouter initialEntries={['/login?oauth_error=existing_email']}>
        <Login />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('请先使用原账号登录')
  })
})
