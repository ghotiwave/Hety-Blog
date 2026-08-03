import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GitHubOAuthComplete } from './GitHubOAuthComplete'

const mocks = vi.hoisted(() => ({
  completeOAuthLogin: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ completeOAuthLogin: mocks.completeOAuthLogin }),
}))

describe('GitHubOAuthComplete', () => {
  afterEach(() => {
    window.location.hash = ''
  })

  it('consumes the fragment token and completes the local session', async () => {
    mocks.completeOAuthLogin.mockResolvedValue(undefined)
    window.location.hash = '#token=site-jwt'

    render(
      <MemoryRouter initialEntries={['/auth/github/complete']}>
        <Routes>
          <Route path="/auth/github/complete" element={<GitHubOAuthComplete />} />
          <Route path="/blog" element={<p>博客首页</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(mocks.completeOAuthLogin).toHaveBeenCalledWith('site-jwt'))
    expect(await screen.findByText('博客首页')).toBeInTheDocument()
    expect(window.location.hash).toBe('')
  })
})
