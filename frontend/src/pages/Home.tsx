import { Link } from 'react-router-dom'

const sections = [
  {
    href: '/blog',
    label: '博客',
    en: 'Blog',
    desc: '技术文章、项目复盘与个人思考。',
    accent: 'border-l-amber-500',
  },
  {
    href: '/notes',
    label: '笔记',
    en: 'Notes',
    desc: '零散的想法、灵感碎片与学习记录。',
    accent: 'border-l-emerald-500',
  },
  {
    href: '/digest',
    label: 'AI 日报',
    en: 'AI News',
    desc: '每日自动整理 AI 行业动态与论文。',
    accent: 'border-l-violet-500',
  },
]

export function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center">
      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="max-w-2xl">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl text-stone-800 leading-tight mb-6 tracking-tight"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            欢迎来到
            <br />
            Hety 的个人主页
          </h1>
          <p className="text-lg md:text-xl text-stone-400 italic leading-relaxed max-w-xl">
            技术、思考与生活。
            <span className="block mt-2 text-base not-italic text-stone-300">
              这里记录着我的学习历程、项目心得，以及对技术世界的观察。
            </span>
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-12">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
        <span className="text-xs text-stone-300 tracking-widest uppercase">Explore</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
      </div>

      {/* Section cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        {sections.map((s) => (
          <Link
            key={s.href}
            to={s.href}
            className={`group block border-l-4 ${s.accent} bg-white/60 hover:bg-white rounded-r-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
          >
            <span className="text-xs text-stone-300 tracking-wide uppercase">{s.en}</span>
            <h3 className="text-xl text-stone-800 mt-1 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              {s.label}
            </h3>
            <p className="text-sm text-stone-400 leading-relaxed">{s.desc}</p>
            <span className="inline-block mt-4 text-xs text-stone-300 group-hover:text-amber-600 transition-colors">
              浏览 &rarr;
            </span>
          </Link>
        ))}
      </section>

      {/* Footer quote */}
      <div className="text-center py-8 border-t border-amber-200/40">
        <p className="text-sm text-stone-300 italic">
          "Stay hungry, stay foolish." — Steve Jobs
        </p>
        <p className="text-xs text-stone-300/50 mt-2">
          感谢你的来访。
        </p>
      </div>
    </div>
  )
}
