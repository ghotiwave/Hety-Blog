import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PostCard } from './PostCard'

describe('PostCard metadata', () => {
  it('shows metadata in the requested reading order', () => {
    render(
      <MemoryRouter>
        <PostCard
          id={1}
          title="顺序测试"
          summary={null}
          coverImage={null}
          tags="AI"
          createdAt="2026-08-03T08:00:00"
          commentCount={0}
          wordCount={120}
          readingMinutes={3}
          viewCount={45}
          likeCount={6}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link')).toHaveTextContent(/2026.*AI.*120 字.*3 min read.*45 views.*6 likes/)
  })
})
