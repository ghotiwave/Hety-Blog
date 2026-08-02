import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Login } from './Login'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mocks.login }),
}))

describe('Login', () => {
  beforeEach(() => {
    mocks.login.mockRejectedValue(new Error('offline'))
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
})
