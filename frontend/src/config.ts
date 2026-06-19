// Site-wide configuration — edit these to personalize your site
export const siteConfig = {
  name: 'Hety 的个人主页',
  shortName: 'Hety',
  description: '技术、思考与生活。',
  wikiName: 'Hety-Wiki',

  // 笔记站链接（独立子域）
  notesUrl: 'https://notes.gianniiss.top',

  // Feature toggles — set to false to hide from navigation and routes
  features: {
    notes: true,    // 笔记站（Quartz）
    digest: true,   // AI 日报
    game: true,     // 小恐龙快跑
  },
}
