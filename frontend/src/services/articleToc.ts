import GithubSlugger from 'github-slugger'

export interface TOCItem {
  id: string
  text: string
  level: number
}

function headingText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\\(.)/g, '$1')
    .trim()
}

export function extractTOC(markdown: string): TOCItem[] {
  const items: TOCItem[] = []
  const slugger = new GithubSlugger()
  for (const line of markdown.split('\n')) {
    const match = line.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/)
    if (!match) continue
    const text = headingText(match[2])
    if (text) items.push({ id: slugger.slug(text), text, level: match[1].length })
  }
  return items
}
