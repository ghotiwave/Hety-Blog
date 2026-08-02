import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PostDetail } from './PostDetail'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  fetchNavigation: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  default: { get: mocks.apiGet, post: mocks.apiPost },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 9, username: 'reader' } }),
}))

vi.mock('@/services/articleNavigation', () => ({
  fetchAllArticleNavItems: mocks.fetchNavigation,
}))

vi.mock('@/components/blog/CommentSection', () => ({
  CommentSection: ({ postId }: { postId: number }) => <div data-testid="comment-post">comment-post-{postId}</div>,
}))

const posts = {
  one: {
    id: 1,
    title: '第一篇',
    content: '# 第一节\n\n正文一',
    cover_image: null,
    created_at: '2026-08-01T10:00:00',
    like_count: 7,
    view_count: 12,
    comment_count: 2,
    user_liked: true,
  },
  two: {
    id: 2,
    title: '第二篇',
    content: '## 第二节\n\n正文二',
    cover_image: null,
    created_at: '2026-08-02T10:00:00',
    like_count: 3,
    view_count: 5,
    comment_count: 1,
    user_liked: false,
  },
}

describe('PostDetail route transitions', () => {
  beforeEach(() => {
    mocks.fetchNavigation.mockResolvedValue([
      { id: 1, title: '第一篇', slug: 'one' },
      { id: 2, title: '第二篇', slug: 'two' },
    ])
    mocks.apiPost.mockResolvedValue({ data: {} })
    mocks.apiGet.mockImplementation((url: string) => {
      const key = url.split('/').at(-1) as keyof typeof posts
      return Promise.resolve({ data: posts[key] })
    })
  })

  it('keeps liked state and comments synchronized with the active article', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/blog/one']}>
        <Routes>
          <Route path="/blog/:id" element={<PostDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '第一篇' })).toBeInTheDocument()
    expect(screen.getByText(/2026.*10:00/).parentElement).toHaveClass('italic')
    expect(screen.getByRole('button', { name: '第一节' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '❤️ 7' })).toBeInTheDocument()
    expect(screen.getByTestId('comment-post')).toHaveTextContent('comment-post-1')

    await user.click(await screen.findByRole('link', { name: '第二篇' }))

    expect(await screen.findByRole('heading', { name: '第二篇' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '🤍 3' })).toBeInTheDocument()
    expect(screen.getByTestId('comment-post')).toHaveTextContent('comment-post-2')
    expect(screen.queryByRole('heading', { name: '第一篇' })).not.toBeInTheDocument()
  })
})
