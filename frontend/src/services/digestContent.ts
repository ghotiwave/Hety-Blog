export interface DigestNewsItem {
  title: string
  desc: string
  sourceUrl: string
  sourceLabel: string
}

const sourcePattern = /^\s*>\s*(?:原文|来源|查看原文|原文链接)[：:]\s*\[(.+?)\]\((.+?)\)/

/** Parse digest list items while treating the complete `**...**` span as the title. */
export function parseDigestItems(body: string): DigestNewsItem[] {
  const items: DigestNewsItem[] = []
  const lines = body.split('\n')

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const bold = line.match(/^-\s+\*\*(.+?)\*\*\s*[：:]\s*(.+?)\s*$/)
    const plain = bold ? null : line.match(/^-\s+(.+?)\s*[：:]\s*(.+?)\s*$/)
    const match = bold ?? plain
    if (!match) continue

    let sourceUrl = ''
    let sourceLabel = ''
    let sourceIndex = index + 1
    while (sourceIndex < lines.length && !lines[sourceIndex].trim()) sourceIndex++
    const source = sourceIndex < lines.length ? lines[sourceIndex].match(sourcePattern) : null
    if (source) {
      sourceLabel = source[1]
      sourceUrl = source[2]
      index = sourceIndex
    }

    items.push({
      title: match[1].trim(),
      desc: match[2].trim(),
      sourceUrl,
      sourceLabel,
    })
  }

  return items
}
