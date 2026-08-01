import api from './api'

export interface ArticleNavItem {
  id: number
  title: string
  slug?: string | null
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

  return items
}
