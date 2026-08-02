import { Children, isValidElement, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import type { Components } from 'react-markdown'

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children)
  return ''
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

function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src) return null
  if (failed) {
    return (
      <span className="markdown-image-error" role="status">
        图片加载失败
        <a href={src} target="_blank" rel="noreferrer">打开原图</a>
      </span>
    )
  }
  return (
    <span className="markdown-image">
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </span>
  )
}

const components: Components = {
  img({ src, alt }) {
    return <MarkdownImage src={src} alt={alt} />
  },
  pre({ children }) {
    const child = Children.toArray(children)[0]
    const className = isValidElement<{ className?: string }>(child) ? child.props.className : ''
    const language = /language-([\w-]+)/.exec(className || '')?.[1]
    const code = nodeText(child).replace(/\n$/, '')
    return (
      <div className="code-block-wrapper">
        {language && (
          <div className="code-language-label">{language}</div>
        )}
        <CopyButton code={code} />
        <pre>{children}</pre>
      </div>
    )
  },
  code({ className, children, ...props }) {
    return <code className={className} {...props}>{children}</code>
  },
}

export function MarkdownRenderer({ children, allowedElements, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSlug, rehypeKatex]}
        components={components}
        allowedElements={allowedElements}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
