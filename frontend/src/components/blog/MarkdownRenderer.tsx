import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import type { Components } from 'react-markdown'

interface Props {
  children: string
  allowedElements?: string[]
  className?: string
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button type="button" className="copy-btn" onClick={handleCopy}>
      {copied ? '已复制' : '复制'}
    </button>
  )
}

const components: Components = {
  pre({ children }) {
    return <pre>{children}</pre>
  },
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const codeStr = String(children).replace(/\n$/, '')

    // Inline code
    if (!match) {
      return <code className={className} {...props}>{children}</code>
    }

    // Block code
    return (
      <div className="code-block-wrapper">
        <div className="absolute top-2 left-3 text-[10px] text-[var(--color-text-muted)]/60 uppercase tracking-wider">
          {match[1]}
        </div>
        <CopyButton code={codeStr} />
        <code className={className} {...props}>{children}</code>
      </div>
    )
  },
}

export function MarkdownRenderer({ children, allowedElements, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
        allowedElements={allowedElements}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
