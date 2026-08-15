import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'

function MarkdownLink({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const h = href ?? ''
  if (h.startsWith('/')) {
    return (
      <Link to={h} className="text-primary font-medium underline underline-offset-2 hover:opacity-90" {...rest}>
        {children}
      </Link>
    )
  }
  if (/^https?:\/\//i.test(h)) {
    return (
      <a href={h} target="_blank" rel="noreferrer noopener" className="text-primary font-medium underline underline-offset-2" {...rest}>
        {children}
      </a>
    )
  }
  return (
    <span className="text-muted-foreground" {...rest}>
      {children}
    </span>
  )
}

const markdownComponents = {
  a: MarkdownLink,
  p: ({ children }: { children?: ReactNode }) => <p className="mb-2 last:mb-0 text-[15px] leading-relaxed">{children}</p>,
  strong: ({ children }: { children?: ReactNode }) => <strong className="font-semibold text-foreground">{children}</strong>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }: { children?: ReactNode }) => <li className="text-[15px] leading-relaxed">{children}</li>,
}

export function FaqMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className ?? 'text-muted-foreground'}>
      <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
    </div>
  )
}
