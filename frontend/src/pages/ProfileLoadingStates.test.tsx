import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { About } from './About'
import { ProfileEdit } from './admin/ProfileEdit'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  default: { get: mocks.apiGet, post: mocks.apiPost, put: mocks.apiPut },
}))

describe('profile page loading states', () => {
  beforeEach(() => {
    mocks.apiGet.mockRejectedValue(new Error('offline'))
  })

  it('does not misreport an API failure as an empty public profile', async () => {
    render(<About />)

    expect(await screen.findByRole('alert')).toHaveTextContent('关于页加载失败')
    expect(screen.queryByText('站长还没写介绍')).not.toBeInTheDocument()
  })

  it('does not expose an empty editor when the admin profile failed to load', async () => {
    render(<ProfileEdit />)

    expect(await screen.findByRole('alert')).toHaveTextContent('关于页内容加载失败')
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument()
  })
})
