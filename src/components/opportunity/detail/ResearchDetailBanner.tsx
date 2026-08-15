import { format } from 'date-fns'
import { KeyRound, Calendar, Layers, Target } from '@/lib/icons'
import { AiModelDisplay } from '@/components/AI/AiModelDisplay'
import { opportunityDetailEqualBadgeCardClassName } from '@/components/opportunity/detail/detailSectionClasses'
import { ReResearchPanel } from '@/components/research/ReResearchPanel'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/AuthContext'
import { fetchMarketTestIdForOpportunity } from '@/lib/marketTestApi'
import { MARKET_TEST_ROUTES } from '@/lib/marketTestRoutes'
import { landingSignInTo } from '@/lib/authLanding'
import { cn } from '@/lib/utils'
import { iconClassName } from '@/lib/iconClassNames'

import {
  opportunityDetailCardClass,
  opportunityDetailCardPaddingClass,
} from '@/lib/opportunityCardClasses'

export type ResearchDetailBannerProps = {
  opp: Record<string, unknown>
  className?: string
  onResearchRefresh?: () => void
}

function formatResearchDate(value: unknown): string | null {
  if (!value) return null
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return null
  return format(d, 'MMM d, yyyy')
}

export function ResearchDetailBanner({ opp, className, onResearchRefresh }: ResearchDetailBannerProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const researchQuery = opp.research_query ? String(opp.research_query).trim() : ''
  const researchVersion = Number(opp.research_version ?? 1)
  const researchDate = formatResearchDate(opp.created_at)
  const opportunityId = String(opp.id ?? '')
  const reResearchCount = Number(opp.re_research_count ?? 0)
  const modelUsed = typeof opp.model_used === 'string' ? opp.model_used : null
  const byokUsed = opp.byok_used === true

  const handleTestMarket = async () => {
    if (!user?.id || !opportunityId) {
      navigate(landingSignInTo(`/my-research/${String(opp.slug ?? '')}`))
      return
    }
    const query = researchQuery || String(opp.title ?? '').trim()
    const existingId = await fetchMarketTestIdForOpportunity(user.id, opportunityId)
    if (existingId) {
      navigate(MARKET_TEST_ROUTES.detail(existingId))
      return
    }
    navigate(MARKET_TEST_ROUTES.new, {
      state: {
        query,
        user_opportunity_id: opportunityId,
      },
    })
  }

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      >
        <div className={cn(opportunityDetailCardClass, opportunityDetailCardPaddingClass, 'min-w-0 w-full selection:bg-primary/10', className)}>
        {/* Responsive layout wrapper changing from flexible column on mobile into aligned master row on desktop */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Action Blocks Container (Left Side Elements) */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className={cn(opportunityDetailEqualBadgeCardClassName, 'font-bold tabular-nums')}>
              <Layers className={iconClassName({ tone: 'muted', size: 'sm', active: true })} aria-hidden />
              <span>v{researchVersion}</span>
            </span>

            {researchDate && (
              <span className={cn(opportunityDetailEqualBadgeCardClassName, 'font-semibold')}>
                <Calendar className={iconClassName({ tone: 'muted', size: 'sm', active: true })} aria-hidden />
                <span>{researchDate}</span>
              </span>
            )}

            {modelUsed ? (
              <AiModelDisplay modelUsed={modelUsed} />
            ) : null}

            {byokUsed ? (
              <span className={cn(opportunityDetailEqualBadgeCardClassName, 'font-semibold')}>
                <KeyRound className={iconClassName({ tone: 'muted', size: 'sm', active: true })} aria-hidden />
                <span>Generated with your API key</span>
              </span>
            ) : null}
          </div>

          {/* Core Feature Interface (Right Side Panel Trigger) */}
          {opportunityId && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border-subtle/50 pt-3 lg:ml-auto lg:border-t-0 lg:pt-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 rounded-xl text-[12px] font-bold tracking-tight"
                onClick={() => void handleTestMarket()}
              >
                <Target className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Test the Market
              </Button>
              <ReResearchPanel
                opportunityId={opportunityId}
                reResearchCount={reResearchCount}
                onComplete={() => onResearchRefresh?.()}
              />
            </div>
          )}
          
        </div>
        </div>
      </motion.div>
    </TooltipProvider>
  )
}