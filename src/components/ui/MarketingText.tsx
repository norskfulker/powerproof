import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export type MarketingTextSpeed = 'default' | 'fast'

export type MarketingTextTag = 'h1' | 'h2' | 'h3' | 'p' | 'span'

export type MarketingTextProps = {
  text: string
  className?: string
  id?: string
  style?: CSSProperties
  as?: MarketingTextTag
  /** Kept for API compatibility — no animation delay. */
  startDelay?: number
  speed?: MarketingTextSpeed
  wordWrap?: boolean
  centered?: boolean
  onComplete?: () => void
}

const MARKETING_TEXT_FONT: Record<MarketingTextTag, string> = {
  h1: 'font-sans font-normal text-foreground',
  h2: 'font-sans font-normal text-foreground',
  h3: 'font-sans font-normal text-foreground',
  p: 'text-foreground',
  span: 'text-foreground',
}

/** Static typography for marketing and detail surfaces. */
export function MarketingText({
  text,
  className,
  id,
  style,
  as: Tag = 'h1',
  wordWrap = true,
  centered = false,
  onComplete,
}: MarketingTextProps) {
  const fontClass = MARKETING_TEXT_FONT[Tag]
  useEffect(() => {
    onComplete?.()
  }, [onComplete])

  return (
    <Tag
      id={id}
      style={style}
      className={cn(
        fontClass,
        wordWrap && 'max-w-full [overflow-wrap:anywhere]',
        centered && 'text-center',
        className,
      )}
    >
      {text}
    </Tag>
  )
}
