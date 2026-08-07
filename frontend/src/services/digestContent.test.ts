import { describe, expect, it } from 'vitest'
import { parseDigestItems } from './digestContent'

describe('parseDigestItems', () => {
  it('keeps punctuation inside a bold title instead of stopping at its first colon', () => {
    const [item] = parseDigestItems(
      '- **Rust 1.90：异步生态的新变化**：本次更新改善了异步开发体验。\n> 原文：[Rust Blog](https://example.com/rust)',
    )

    expect(item.title).toBe('Rust 1.90：异步生态的新变化')
    expect(item.desc).toBe('本次更新改善了异步开发体验。')
    expect(item.sourceUrl).toBe('https://example.com/rust')
  })

  it('continues to support plain-text digest items', () => {
    expect(parseDigestItems('- 普通标题：普通摘要')[0]).toMatchObject({
      title: '普通标题',
      desc: '普通摘要',
    })
  })
})
