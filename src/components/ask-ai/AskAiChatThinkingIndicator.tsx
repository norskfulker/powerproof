import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BrandLogoImg } from '@/components/composer/BrandLogoImg'
import { POWERPROOF_SHORT_LOGO_URL } from '@/lib/brandLogos'
import { cn } from '@/lib/utils'

const ASK_AI_THINKING_PHRASES = [
  'Reading your question…',
  'Scanning context…',
  'Connecting the dots…',
  'Pulling insights…',
  'Crafting a reply…',
  'Almost there…',
] as const

const PHRASE_INTERVAL_MS = 2200

type Props = {
  className?: string
}

export function AskAiChatThinkingIndicator({ className }: Props) {
  const prefersReducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const phrase = ASK_AI_THINKING_PHRASES[index]

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % ASK_AI_THINKING_PHRASES.length)
    }, PHRASE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [prefersReducedMotion])

  return (
    <div
      className={cn(
        'inline-flex max-w-[92%] items-center gap-2.5 rounded-2xl rounded-bl-md border border-border-subtle bg-card px-3 py-2.5 text-left font-sans text-sm text-muted-foreground',
        className,
      )}
      aria-live="polite"
      aria-busy="true"
      aria-label={phrase}
    >
      <span
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/40 ring-1 ring-border-subtle/70',
          !prefersReducedMotion && 'animate-pulse',
        )}
        aria-hidden
      >
        <BrandLogoImg
          src={POWERPROOF_SHORT_LOGO_URL}
          alt=""
          height={16}
          className="h-4 w-4 max-w-[1rem] object-contain object-center"
        />
      </span>
      <div className="min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={phrase}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: 'easeOut' }}
            className="font-medium leading-snug text-foreground/85"
          >
            {phrase}
          </motion.p>
        </AnimatePresence>
        <span className="mt-1.5 inline-flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-1.5 w-1.5 rounded-full bg-primary/55 animate-bounce"
              style={{ animationDelay: `${dot * 0.14}s` }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}
