import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PostManage } from './PostManage'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  default: { get: mocks.apiGet, post: mocks.apiPost, delete: vi.fn() },
}))

describe('PostManage Markdown bundles', () => {
  beforeEach(() => {
    mocks.apiGet.mockImplementation((url: string) => {
      if (url.endsWith('/export')) return Promise.resolve({ data: new Blob(['zip']) })
      return Promise.resolve({
        data: { items: [{ id: 1, title: '资源文章', published: true, created_at: '2026-08-03', comment_count: 0 }] },
      })
    })
    mocks.apiPost.mockResolvedValue({ data: { title: '导入文章' } })
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('imports ZIP bundles and exports a downloadable resource bundle', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <PostManage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: '导出资源包' }))
    expect(mocks.apiGet).toHaveBeenCalledWith('/admin/posts/1/export', { responseType: 'blob' })
    expect(await screen.findByText('已导出《资源文章》Markdown 资源包')).toBeInTheDocument()

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['bundle'], 'article.zip', { type: 'application/zip' }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/admin/posts/import', expect.any(FormData))
    expect(await screen.findByText('已导入《导入文章》')).toBeInTheDocument()
  })
})
