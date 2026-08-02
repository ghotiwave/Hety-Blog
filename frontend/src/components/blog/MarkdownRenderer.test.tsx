import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownRenderer } from './MarkdownRenderer'

describe('MarkdownRenderer', () => {
  it('offers the original URL when an image cannot be loaded', () => {
    render(<MarkdownRenderer>{'![示例图](https://images.example.com/broken.png)'}</MarkdownRenderer>)

    fireEvent.error(screen.getByRole('img', { name: '示例图' }))

    expect(screen.getByRole('status')).toHaveTextContent('图片加载失败')
    expect(screen.getByRole('link', { name: '打开原图' })).toHaveAttribute(
      'href',
      'https://images.example.com/broken.png',
    )
  })

  it('renders GFM content and stable slugs for formatted duplicate headings', () => {
    const { container } = render(
      <MarkdownRenderer>{'# **一级标题**\n\n~~删除~~\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n# 一级标题'}</MarkdownRenderer>,
    )

    const headings = screen.getAllByRole('heading', { name: '一级标题' })
    expect(headings[0]).toHaveAttribute('id', '一级标题')
    expect(headings[1]).toHaveAttribute('id', '一级标题-1')
    expect(container.querySelector('del')).toHaveTextContent('删除')
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('uses valid markup for fenced code blocks', () => {
    const { container } = render(<MarkdownRenderer>{'```ts\nconst answer = 42\n```'}</MarkdownRenderer>)

    expect(container.querySelector('.code-block-wrapper > pre > code.language-ts')).toHaveTextContent('const answer = 42')
    expect(container.querySelector('pre > div')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制' })).toBeInTheDocument()
  })
})
