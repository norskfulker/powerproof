import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Sparkles } from '@/lib/icons'

import { BrandLogoLink } from '@/components/layout/BrandLogoLink'
import { OnboardingSteps } from '@/components/onboarding/OnboardingSteps'
import { cn } from '@/lib/utils'

export type OnboardingGenerateChunk = {
  id: string
  label: string
}

const DEFAULT_CHUNKS: OnboardingGenerateChunk[] = [
  { id: 'cook', label: 'Cooking market signals…' },
  { id: 'finance', label: 'Building financials…' },
  { id: 'demand', label: 'Sizing demand & TAM…' },
  { id: 'compete', label: 'Mapping the competitive set…' },
  { id: 'ops', label: 'Drafting ops & headcount…' },
  { id: 'license', label: 'Checking licences & schemes…' },
  { id: 'polish', label: 'Polishing your opportunity brief…' },
]

/** Full-screen “generating with AI” progress + cheap live status stream. */
export function OnboardingOpportunityGeneratingScreen({
  title,
  progressPct,
  activeChunkLabel,
  recentChunks,
  className,
}: {
  title?: string | null
  progressPct: number
  activeChunkLabel: string | null
  recentChunks: string[]
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round(progressPct)))

  return (
    <div
      className={cn(
        'flex min-h-[calc(100vh-var(--app-top-offset,0px))] flex-col items-center justify-center px-4 py-12',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-7">
        <BrandLogoLink
          to="/"
          className="pointer-events-none h-auto px-0"
          logoClassName="h-8 w-auto layout-sm:h-9"
        />

        <OnboardingSteps current={2} className="w-full" />

        <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
          Preview
        </span>

        <div className="relative">
          <Loader2 className="h-11 w-11 animate-spin text-primary" aria-hidden />
          <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-primary" aria-hidden />
        </div>

        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-medium tracking-normal text-foreground layout-sm:text-3xl">
            Generating with AI
          </h1>
          <p className="text-[14px] text-muted-foreground">
            Building your idea completely with AI…
          </p>
          {title ? (
            <p className="mx-auto max-w-sm text-[12px] leading-relaxed text-muted-foreground/80">
              &ldquo;{title}&rdquo;
            </p>
          ) : null}
        </div>

        <div className="w-full space-y-3 rounded-2xl border border-border-subtle bg-card/80 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span className="font-medium text-foreground">Progress</span>
            <span className="tabular-nums text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <div className="min-h-[7.5rem] space-y-1.5 pt-1">
            <AnimatePresence initial={false}>
              {recentChunks.map((chunk, i) => {
                const isLive = i === recentChunks.length - 1
                return (
                  <motion.p
                    key={`${chunk}-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: isLive ? 1 : 0.55, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className={cn(
                      'font-mono text-[12px] leading-snug',
                      isLive ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <span className="text-primary" aria-hidden>
                      ›{' '}
                    </span>
                    {chunk}
                  </motion.p>
                )
              })}
            </AnimatePresence>
            {activeChunkLabel && recentChunks[recentChunks.length - 1] !== activeChunkLabel ? (
              <p className="font-mono text-[12px] text-foreground">
                <span className="text-primary" aria-hidden>
                  ›{' '}
                </span>
                {activeChunkLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export { DEFAULT_CHUNKS as ONBOARDING_GENERATE_CHUNKS }
