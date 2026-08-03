import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Register } from './Register'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  register: vi.fn(),
  sendCode: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  default: { get: mocks.apiGet },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ register: mocks.register, sendCode: mocks.sendCode }),
}))

describe('Register', () => {
  beforeEach(() => {
    mocks.apiGet.mockResolvedValue({
      data: { turnstile_site_key: null, github_oauth_enabled: false },
    })
  })

  it('loads public auth configuration and renders the registration form', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '创建账号' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('邮箱')).toHaveAttribute('type', 'email')
    expect(screen.getByPlaceholderText('密码（至少 8 位）')).toHaveAttribute('minlength', '8')
    expect(screen.getByPlaceholderText('密码（至少 8 位）')).toHaveAttribute('maxlength', '72')
    expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/auth/config')
  })

  it('offers GitHub registration when OAuth is configured', async () => {
    mocks.apiGet.mockResolvedValue({
      data: { turnstile_site_key: null, github_oauth_enabled: true },
    })
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    const link = await screen.findByRole('link', { name: '使用 GitHub 注册' })
    expect(link).toHaveAttribute('href', '/api/auth/github/start')
  })
})
