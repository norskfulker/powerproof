import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Loader2, RefreshCw } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { UseSourcingReturn } from '@/hooks/useSourcing'
import { SOURCE_ORDER, type SourcingCard, type SourcingSourceKey } from '@/lib/sourcingTypes'
import { buildDisplayCards, type SourcingSortKey } from '@/lib/sourcingMerge'
import { sourcingProductPath } from '@/lib/sourcingRoutes'
import { Pill } from '@/components/ui/Pill'
import { SourcingSupplierCardGrid } from '@/components/sourcing/SourcingSupplierCardGrid'
import { SupplierDrawer } from '@/components/sourcing/SupplierDrawer'
import type { SourcingProductLocationState } from '@/pages/sourcing/SourcingProductPage'

const CARDS_PAGE_SIZE = 6

const LOADING_MESSAGES = [
  { icon: '🔍', msg: 'Searching suppliers…' },
  { icon: '⚡', msg: 'Comparing prices…' },
  { icon: '📦', msg: 'Packaging results…' },
] as const

function SourcingLoadingState({ keyword, compact = false }: { keyword: string; compact?: boolean }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const current = LOADING_MESSAGES[msgIndex]

  if (compact) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-lg border border-border-subtle/70 bg-muted/15 px-3 py-2.5"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-foreground">{current.msg}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            Searching for &ldquo;{keyword}&rdquo;
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={msgIndex}
          initial={{ opacity: 0, scale: 0.8, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -4 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl"
        >
          {current.icon}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-col items-center gap-1">
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-sm font-medium text-foreground"
          >
            {current.msg}
          </motion.p>
        </AnimatePresence>
        <p className="text-[11px] text-muted-foreground">
          Searching for{' '}
          <span className="font-medium text-foreground">&ldquo;{keyword}&rdquo;</span>
        </p>
      </div>

      <div className="w-full max-w-xs">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(95, (elapsed / 18) * 100)}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
        <p className="mt-1.5 text-right text-[10px] text-muted-foreground">{elapsed}s</p>
      </div>
    </div>
  )
}

interface SourcingHeroExpansionProps {
  keyword: string
  budgetMax: string
  sourcing: UseSourcingReturn
  onKeywordSelect: (keyword: string) => void
  inputId?: string
  sort: SourcingSortKey
  onSortChange: (next: SourcingSortKey) => void
  drawerCard: SourcingCard | null
  onDrawerCardChange: (card: SourcingCard | null) => void
  compact?: boolean
}

function formatResultsSummary(totalResults: number, stillLoading: boolean): string {
  const base = totalResults === 1 ? '1 result' : `${totalResults} results`
  return stillLoading ? `${base} · more loading…` : base
}

