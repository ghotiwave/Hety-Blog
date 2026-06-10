import { useState, createElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { Components } from 'react-markdown'

function slugId(text: string): string {
  return text
    .replace(/[^\w\s一-鿿-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
}

function headingId(children: React.ReactNode): string {
  const text = Array.isArray(children)
    ? children.map((c) => (typeof c === 'string' ? c : '')).join('')
    : String(children ?? '')
  return slugId(text)
}

interface Props {
  children: string
  allowedElements?: string[]
  className?: string
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }).catch(() => {})
    } else {
      const ta = document.createElement('textarea')
      ta.value = code
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  return (
    <button type="button" className="copy-btn" onClick={handleCopy} title={copied ? '已复制' : '复制'}>
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  )
}

const components: Components = {
  h1({ children, ...props }) {
    return createElement('h1', { ...props, id: headingId(children) }, children)
  },
  h2({ children, ...props }) {
    return createElement('h2', { ...props, id: headingId(children) }, children)
  },
  h3({ children, ...props }) {
    return createElement('h3', { ...props, id: headingId(children) }, children)
  },
  h4({ children, ...props }) {
    return createElement('h4', { ...props, id: headingId(children) }, children)
  },
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
