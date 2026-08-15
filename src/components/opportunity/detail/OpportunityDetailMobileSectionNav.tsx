import { OpportunitySectionNav } from '@/components/opportunity/detail/OpportunitySectionNav'
import { useOpportunityDetailNavOptional } from '@/contexts/OpportunityDetailNavContext'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { appShellPadClass } from '@/lib/platformLayout'
import { cn } from '@/lib/utils'

/** Sticky section pills — flush under the app header on phone / tablet opportunity detail. */
export function OpportunityDetailMobileSectionNav({ className }: { className?: string }) {
  const ctx = useOpportunityDetailNavOptional()
  const bp = useBreakpoint()
  const isCompact = bp === 'mobile' || bp === 'tablet'
  const sections = ctx?.sections ?? []

  if (!isCompact || sections.length < 2) return null

  return (
    <div
      className={cn(
        'sticky top-0 z-[125] layout-lg:hidden',
        'border-b border-border-subtle/70 bg-surface/95 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80',
        className,
      )}
    >
      <div className={appShellPadClass}>
        <OpportunitySectionNav sections={sections} variant="mobile" />
      </div>
    </div>
  )
}
