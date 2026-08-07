interface SectionHeadingProps {
  eyebrow: string
  title: string
  description: string
}

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <header className="mb-7 border-b border-[var(--color-border)] pb-8 pt-5">
      <p className="mb-3 font-mono text-[11px] tracking-[0.18em] text-[var(--color-primary)]">{eyebrow}</p>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text)] md:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-[var(--color-text-muted)]">{description}</p>
    </header>
  )
}
