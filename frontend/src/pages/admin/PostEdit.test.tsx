import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PostEdit } from './PostEdit'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  default: { get: mocks.apiGet },
}))

describe('PostEdit loading states', () => {
  beforeEach(() => {
    mocks.apiGet.mockRejectedValue(new Error('not found'))
  })

  it('does not expose a create form when an existing post fails to load', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/posts/999/edit']}>
        <Routes>
          <Route path="/admin/posts/:id/edit" element={<PostEdit />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('文章加载失败或已被删除')
    expect(screen.queryByRole('button', { name: '创建文章' })).not.toBeInTheDocument()
  })
})