export function SourcingHeroExpansion({
  keyword,
  budgetMax,
  sourcing,
  onKeywordSelect,
  inputId,
  sort,
  onSortChange,
  drawerCard,
  onDrawerCardChange,
  compact = false,
}: SourcingHeroExpansionProps) {
  const navigate = useNavigate()
  const [visibleCount, setVisibleCount] = useState(CARDS_PAGE_SIZE)
  const { step, data, error, sourceResults, totalResults, isBusy } = sourcing

  const openProduct = (card: SourcingCard) => {
    const searchId = data?.search_id
    if (searchId) {
      const state: SourcingProductLocationState = {
        card,
        keyword: data?.keyword ?? keyword,
      }
      navigate(sourcingProductPath(searchId, card), { state })
      return
    }
    onDrawerCardChange(card)
  }

  useEffect(() => {
    if (step === 'loading' || step === 'done') {
      onSortChange('price_desc')
      setVisibleCount(CARDS_PAGE_SIZE)
    }
  }, [step, data?.keyword, onSortChange])

  useEffect(() => {
    setVisibleCount(CARDS_PAGE_SIZE)
  }, [sort, data?.keyword])

  const cardsBySource = useMemo(() => {
    const out = {} as Partial<Record<SourcingSourceKey, SourcingCard[]>>
    for (const key of SOURCE_ORDER) {
      const cards = sourceResults[key].results
      if (cards.length > 0) out[key] = cards
    }
    return out
  }, [sourceResults])

  const displayCards = useMemo(
    () => buildDisplayCards(cardsBySource, sort),
    [cardsBySource, sort],
  )

  const visibleCards = displayCards.slice(0, visibleCount)

  let content: React.ReactNode = null

  const showProgressiveResults = step === 'done' && data
  const showInitLoading = step === 'loading'
  const hasResults = displayCards.length > 0
  const showFullLoading =
    (showInitLoading || (showProgressiveResults && !hasResults && isBusy)) && !hasResults

  if (step === 'idle') {
    content = null
  } else if (step === 'error') {
    content = (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error ?? 'Sourcing failed. Please try again.'}
      </div>
    )
  } else if (showProgressiveResults) {
    const handleRefresh = () => {
      void sourcing.search(keyword.trim(), budgetMax ? Number(budgetMax) : null, true)
    }

    content = (
      <div
        className={cn(
          'flex flex-col gap-4',
          compact ? 'max-h-[min(42vh,22rem)] gap-2' : 'min-h-[520px]',
        )}
      >
        {showFullLoading ? (
          <SourcingLoadingState
            key={keyword.trim() || 'sourcing'}
            keyword={keyword}
            compact={compact}
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[12px] text-muted-foreground">
              <span className="font-medium text-foreground">&ldquo;{data.keyword}&rdquo;</span>
              {totalResults > 0 ? (
                <>
                  {' · '}
                  {formatResultsSummary(totalResults, isBusy)}
                </>
              ) : isBusy ? (
                <>
                  {' · '}
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    Searching…
                  </span>
                </>
              ) : null}
              {data.credits_charged > 0 && ` · ${data.credits_charged} credits used`}
              {data.from_cache && !isBusy && ' · From cache'}
            </p>
            <Link
              to="/room?mode=sourcing"
              className="text-[11px] font-medium text-primary/70 transition-colors hover:text-primary hover:underline underline-offset-2"
            >
              View saved searches →
            </Link>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={sourcing.isBusy}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium',
              'text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              'disabled:cursor-wait disabled:opacity-40',
            )}
            title="Refresh results"
          >
            <RefreshCw className={cn('h-3 w-3', sourcing.isBusy && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {hasResults ? (
          <div className={cn(compact && 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain')}>
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
              <p className="text-[12px] text-muted-foreground">
                Showing {visibleCards.length} of {displayCards.length} suppliers
              </p>
              {sort === 'price_desc' || sort === 'price_asc' ? (
                <Pill
                  as="button"
                  type="button"
                  active
                  icon={
                    sort === 'price_desc' ? (
                      <ArrowDownWideNarrow className="h-3 w-3 shrink-0" aria-hidden />
                    ) : (
                      <ArrowUpWideNarrow className="h-3 w-3 shrink-0" aria-hidden />
                    )
                  }
                  aria-pressed
                  aria-label={sort === 'price_desc' ? 'Sort high to low' : 'Sort low to high'}
                  onClick={() =>
                    onSortChange(sort === 'price_desc' ? 'price_asc' : 'price_desc')
                  }
                  style={{ height: '28px', padding: '4px 10px', fontSize: '10px' }}
                >
                  {sort === 'price_desc' ? 'High to low' : 'Low to high'}
                </Pill>
              ) : null}
            </div>
            <SourcingSupplierCardGrid
              cards={visibleCards}
              onCardClick={openProduct}
              layoutKey={`${data.keyword}-${sort}`}
            />
            {displayCards.length > visibleCount ? (
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + CARDS_PAGE_SIZE)}
                className="inline-flex h-9 w-full items-center justify-center rounded-full border border-dashed border-primary/35 bg-primary/5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                Load more ({displayCards.length - visibleCount} remaining)
              </button>
            ) : null}
          </>
          </div>
        ) : !isBusy ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No suppliers found</p>
            <p className="text-[12px] text-muted-foreground">
              Try a more specific product keyword or remove the budget filter
            </p>
          </div>
        ) : null}
      </div>
    )
  } else if (showInitLoading) {
    content = (
      <div className={cn('flex flex-col', compact ? 'gap-2' : 'min-h-[520px] gap-6')}>
        <SourcingLoadingState
          key={keyword.trim() || 'sourcing'}
          keyword={keyword}
          compact={compact}
        />
      </div>
    )
  }

  return (
    <>
      {content}
      <SupplierDrawer
        card={drawerCard}
        keyword={data?.keyword ?? keyword}
        onClose={() => onDrawerCardChange(null)}
      />
    </>
  )
}
