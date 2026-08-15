import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

const askAiBodyClass = 'font-sans text-sm leading-relaxed'

/**
 * Compact markdown chrome for Ask AI assistant bubbles.
 * Matches bubble typography (Inter Display + existing color tokens).
 * Only route `reply` / message `content` through this — not chip labels.
 */
export const askAiChatMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className={cn(askAiBodyClass, 'mb-1.5 mt-3 text-[15px] font-semibold text-foreground first:mt-0')}>
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className={cn(askAiBodyClass, 'mb-1.5 mt-3 text-[14px] font-semibold text-foreground first:mt-0')}>
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className={cn(askAiBodyClass, 'mb-1 mt-2.5 text-[13px] font-semibold text-foreground first:mt-0')}>
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h5 className={cn(askAiBodyClass, 'mb-1 mt-2 text-[13px] font-semibold text-foreground/90 first:mt-0')}>
      {children}
    </h5>
  ),
  p: ({ children }) => (
    <p className={cn(askAiBodyClass, 'mb-2 last:mb-0')}>{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-foreground/90">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className={cn(askAiBodyClass, 'mb-2 list-disc space-y-1 pl-4 last:mb-0')}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className={cn(askAiBodyClass, 'mb-2 list-decimal space-y-1 pl-4 last:mb-0')}>{children}</ol>
  ),
  li: ({ children }) => (
    <li className={askAiBodyClass}>{children}</li>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className={cn(askAiBodyClass, 'my-2 border-l-2 border-primary/30 pl-3 italic text-foreground/90')}>
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2.5 border-border-subtle/70" />,
  code: ({ children }) => (
    <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[12px] text-foreground">
      {children}
    </code>
  ),
}

type AskAiChatMarkdownProps = {
  text: string
  className?: string
}

/** Compact markdown for Ask AI assistant bubbles (bold, lists, headers, links). */
export function AskAiChatMarkdown({ text, className }: AskAiChatMarkdownProps) {
  if (!text.trim()) return null

  return (
    <div className={cn('font-sans text-sm text-foreground', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={askAiChatMarkdownComponents}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
