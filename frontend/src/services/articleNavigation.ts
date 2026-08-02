import api from './api'

export interface ArticleNavItem {
  id: number
  title: string
  slug?: string | null
}

export function disambiguateArticleTitles(items: ArticleNavItem[]): ArticleNavItem[] {
  const totals = new Map<string, number>()
  for (const item of items) totals.set(item.title, (totals.get(item.title) ?? 0) + 1)
  const remaining = new Map(totals)

  return items.map((item) => {
    const total = totals.get(item.title) ?? 1
    if (total === 1) return item
    const version = remaining.get(item.title) ?? total
    remaining.set(item.title, version - 1)
    return { ...item, title: `${item.title} · v${version}` }
  })
}

export async function fetchAllArticleNavItems(
  endpoint: '/posts' | '/digests',
  params: Record<string, string> = {},
): Promise<ArticleNavItem[]> {
  const first = await api.get(endpoint, { params: { ...params, page: 1, page_size: 50 } })
  const items: ArticleNavItem[] = [...first.data.items]
  const totalPages = first.data.total_pages ?? 1

  if (totalPages > 1) {
    const pages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        api.get(endpoint, { params: { ...params, page: index + 2, page_size: 50 } }),
      ),
    )
    for (const page of pages) items.push(...page.data.items)
  }

  return disambiguateArticleTitles(items)
}
