import { describe, expect, it } from 'vitest'
import { extractTOC } from '@/services/articleToc'

describe('article table of contents', () => {
  it('includes level-one headings and matches GitHub-style duplicate slugs', () => {
    expect(extractTOC('# 一级标题\n## **格式标题**\n# 一级标题')).toEqual([
      { id: '一级标题', text: '一级标题', level: 1 },
      { id: '格式标题', text: '格式标题', level: 2 },
      { id: '一级标题-1', text: '一级标题', level: 1 },
    ])
  })
})
