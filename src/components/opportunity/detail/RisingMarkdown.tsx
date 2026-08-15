import type { ReactNode } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useCurrency } from '@/hooks/useCurrency'

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h2 className="mb-3 mt-6 text-[20px] font-black tracking-title text-foreground first:mt-0">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="mb-3 mt-5 text-[18px] font-black tracking-title text-foreground first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-2.5 mt-4 text-[16px] font-bold tracking-title text-foreground first:mt-0">{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className="mb-2 mt-3 text-[14px] font-bold text-foreground/90 first:mt-0">{children}</h5>
  ),
  p: ({ children }) => (
    <p className="mb-3.5 font-medium leading-relaxed text-muted-foreground/90 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-2.5 pl-5 font-medium text-muted-foreground/90">{children}</ol>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-2.5 pl-5 font-medium text-muted-foreground/90">{children}</ul>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
}

function mobileMarkdownComponents(): Components {
  return {
    ...MARKDOWN_COMPONENTS,
    h1: ({ children }) => (
      <h2 className="mb-3 mt-6 text-[19px] font-black tracking-title text-foreground first:mt-0">
        {children as ReactNode}
      </h2>
    ),
    h2: ({ children }) => (
      <h3 className="mb-3 mt-5 text-[17px] font-black tracking-title text-foreground first:mt-0">
        {children as ReactNode}
      </h3>
    ),
    h3: ({ children }) => (
      <h4 className="mb-2.5 mt-4 text-[15px] font-bold tracking-title text-foreground first:mt-0">
        {children as ReactNode}
      </h4>
    ),
  }
}

export function RisingMarkdown({
  text,
  isMobile = false,
  className,
  resetKey,
  localizeCurrency = true,
}: {
  text: string
  isMobile?: boolean
  className?: string
  resetKey?: string | number
  /** When true (default), embedded `$` amounts are converted to the viewer's display currency. */
  localizeCurrency?: boolean
}) {
  const { localizeText } = useCurrency()
  const displayText = localizeCurrency ? localizeText(text) : text

  if (!displayText.trim()) return null

  return (
    <div key={resetKey} className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={isMobile ? mobileMarkdownComponents() : MARKDOWN_COMPONENTS}
      >
        {displayText}
      </ReactMarkdown>
    </div>
  )
}
