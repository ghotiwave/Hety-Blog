import { describe, expect, it } from 'vitest'
import { disambiguateArticleTitles } from './articleNavigation'

describe('article navigation titles', () => {
  it('adds stable versions only when titles are duplicated', () => {
    const result = disambiguateArticleTitles([
      { id: 3, title: '技术日报 - 2026-06-09' },
      { id: 2, title: '技术日报 - 2026-06-09' },
      { id: 1, title: '独立标题' },
    ])

    expect(result.map((item) => item.title)).toEqual([
      '技术日报 - 2026-06-09 · v2',
      '技术日报 - 2026-06-09 · v1',
      '独立标题',
    ])
  })
})
