import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function SearchResultSection({
  title,
  show,
  children,
}: {
  title: string
  show: boolean
  children: ReactNode
}) {
  if (!show) return null
  return (
    <div className="mb-2 last:mb-0">
      <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-foreground">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

export function MatchHighlight({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <span className="text-foreground">{text}</span>
  const lower = text.toLowerCase()
  const qi = lower.indexOf(q.toLowerCase())
  if (qi < 0) return <span className="text-foreground">{text}</span>
  const a = text.slice(0, qi)
  const m = text.slice(qi, qi + q.length)
  const b = text.slice(qi + q.length)
  return (
    <span className="text-foreground">
      {a}
      <mark className="rounded-sm bg-primary/18 px-0.5 font-semibold text-foreground">{m}</mark>
      {b}
    </span>
  )
}

const OPTION_MOTION = {
  initial: false as const,
  whileHover: { x: 3 },
  whileTap: { scale: 0.99 },
  transition: { type: 'spring' as const, stiffness: 480, damping: 32 },
}

export function SearchResultButton({
  selected,
  onClick,
  onMouseEnter,
  children,
  id,
}: {
  selected: boolean
  onClick: () => void
  onMouseEnter: () => void
  children: ReactNode
  id?: string
}) {
  const resultRowClass = cn(
    'w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors',
    selected ? 'bg-canvas ring-1 ring-primary/25' : 'hover:bg-canvas',
  )

  return (
    <motion.button
      {...OPTION_MOTION}
      id={id}
      type="button"
      role="option"
      aria-selected={selected}
      className={resultRowClass}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}

export function NoResultsPanel({ term }: { term: string }) {
  return (
    <p className="px-3 py-3 text-sm text-muted-foreground">
      No matches for &quot;{term}&quot;.
    </p>
  )
}
