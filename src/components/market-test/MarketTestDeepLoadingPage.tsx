import { useEffect, useState } from 'react'
import { Loader2 } from '@/lib/icons'
import { AiModelDisplay } from '@/components/AI/AiModelDisplay'
import { BrandLogoLink } from '@/components/layout/BrandLogoLink'
import { cn } from '@/lib/utils'

export interface MarketTestDeepLoadingPageProps {
  query?: string | null
  modelLabel?: string | null
  modelUsed?: string | null
  statusMessage?: string | null
  startedAt?: string | null
  className?: string
}

export function MarketTestDeepLoadingPage({
  query,
  modelLabel,
  modelUsed,
  statusMessage,
  startedAt,
  className,
}: MarketTestDeepLoadingPageProps) {
  const trimmedQuery = query?.trim()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startMs = startedAt ? Date.parse(startedAt) : Date.now()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [startedAt])

  const progressPct = Math.min(92, 12 + elapsed * 2)

  return (
    <div
      className={cn(
        'flex min-h-[calc(100vh-var(--app-top-offset,0px))] flex-col items-center justify-center px-4 py-12 layout-sm:py-16',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8">
        <BrandLogoLink
          to="/"
          className="animated-logo pointer-events-none h-auto px-0"
          logoClassName="h-8 w-auto layout-sm:h-9"
          aria-label="PowerProof"
        />

        <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden />

        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground layout-sm:text-3xl">
            Running market reality check…
          </h1>
          <p className="text-sm text-muted-foreground">
            {statusMessage?.trim() ||
              'Scanning for real demand signals, past failures, and what actually worked.'}
          </p>
          {trimmedQuery ? (
            <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground/80">
              &ldquo;{trimmedQuery}&rdquo;
            </p>
          ) : null}
          {modelLabel || modelUsed ? (
            <p className="flex justify-center pt-1">
              <AiModelDisplay modelUsed={modelUsed} label={modelLabel} />
            </p>
          ) : null}
        </div>

        <div className="w-full space-y-4 rounded-2xl border border-border-subtle bg-bg-surface/70 p-5 shadow-[var(--shadow-md)] layout-sm:p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
              <span>Grounded search + synthesis in progress</span>
              <span className="tabular-nums">{elapsed > 0 ? `${elapsed}s` : 'Starting…'}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You can safely close this tab — your check will appear in My Market Tests when ready.
        </p>
      </div>
    </div>
  )
}
