import { TrexRunner } from '@/components/game/TrexRunner'

export function Game2() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">恐龙快跑 v2</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">空格键跳跃/开始，下方向键蹲下。npm 包版本。</p>
      <TrexRunner />
    </div>
  )
}
