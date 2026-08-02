import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommentSection } from './CommentSection'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  default: { get: mocks.apiGet, post: mocks.apiPost },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))

describe('CommentSection Markdown', () => {
  beforeEach(() => {
    mocks.apiGet.mockResolvedValue({
      data: {
        total: 1,
        items: [{
          id: 1,
          user_id: 2,
          author_name: 'alice',
          author_role: null,
          avatar_url: null,
          signature: '# 个签标题\n\n~~旧内容~~',
          content: '# 评论标题\n\n**正文加粗**',
          reply_to_name: null,
          like_count: 0,
          user_liked: false,
          reply_count: 0,
          created_at: '2026-08-03T08:00:00',
        }],
      },
    })
  })

  it('renders Markdown in both comments and the author card', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CommentSection postId={1} totalComments={1} />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '评论标题' })).toBeInTheDocument()
    expect(screen.getByText('正文加粗').tagName).toBe('STRONG')

    await user.click(screen.getByRole('button', { name: '查看 alice 的资料' }))
    expect(screen.getByRole('heading', { name: '个签标题' })).toBeInTheDocument()
    expect(screen.getByText('旧内容').tagName).toBe('DEL')
  })
})
